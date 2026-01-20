import type { Color, Palette, OrderedOptions, ColorMatchMethod } from '../types/index.ts';
import { rgbToLuminance, findNearestColor, getColorDistanceFunction } from '../engine/color.ts';

/**
 * Dither matrix definition
 */
export interface DitherMatrix {
    name: string;
    size: number;
    data: number[]; // Normalized values 0-1
}

/**
 * Generate Bayer matrix recursively
 */
function generateBayerMatrix(size: number): number[] {
    if (size === 2) {
        // Base 2x2 Bayer matrix
        return [0, 2, 3, 1].map(v => v / 4);
    }

    const halfSize = size / 2;
    const smaller = generateBayerMatrix(halfSize);
    const result: number[] = new Array(size * size);
    const scale = size * size;

    // Construct larger matrix from 4 copies of smaller
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const sx = x % halfSize;
            const sy = y % halfSize;
            const smallVal = smaller[sy * halfSize + sx] * (halfSize * halfSize);

            let quadrant: number;
            if (x < halfSize && y < halfSize) quadrant = 0;
            else if (x >= halfSize && y < halfSize) quadrant = 2;
            else if (x < halfSize && y >= halfSize) quadrant = 3;
            else quadrant = 1;

            result[y * size + x] = (smallVal * 4 + quadrant) / scale;
        }
    }

    return result;
}

/**
 * Pre-computed Bayer matrices
 */
export const BAYER_MATRICES: Record<number, DitherMatrix> = {
    2: { name: 'Bayer 2×2', size: 2, data: generateBayerMatrix(2) },
    3: {
        name: 'Bayer 3×3',
        size: 3,
        data: [
            0, 7, 3,
            6, 5, 2,
            4, 1, 8
        ].map(v => v / 9)
    },
    4: { name: 'Bayer 4×4', size: 4, data: generateBayerMatrix(4) },
    8: { name: 'Bayer 8×8', size: 8, data: generateBayerMatrix(8) },
    16: { name: 'Bayer 16×16', size: 16, data: generateBayerMatrix(16) },
    32: { name: 'Bayer 32×32', size: 32, data: generateBayerMatrix(32) }
};

/**
 * Clustered dot matrices for different screen patterns
 */
export const CLUSTERED_MATRICES: Record<string, DitherMatrix> = {
    'clustered-4x4': {
        name: 'Clustered Dot 4×4',
        size: 4,
        data: [
            12, 5, 6, 13,
            4, 0, 1, 7,
            11, 3, 2, 8,
            15, 10, 9, 14
        ].map(v => v / 16)
    },
    'clustered-8x8': {
        name: 'Clustered Dot 8×8',
        size: 8,
        data: [
            24, 10, 12, 26, 35, 47, 49, 37,
            8, 0, 2, 14, 45, 59, 61, 51,
            22, 6, 4, 16, 43, 57, 63, 53,
            30, 20, 18, 28, 33, 41, 55, 39,
            34, 46, 48, 36, 25, 11, 13, 27,
            44, 58, 60, 50, 9, 1, 3, 15,
            42, 56, 62, 52, 23, 7, 5, 17,
            32, 40, 54, 38, 31, 21, 19, 29
        ].map(v => v / 64)
    }
};

/**
 * Monochrome ordered dithering
 */
export function orderedDitherMono(
    input: ImageData,
    palette: Palette,
    matrixSize: number = 8,
    options: OrderedOptions = {}
): ImageData {
    const matrix = BAYER_MATRICES[matrixSize];
    if (!matrix) {
        throw new Error(`Unsupported matrix size: ${matrixSize}. Use 2, 3, 4, 8, 16, or 32`);
    }

    return orderedDitherWithMatrix(input, palette, matrix, options);
}

/**
 * Ordered dithering with a specific matrix
 */
export function orderedDitherWithMatrix(
    input: ImageData,
    palette: Palette,
    matrix: DitherMatrix,
    options: OrderedOptions = {}
): ImageData {
    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const jitter = options.jitter ?? 0;
    const matrixSize = matrix.size;

    // Get palette colors
    const darkColor = palette.colors[0];
    const lightColor = palette.colors[palette.colors.length > 1 ? 1 : 0];
    const darkLum = rgbToLuminance(darkColor.r, darkColor.g, darkColor.b);
    const lightLum = rgbToLuminance(lightColor.r, lightColor.g, lightColor.b);

    // Process each pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Get luminance
            const luminance = rgbToLuminance(data[idx], data[idx + 1], data[idx + 2]) / 255;

            // Get matrix threshold
            const mx = x % matrixSize;
            const my = y % matrixSize;
            let threshold = matrix.data[my * matrixSize + mx];

            // Add jitter if specified
            if (jitter > 0) {
                threshold += (Math.random() - 0.5) * jitter;
            }

            // Compare and output
            const color = luminance > threshold ? lightColor : darkColor;

            outData[idx] = color.r;
            outData[idx + 1] = color.g;
            outData[idx + 2] = color.b;
            outData[idx + 3] = data[idx + 3]; // Preserve alpha
        }
    }

    return output;
}

/**
 * Color ordered dithering
 */
export function orderedDitherColor(
    input: ImageData,
    palette: Palette,
    matrixSize: number = 8,
    options: OrderedOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean'
): ImageData {
    const matrix = BAYER_MATRICES[matrixSize];
    if (!matrix) {
        throw new Error(`Unsupported matrix size: ${matrixSize}`);
    }

    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const jitter = options.jitter ?? 0;
    const distanceFunc = getColorDistanceFunction(colorMatchMethod);

    // Process each pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Get matrix threshold
            const mx = x % matrixSize;
            const my = y % matrixSize;
            let threshold = matrix.data[my * matrixSize + mx];

            if (jitter > 0) {
                threshold += (Math.random() - 0.5) * jitter;
            }

            // Offset the color based on threshold
            const offset = (threshold - 0.5) * 128; // Adjust intensity range

            const adjustedColor: Color = {
                r: Math.max(0, Math.min(255, data[idx] + offset)),
                g: Math.max(0, Math.min(255, data[idx + 1] + offset)),
                b: Math.max(0, Math.min(255, data[idx + 2] + offset))
            };

            // Find nearest palette color
            const nearest = findNearestColor(adjustedColor, palette.colors, distanceFunc);

            outData[idx] = nearest.r;
            outData[idx + 1] = nearest.g;
            outData[idx + 2] = nearest.b;
            outData[idx + 3] = data[idx + 3];
        }
    }

    return output;
}

/**
 * Clustered dot dithering (halftone-like)
 */
export function clusteredDitherMono(
    input: ImageData,
    palette: Palette,
    variant: string = 'clustered-8x8',
    options: OrderedOptions = {}
): ImageData {
    const matrix = CLUSTERED_MATRICES[variant];
    if (!matrix) {
        throw new Error(`Unknown clustered matrix: ${variant}`);
    }

    return orderedDitherWithMatrix(input, palette, matrix, options);
}

/**
 * Get available matrix sizes
 */
export function getAvailableMatrixSizes(): number[] {
    return Object.keys(BAYER_MATRICES).map(Number).sort((a, b) => a - b);
}

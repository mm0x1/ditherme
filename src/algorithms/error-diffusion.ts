import type { Color, Palette, BaseOptions, ColorMatchMethod } from '../types/index.ts';
import { clamp, rgbToLuminance, findNearestColor, getColorDistanceFunction } from '../engine/color.ts';

/**
 * Error diffusion kernel definition
 * Each entry is [dx, dy, weight] where dx/dy are offsets from current pixel
 */
export interface ErrorKernel {
    name: string;
    divisor: number;
    offsets: Array<[number, number, number]>; // [dx, dy, weight]
}

/**
 * Error diffusion kernels
 */
export const ERROR_KERNELS: Record<string, ErrorKernel> = {
    'floyd-steinberg': {
        name: 'Floyd-Steinberg',
        divisor: 16,
        offsets: [
            [1, 0, 7],
            [-1, 1, 3],
            [0, 1, 5],
            [1, 1, 1]
        ]
    },
    'jarvis-judice-ninke': {
        name: 'Jarvis-Judice-Ninke',
        divisor: 48,
        offsets: [
            [1, 0, 7], [2, 0, 5],
            [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
            [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]
        ]
    },
    'stucki': {
        name: 'Stucki',
        divisor: 42,
        offsets: [
            [1, 0, 8], [2, 0, 4],
            [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
            [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]
        ]
    },
    'burkes': {
        name: 'Burkes',
        divisor: 32,
        offsets: [
            [1, 0, 8], [2, 0, 4],
            [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]
        ]
    },
    'sierra3': {
        name: 'Sierra (3-row)',
        divisor: 32,
        offsets: [
            [1, 0, 5], [2, 0, 3],
            [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
            [-1, 2, 2], [0, 2, 3], [1, 2, 2]
        ]
    },
    'sierra2': {
        name: 'Sierra (2-row)',
        divisor: 16,
        offsets: [
            [1, 0, 4], [2, 0, 3],
            [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]
        ]
    },
    'sierra-lite': {
        name: 'Sierra Lite',
        divisor: 4,
        offsets: [
            [1, 0, 2],
            [-1, 1, 1], [0, 1, 1]
        ]
    },
    'atkinson': {
        name: 'Atkinson',
        divisor: 8,
        offsets: [
            [1, 0, 1], [2, 0, 1],
            [-1, 1, 1], [0, 1, 1], [1, 1, 1],
            [0, 2, 1]
        ]
    },
    'stevenson-arce': {
        name: 'Stevenson-Arce',
        divisor: 200,
        offsets: [
            [2, 0, 32],
            [-3, 1, 12], [-1, 1, 26], [1, 1, 30], [3, 1, 16],
            [-2, 2, 12], [0, 2, 26], [2, 2, 12],
            [-3, 3, 5], [-1, 3, 12], [1, 3, 12], [3, 3, 5]
        ]
    },
    'fake-floyd-steinberg': {
        name: 'Fake Floyd-Steinberg',
        divisor: 8,
        offsets: [
            [1, 0, 3],
            [0, 1, 3],
            [1, 1, 2]
        ]
    },
    'shiau-fan1': {
        name: 'Shiau-Fan 1',
        divisor: 8,
        offsets: [
            [1, 0, 4],
            [-2, 1, 1], [-1, 1, 1], [0, 1, 2]
        ]
    },
    'shiau-fan2': {
        name: 'Shiau-Fan 2',
        divisor: 16,
        offsets: [
            [1, 0, 8],
            [-3, 1, 1], [-2, 1, 1], [-1, 1, 2], [0, 1, 4]
        ]
    }
};

/**
 * Monochrome error diffusion dithering
 */
export function errorDiffusionMono(
    input: ImageData,
    palette: Palette,
    kernelName: string,
    options: BaseOptions = {}
): ImageData {
    const kernel = ERROR_KERNELS[kernelName];
    if (!kernel) {
        throw new Error(`Unknown kernel: ${kernelName}`);
    }

    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const serpentine = options.serpentine ?? false;

    // Get palette colors (first two for mono)
    const darkColor = palette.colors[0];
    const lightColor = palette.colors[palette.colors.length > 1 ? 1 : 0];
    const darkLum = rgbToLuminance(darkColor.r, darkColor.g, darkColor.b);
    const lightLum = rgbToLuminance(lightColor.r, lightColor.g, lightColor.b);

    // Error buffer - stores error for each pixel (luminance only for mono)
    const errorBuffer = new Float32Array(width * height);

    // Initialize error buffer with input luminance
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        errorBuffer[i] = rgbToLuminance(data[idx], data[idx + 1], data[idx + 2]);
    }

    // Process row by row
    for (let y = 0; y < height; y++) {
        const leftToRight = !serpentine || (y % 2 === 0);

        const startX = leftToRight ? 0 : width - 1;
        const endX = leftToRight ? width : -1;
        const stepX = leftToRight ? 1 : -1;

        for (let x = startX; x !== endX; x += stepX) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;

            // Get current value with accumulated error
            const oldVal = errorBuffer[idx];

            // Quantize to nearest palette color
            const midPoint = (darkLum + lightLum) / 2;
            const newVal = oldVal > midPoint ? lightLum : darkLum;
            const color = oldVal > midPoint ? lightColor : darkColor;

            // Store result
            outData[pixelIdx] = color.r;
            outData[pixelIdx + 1] = color.g;
            outData[pixelIdx + 2] = color.b;
            outData[pixelIdx + 3] = data[pixelIdx + 3]; // Preserve alpha

            // Calculate error
            const error = oldVal - newVal;

            // Diffuse error to neighbors
            for (const [dx, dy, weight] of kernel.offsets) {
                const nx = leftToRight ? x + dx : x - dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    errorBuffer[nidx] += error * weight / kernel.divisor;
                }
            }
        }
    }

    return output;
}

/**
 * Color error diffusion dithering
 */
export function errorDiffusionColor(
    input: ImageData,
    palette: Palette,
    kernelName: string,
    options: BaseOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean'
): ImageData {
    const kernel = ERROR_KERNELS[kernelName];
    if (!kernel) {
        throw new Error(`Unknown kernel: ${kernelName}`);
    }

    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const serpentine = options.serpentine ?? false;
    const distanceFunc = getColorDistanceFunction(colorMatchMethod);

    // Error buffers for R, G, B channels
    const errorR = new Float32Array(width * height);
    const errorG = new Float32Array(width * height);
    const errorB = new Float32Array(width * height);

    // Initialize error buffers with input values
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        errorR[i] = data[idx];
        errorG[i] = data[idx + 1];
        errorB[i] = data[idx + 2];
    }

    // Process row by row
    for (let y = 0; y < height; y++) {
        const leftToRight = !serpentine || (y % 2 === 0);

        const startX = leftToRight ? 0 : width - 1;
        const endX = leftToRight ? width : -1;
        const stepX = leftToRight ? 1 : -1;

        for (let x = startX; x !== endX; x += stepX) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;

            // Get current value with accumulated error
            const oldColor: Color = {
                r: clamp(Math.round(errorR[idx])),
                g: clamp(Math.round(errorG[idx])),
                b: clamp(Math.round(errorB[idx]))
            };

            // Find nearest palette color
            const newColor = findNearestColor(oldColor, palette.colors, distanceFunc);

            // Store result
            outData[pixelIdx] = newColor.r;
            outData[pixelIdx + 1] = newColor.g;
            outData[pixelIdx + 2] = newColor.b;
            outData[pixelIdx + 3] = data[pixelIdx + 3]; // Preserve alpha

            // Calculate error for each channel
            const errR = errorR[idx] - newColor.r;
            const errG = errorG[idx] - newColor.g;
            const errB = errorB[idx] - newColor.b;

            // Diffuse error to neighbors
            for (const [dx, dy, weight] of kernel.offsets) {
                const nx = leftToRight ? x + dx : x - dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    const factor = weight / kernel.divisor;
                    errorR[nidx] += errR * factor;
                    errorG[nidx] += errG * factor;
                    errorB[nidx] += errB * factor;
                }
            }
        }
    }

    return output;
}

/**
 * Get all available error diffusion kernel names
 */
export function getErrorKernelNames(): string[] {
    return Object.keys(ERROR_KERNELS);
}

/**
 * Get kernel info by name
 */
export function getErrorKernel(name: string): ErrorKernel | undefined {
    return ERROR_KERNELS[name];
}

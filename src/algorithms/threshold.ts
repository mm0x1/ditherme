import type { Color, Palette, ThresholdOptions, ColorMatchMethod } from '../types/index.ts';
import { rgbToLuminance, findNearestColor, getColorDistanceFunction } from '../engine/color.ts';

/**
 * Simple threshold dithering
 * Supports multi-level palettes (posterization)
 *
 * Each pixel is mapped to the nearest palette color based on luminance.
 */
export function threshold(
    input: ImageData,
    palette: Palette,
    options: ThresholdOptions = {}
): ImageData {
    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const noiseAmount = (options.noise ?? 0) * 255;

    // Sort palette by luminance for proper level distribution
    const sortedPalette = palette.colors
        .map(color => ({
            color,
            luminance: rgbToLuminance(color.r, color.g, color.b)
        }))
        .sort((a, b) => a.luminance - b.luminance);

    // Function to find nearest palette color by luminance
    function findNearestByLuminance(lum: number): Color {
        let nearest = sortedPalette[0];
        let minDist = Math.abs(lum - nearest.luminance);

        for (let i = 1; i < sortedPalette.length; i++) {
            const dist = Math.abs(lum - sortedPalette[i].luminance);
            if (dist < minDist) {
                minDist = dist;
                nearest = sortedPalette[i];
            }
        }

        return nearest.color;
    }

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Calculate luminance
        let luminance = rgbToLuminance(r, g, b);

        // Add noise if specified
        if (noiseAmount > 0) {
            luminance += (Math.random() - 0.5) * noiseAmount;
        }

        // Find nearest palette color by luminance
        const color = findNearestByLuminance(luminance);

        outData[i] = color.r;
        outData[i + 1] = color.g;
        outData[i + 2] = color.b;
        outData[i + 3] = a;
    }

    return output;
}

/**
 * Threshold dithering for color palettes
 */
export function thresholdColor(
    input: ImageData,
    palette: Palette,
    options: ThresholdOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean'
): ImageData {
    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    const distanceFunc = getColorDistanceFunction(colorMatchMethod);

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        const color: Color = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        };

        // Find nearest palette color
        const nearest = findNearestColor(color, palette.colors, distanceFunc);

        outData[i] = nearest.r;
        outData[i + 1] = nearest.g;
        outData[i + 2] = nearest.b;
        outData[i + 3] = data[i + 3];
    }

    return output;
}

/**
 * Calculate optimal threshold using Otsu's method
 */
function calculateOtsuThreshold(data: Uint8ClampedArray, width: number, height: number): number {
    const histogram = new Array(256).fill(0);
    const totalPixels = width * height;

    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
        const luminance = Math.round(rgbToLuminance(data[i], data[i + 1], data[i + 2]));
        histogram[luminance]++;
    }

    // Calculate total mean
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 0;

    // Find threshold that maximizes between-class variance
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;

        const wF = totalPixels - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];

        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }

    return threshold;
}

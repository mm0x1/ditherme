import type { ImageAdjustments } from '../types/index.ts';
import { clamp } from './color.ts';

/**
 * Apply all image adjustments to an ImageData
 * Returns a new ImageData (does not mutate input)
 */
export function applyAdjustments(
    input: ImageData,
    adjustments: ImageAdjustments
): ImageData {
    const { brightness, contrast, gamma, saturation, blackPoint, whitePoint } = adjustments;

    // If no adjustments needed, return copy
    const hasBlackWhitePoint = (blackPoint !== undefined && blackPoint > 0) ||
                               (whitePoint !== undefined && whitePoint < 255);
    if (brightness === 0 && contrast === 0 && gamma === 1.0 &&
        (saturation === 0 || saturation === undefined) && !hasBlackWhitePoint) {
        return new ImageData(
            new Uint8ClampedArray(input.data),
            input.width,
            input.height
        );
    }

    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Pre-calculate values
    const brightnessOffset = brightness * 2.55; // -255 to 255
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const gammaValue = gamma;
    const saturationFactor = 1 + (saturation ?? 0) / 100;
    const blackPointValue = blackPoint ?? 0;
    const whitePointValue = whitePoint ?? 255;

    // Build gamma lookup table for performance
    const gammaLUT = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
        gammaLUT[i] = Math.round(255 * Math.pow(i / 255, 1 / gammaValue));
    }

    // Build levels lookup table for black/white point adjustment
    // Maps input range [blackPoint, whitePoint] to output range [0, 255]
    const levelsLUT = new Uint8ClampedArray(256);
    const range = whitePointValue - blackPointValue;
    if (hasBlackWhitePoint && range > 0) {
        for (let i = 0; i < 256; i++) {
            if (i <= blackPointValue) {
                levelsLUT[i] = 0;
            } else if (i >= whitePointValue) {
                levelsLUT[i] = 255;
            } else {
                levelsLUT[i] = Math.round(((i - blackPointValue) / range) * 255);
            }
        }
    } else {
        // No adjustment needed, identity mapping
        for (let i = 0; i < 256; i++) {
            levelsLUT[i] = i;
        }
    }

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const a = data[i + 3];

        // Apply gamma correction
        if (gammaValue !== 1.0) {
            r = gammaLUT[r];
            g = gammaLUT[g];
            b = gammaLUT[b];
        }

        // Apply brightness
        if (brightnessOffset !== 0) {
            r += brightnessOffset;
            g += brightnessOffset;
            b += brightnessOffset;
        }

        // Apply contrast
        if (contrast !== 0) {
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;
        }

        // Apply saturation (only in color mode)
        if (saturationFactor !== 1 && saturation !== undefined) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + saturationFactor * (r - gray);
            g = gray + saturationFactor * (g - gray);
            b = gray + saturationFactor * (b - gray);
        }

        // Apply black/white point levels adjustment
        // This remaps the tonal range: [blackPoint, whitePoint] -> [0, 255]
        if (hasBlackWhitePoint) {
            // Clamp to 0-255 range before LUT lookup
            r = levelsLUT[clamp(Math.round(r))];
            g = levelsLUT[clamp(Math.round(g))];
            b = levelsLUT[clamp(Math.round(b))];
        }

        // Clamp and store
        outData[i] = clamp(Math.round(r));
        outData[i + 1] = clamp(Math.round(g));
        outData[i + 2] = clamp(Math.round(b));
        outData[i + 3] = a;
    }

    return output;
}

/**
 * Apply only brightness adjustment
 */
export function applyBrightness(input: ImageData, brightness: number): ImageData {
    return applyAdjustments(input, { brightness, contrast: 0, gamma: 1.0, blackPoint: 0, whitePoint: 255 });
}

/**
 * Apply only contrast adjustment
 */
export function applyContrast(input: ImageData, contrast: number): ImageData {
    return applyAdjustments(input, { brightness: 0, contrast, gamma: 1.0, blackPoint: 0, whitePoint: 255 });
}

/**
 * Apply only gamma correction
 */
export function applyGamma(input: ImageData, gamma: number): ImageData {
    return applyAdjustments(input, { brightness: 0, contrast: 0, gamma, blackPoint: 0, whitePoint: 255 });
}

/**
 * Check if any adjustments are applied
 */
export function hasAdjustments(adjustments: ImageAdjustments): boolean {
    return (
        adjustments.brightness !== 0 ||
        adjustments.contrast !== 0 ||
        adjustments.gamma !== 1.0 ||
        (adjustments.saturation !== undefined && adjustments.saturation !== 0) ||
        (adjustments.blackPoint !== undefined && adjustments.blackPoint > 0) ||
        (adjustments.whitePoint !== undefined && adjustments.whitePoint < 255)
    );
}

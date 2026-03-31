/**
 * Video frame processor worker
 * Processes individual frames through the dithering pipeline
 */

import * as Comlink from 'comlink';
import type { Algorithm, Palette, AlgorithmOptions, ImageAdjustments, ColorMatchMethod } from '../types/index.ts';
import type { PostEffect } from '../types/post-effect.ts';
import { applyAdjustments, hasAdjustments } from '../engine/adjustments.ts';
import { ditherAsync, initDitherWasm } from '../algorithms/index.ts';
import { getColorDistanceFunction } from '../engine/color.ts';
import { composite, buildEffectLayers } from '../engine/compositor.ts';
import type { Color } from '../types/palette.ts';

/**
 * Settings for processing a frame
 */
export interface FrameDitherSettings {
    algorithm: Algorithm;
    palette: Palette;
    adjustments: ImageAdjustments;
    options: AlgorithmOptions;
    colorMatchMethod: ColorMatchMethod;
    pixelScale: number;
    levels: number;
    postEffect: PostEffect;
    effectColor: string;
    layer2Adjustments: ImageAdjustments;
}

/**
 * API exposed by the video processor worker
 */
export interface VideoProcessorAPI {
    initialize(): Promise<void>;
    processFrame(imageData: ImageData, settings: FrameDitherSettings): Promise<ImageData>;
    terminate(): void;
}

/**
 * Downscale image by a factor (for pixel scale effect)
 */
function downscaleImage(input: ImageData, scale: number): ImageData {
    if (scale <= 1) return input;

    const newWidth = Math.max(1, Math.floor(input.width / scale));
    const newHeight = Math.max(1, Math.floor(input.height / scale));

    const output = new ImageData(newWidth, newHeight);
    const outData = output.data;
    const inData = input.data;

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const sx = x * scale + dx;
                    const sy = y * scale + dy;
                    if (sx < input.width && sy < input.height) {
                        const idx = (sy * input.width + sx) * 4;
                        r += inData[idx];
                        g += inData[idx + 1];
                        b += inData[idx + 2];
                        a += inData[idx + 3];
                        count++;
                    }
                }
            }

            const outIdx = (y * newWidth + x) * 4;
            outData[outIdx] = Math.round(r / count);
            outData[outIdx + 1] = Math.round(g / count);
            outData[outIdx + 2] = Math.round(b / count);
            outData[outIdx + 3] = Math.round(a / count);
        }
    }

    return output;
}

/**
 * Upscale image by a factor using nearest-neighbor
 */
function upscaleImage(input: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const output = new ImageData(targetWidth, targetHeight);
    const outData = output.data;
    const inData = input.data;

    const scaleX = input.width / targetWidth;
    const scaleY = input.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const sx = Math.floor(x * scaleX);
            const sy = Math.floor(y * scaleY);
            const srcIdx = (sy * input.width + sx) * 4;
            const dstIdx = (y * targetWidth + x) * 4;

            outData[dstIdx] = inData[srcIdx];
            outData[dstIdx + 1] = inData[srcIdx + 1];
            outData[dstIdx + 2] = inData[srcIdx + 2];
            outData[dstIdx + 3] = inData[srcIdx + 3];
        }
    }

    return output;
}

/**
 * Reduce palette to N most representative colors based on image content
 */
function reducePalette(
    imageData: ImageData,
    palette: Palette,
    levels: number,
    colorMatchMethod: ColorMatchMethod
): Palette {
    if (levels <= 0 || levels >= palette.colors.length) {
        return palette;
    }

    const distanceFunc = getColorDistanceFunction(colorMatchMethod);
    const colorUsage = new Map<number, number>();
    palette.colors.forEach((_, i) => colorUsage.set(i, 0));

    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const sampleRate = totalPixels > 100000 ? Math.ceil(totalPixels / 50000) : 1;

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const pixelColor: Color = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        };

        let minDist = Infinity;
        let nearestIdx = 0;
        for (let j = 0; j < palette.colors.length; j++) {
            const dist = distanceFunc(pixelColor, palette.colors[j]);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = j;
            }
        }

        colorUsage.set(nearestIdx, (colorUsage.get(nearestIdx) || 0) + 1);
    }

    const sortedIndices = Array.from(colorUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    const reducedColors = sortedIndices
        .slice(0, levels)
        .map(idx => palette.colors[idx]);

    if (reducedColors.length < 2) {
        reducedColors.push({ r: 0, g: 0, b: 0 });
        reducedColors.push({ r: 255, g: 255, b: 255 });
    }

    return {
        name: `${palette.name} (${levels} levels)`,
        colors: reducedColors
    };
}

/**
 * Video processor implementation
 */
class VideoProcessor implements VideoProcessorAPI {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Initialize WASM in the worker
        const success = await initDitherWasm();
        if (success) {
            console.log('[VideoProcessor Worker] WASM initialized');
        } else {
            console.log('[VideoProcessor Worker] WASM not available, using JS fallback');
        }

        this.initialized = true;
    }

    async processFrame(sourceImage: ImageData, settings: FrameDitherSettings): Promise<ImageData> {
        const {
            algorithm,
            palette,
            adjustments,
            options,
            colorMatchMethod,
            pixelScale,
            levels,
            postEffect,
            effectColor,
            layer2Adjustments
        } = settings;

        const originalWidth = sourceImage.width;
        const originalHeight = sourceImage.height;

        // Step 1: Apply adjustments
        let processed = sourceImage;
        if (hasAdjustments(adjustments)) {
            processed = applyAdjustments(sourceImage, adjustments);
        }

        // Step 2: Downscale if pixel scale > 1
        if (pixelScale > 1) {
            processed = downscaleImage(processed, pixelScale);
        }

        // Step 3: Reduce palette if levels specified
        let workingPalette = palette;
        if (levels > 0 && levels < palette.colors.length) {
            workingPalette = reducePalette(processed, palette, levels, colorMatchMethod);
        }

        // Step 4: Apply dithering
        let result = await ditherAsync(processed, algorithm, workingPalette, options, colorMatchMethod);

        // Step 5: Upscale back to original size if we downscaled
        if (pixelScale > 1) {
            result = upscaleImage(result, originalWidth, originalHeight);
        }

        // Step 6: Apply post-processing effect
        if (postEffect !== 'none') {
            let brightDither: ImageData | null = null;
            if (postEffect === 'luminous-pin-light') {
                let brightProcessed = sourceImage;
                if (hasAdjustments(layer2Adjustments)) {
                    brightProcessed = applyAdjustments(sourceImage, layer2Adjustments);
                }
                if (pixelScale > 1) {
                    brightProcessed = downscaleImage(brightProcessed, pixelScale);
                }
                let brightResult = await ditherAsync(brightProcessed, algorithm, workingPalette, options, colorMatchMethod);
                if (pixelScale > 1) {
                    brightResult = upscaleImage(brightResult, originalWidth, originalHeight);
                }
                brightDither = brightResult;
            }

            const layers = buildEffectLayers(postEffect, sourceImage, result, effectColor, brightDither);
            if (layers) {
                result = await composite(layers);
            }
        }

        return result;
    }

    terminate(): void {
        // Cleanup if needed
        this.initialized = false;
    }
}

// Expose the worker API via Comlink
Comlink.expose(new VideoProcessor());

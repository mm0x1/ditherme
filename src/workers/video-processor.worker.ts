/**
 * Video frame processor worker
 * Processes individual frames through the dithering pipeline
 */

import * as Comlink from 'comlink';
import type { Algorithm, Palette, AlgorithmOptions, ImageAdjustments, ColorMatchMethod } from '../types/index.ts';
import type { PostEffect } from '../types/post-effect.ts';
import type { ImageEffect, ImageEffectParams } from '../types/image-effect.ts';
import { applyImageEffect } from '../engine/image-effects/index.ts';
import { applyAdjustments, hasAdjustments } from '../engine/adjustments.ts';
import { ditherAsync, initDitherWasm } from '../algorithms/index.ts';
import { composite, buildEffectLayers, applyAlphaMask } from '../engine/compositor.ts';
import { downscaleImage, upscaleImage } from '../engine/scaling.ts';
import { reducePalette } from '../engine/palette-utils.ts';

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
    imageEffect: ImageEffect;
    imageEffectParams: ImageEffectParams;
}

/**
 * API exposed by the video processor worker
 */
export interface VideoProcessorAPI {
    initialize(wasmBaseURL?: string): Promise<void>;
    processFrame(imageData: ImageData, settings: FrameDitherSettings): Promise<ImageData>;
    terminate(): void;
}

/**
 * Video processor implementation
 */
class VideoProcessor implements VideoProcessorAPI {
    private initialized = false;

    async initialize(wasmBaseURL?: string): Promise<void> {
        if (this.initialized) return;

        // Initialize WASM in the worker
        const success = await initDitherWasm(wasmBaseURL);
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
            layer2Adjustments,
            imageEffect,
            imageEffectParams
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

        // Capture the dither's source alpha before effects rebuild pixels opaquely.
        const ditheredAlpha = result;

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

        // Step 7: Apply image effect
        result = await applyImageEffect(result, imageEffect, imageEffectParams);

        // Re-stamp the dither's source alpha so transparency survives the effects
        // (no-op when no effect ran, since `result` still references the dither).
        if (postEffect !== 'none' || imageEffect !== 'none') {
            applyAlphaMask(result, ditheredAlpha);
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

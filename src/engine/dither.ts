import { app, shouldRedither } from '../app.ts';
import type { Algorithm, Palette, AlgorithmOptions, ImageAdjustments, ColorMatchMethod } from '../types/index.ts';
import type { AppState } from '../types/state.ts';
import { applyAdjustments, hasAdjustments } from './adjustments.ts';
import { ditherAsync, initDitherWasm } from '../algorithms/index.ts';
import { imageCache } from './image-cache.ts';
import { composite, buildEffectLayers } from './compositor.ts';
import { applyImageEffect } from './image-effects/index.ts';
import { downscaleImage, upscaleImage } from './scaling.ts';
import { reducePalette } from './palette-utils.ts';

/**
 * Debounce timer for dithering
 */
let ditherTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 50;

/**
 * Process image with adjustments, scaling, and dithering
 */
export async function processImage(
    sourceImage: ImageData,
    algorithm: Algorithm,
    palette: Palette,
    adjustments: ImageAdjustments,
    options: AlgorithmOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean',
    pixelScale: number = 1,
    levels: number = 0
): Promise<ImageData> {
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

    // Step 4: Apply dithering (use async WASM when available)
    const startTime = performance.now();
    let result = await ditherAsync(processed, algorithm, workingPalette, options, colorMatchMethod);
    const duration = performance.now() - startTime;

    // Step 5: Upscale back to original size if we downscaled
    if (pixelScale > 1) {
        result = upscaleImage(result, originalWidth, originalHeight);
    }

    // Emit completion event
    app.emit('dithercomplete', { result, duration });

    return result;
}

/**
 * Apply post-processing effect to a dithered result.
 * Returns result unchanged when postEffect is 'none'.
 */
async function applyPostEffect(result: ImageData, state: AppState): Promise<ImageData> {
    const { postEffect, effectColor, sourceImage } = state;
    if (postEffect === 'none' || !sourceImage) return result;

    let brightDither: ImageData | null = null;
    if (postEffect === 'luminous-pin-light') {
        brightDither = await processImage(
            sourceImage, state.algorithm, state.palette, state.layer2Adjustments,
            state.options, state.colorMatch, state.pixelScale, state.levels
        );
    }

    const layers = buildEffectLayers(postEffect, sourceImage, result, effectColor, brightDither);
    return layers ? composite(layers) : result;
}

/**
 * Trigger dithering based on current state (debounced)
 */
export function triggerDither(): void {
    // Clear existing timeout
    if (ditherTimeout) {
        clearTimeout(ditherTimeout);
    }

    // Debounce to avoid too many re-renders
    ditherTimeout = setTimeout(async () => {
        const state = app.getState();

        if (!state.sourceImage) return;

        // Check cache first
        const cachedResult = imageCache.get(state);
        if (cachedResult) {
            app.setState({
                ditheredImage: cachedResult,
                isProcessing: false
            });
            // Emit completion with 0ms duration to indicate cache hit
            app.emit('dithercomplete', { result: cachedResult, duration: 0 });
            return;
        }

        // Mark as processing
        app.setState({ isProcessing: true });
        app.emit('ditherstart', { algorithm: state.algorithm });

        try {
            const result = await processImage(
                state.sourceImage,
                state.algorithm,
                state.palette,
                state.adjustments,
                state.options,
                state.colorMatch,
                state.pixelScale,
                state.levels
            );

            const postProcessed = await applyPostEffect(result, state);
            const finalImage = await applyImageEffect(postProcessed, state.imageEffect, state.imageEffectParams);

            // Cache the result
            imageCache.set(state, finalImage);

            app.setState({
                ditheredImage: finalImage,
                isProcessing: false
            });
        } catch (error) {
            console.error('Dithering failed:', error);
            app.emit('dithererror', { error: error instanceof Error ? error : new Error(String(error)) });
            app.setState({ isProcessing: false });
        }
    }, DEBOUNCE_MS);
}

/**
 * Initialize dithering engine - subscribe to state changes
 */
export async function initDitherEngine(): Promise<void> {
    // Initialize WASM module in background (don't block startup)
    initDitherWasm().then(success => {
        if (success) {
            console.info('[Dither] WASM dithering enabled - all algorithms now available');
            // Notify UI that WASM is ready (for WASM badges)
            app.emit('wasmloaded', undefined as unknown as void);
        }
    });

    // Listen for state changes that should trigger re-dithering
    app.on('statechange', (e) => {
        if (shouldRedither(e.detail.changes)) {
            triggerDither();
        }
    });

    // Also trigger on image load and clear cache for new source
    app.on('imageloaded', () => {
        imageCache.invalidateForNewSource();
        triggerDither();
    });
}

/**
 * Force immediate dither (no debounce)
 */
export async function forceDither(): Promise<void> {
    if (ditherTimeout) {
        clearTimeout(ditherTimeout);
        ditherTimeout = null;
    }

    const state = app.getState();
    if (!state.sourceImage) return;

    app.setState({ isProcessing: true });

    try {
        const result = await processImage(
            state.sourceImage,
            state.algorithm,
            state.palette,
            state.adjustments,
            state.options,
            state.colorMatch,
            state.pixelScale,
            state.levels
        );

        const postProcessed = await applyPostEffect(result, state);
        const finalImage = await applyImageEffect(postProcessed, state.imageEffect, state.imageEffectParams);

        app.setState({
            ditheredImage: finalImage,
            isProcessing: false
        });
    } catch (error) {
        app.setState({ isProcessing: false });
        throw error;
    }
}

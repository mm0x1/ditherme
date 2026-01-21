import { app, shouldRedither } from '../app.ts';
import type { Algorithm, Palette, AlgorithmOptions, ImageAdjustments, ColorMatchMethod, Color } from '../types/index.ts';
import { applyAdjustments, hasAdjustments } from './adjustments.ts';
import { dither as ditherAlgorithm, ditherAsync, initDitherWasm } from '../algorithms/index.ts';
import { getColorDistanceFunction } from './color.ts';
import { imageCache } from './image-cache.ts';

/**
 * Debounce timer for dithering
 */
let ditherTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 50;

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

    // Simple box averaging for downscale
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            // Average all pixels in the block
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
 * Upscale image by a factor using nearest-neighbor (for blocky pixel effect)
 */
function upscaleImage(input: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const output = new ImageData(targetWidth, targetHeight);
    const outData = output.data;
    const inData = input.data;

    const scaleX = input.width / targetWidth;
    const scaleY = input.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            // Nearest neighbor sampling
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

    // Count color usage in image (how often each palette color would be chosen)
    const colorUsage = new Map<number, number>();
    palette.colors.forEach((_, i) => colorUsage.set(i, 0));

    const { data, width, height } = imageData;

    // Sample the image (for performance, sample every Nth pixel for large images)
    const totalPixels = width * height;
    const sampleRate = totalPixels > 100000 ? Math.ceil(totalPixels / 50000) : 1;

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const pixelColor: Color = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        };

        // Find nearest palette color
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

    // Sort colors by usage (most used first)
    const sortedIndices = Array.from(colorUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    // Take top N colors
    const reducedColors = sortedIndices
        .slice(0, levels)
        .map(idx => palette.colors[idx]);

    // Ensure we have at least 2 colors
    if (reducedColors.length < 2) {
        // Add black and white as fallback
        reducedColors.push({ r: 0, g: 0, b: 0 });
        reducedColors.push({ r: 255, g: 255, b: 255 });
    }

    return {
        name: `${palette.name} (${levels} levels)`,
        colors: reducedColors
    };
}

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

            // Cache the result
            imageCache.set(state, result);

            app.setState({
                ditheredImage: result,
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
            console.log('WASM dithering enabled - all algorithms now available');
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

        app.setState({
            ditheredImage: result,
            isProcessing: false
        });
    } catch (error) {
        app.setState({ isProcessing: false });
        throw error;
    }
}

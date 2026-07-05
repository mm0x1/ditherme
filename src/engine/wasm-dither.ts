/**
 * WASM Dithering Engine
 * Provides high-performance dithering using libdither compiled to WebAssembly
 */

import type { Algorithm, Palette, AlgorithmOptions } from '../types/index.ts';

// WASM module interface
interface LibDitherModule {
    _malloc(size: number): number;
    _free(ptr: number): void;

    // DitherImage (mono)
    _DitherImage_new(width: number, height: number): number;
    _DitherImage_free(ptr: number): void;
    _DitherImage_set_pixel(ptr: number, x: number, y: number, r: number, g: number, b: number, correctGamma: number): void;

    // Threshold
    _auto_threshold(imgPtr: number): number;
    _threshold_dither(imgPtr: number, threshold: number, noise: number, outPtr: number): void;

    // Error Diffusion
    _error_diffusion_dither(imgPtr: number, matrixPtr: number, serpentine: number, sigma: number, outPtr: number): void;
    _ErrorDiffusionMatrix_free(ptr: number): void;
    _get_floyd_steinberg_matrix(): number;
    _get_jarvis_judice_ninke_matrix(): number;
    _get_stucki_matrix(): number;
    _get_burkes_matrix(): number;
    _get_sierra_3_matrix(): number;
    _get_sierra_2row_matrix(): number;
    _get_sierra_lite_matrix(): number;
    _get_atkinson_matrix(): number;
    _get_stevenson_arce_matrix(): number;
    _get_fake_floyd_steinberg_matrix(): number;
    _get_shiaufan1_matrix(): number;
    _get_shiaufan2_matrix(): number;
    _get_shiaufan3_matrix(): number;
    _get_xot_matrix(): number;
    _get_diagonal_matrix(): number;
    _get_diffusion_1d_matrix(): number;
    _get_diffusion_2d_matrix(): number;
    _get_steve_pigeon_matrix(): number;
    _get_robert_kist_matrix(): number;

    // Ordered Dithering
    _ordered_dither(imgPtr: number, matrixPtr: number, sigma: number, outPtr: number): void;
    _OrderedDitherMatrix_free(ptr: number): void;
    _get_bayer2x2_matrix(): number;
    _get_bayer3x3_matrix(): number;
    _get_bayer4x4_matrix(): number;
    _get_bayer8x8_matrix(): number;
    _get_bayer16x16_matrix(): number;
    _get_bayer32x32_matrix(): number;
    _get_blue_noise_128x128(): number;
    _get_dispersed_dots_1_matrix(): number;
    _get_dispersed_dots_2_matrix(): number;
    _get_ulichney_void_dispersed_dots_matrix(): number;
    _get_non_rectangular_1_matrix(): number;
    _get_non_rectangular_2_matrix(): number;
    _get_non_rectangular_3_matrix(): number;
    _get_non_rectangular_4_matrix(): number;
    _get_ulichney_bayer_5_matrix(): number;
    _get_ulichney_matrix(): number;
    _get_ulichney_clustered_dot_matrix(): number;
    _get_bayer_clustered_dot_1_matrix(): number;
    _get_bayer_clustered_dot_2_matrix(): number;
    _get_bayer_clustered_dot_3_matrix(): number;
    _get_bayer_clustered_dot_4_matrix(): number;
    _get_bayer_clustered_dot_5_matrix(): number;
    _get_bayer_clustered_dot_6_matrix(): number;
    _get_bayer_clustered_dot_7_matrix(): number;
    _get_bayer_clustered_dot_8_matrix(): number;
    _get_bayer_clustered_dot_9_matrix(): number;
    _get_bayer_clustered_dot_10_matrix(): number;
    _get_bayer_clustered_dot_11_matrix(): number;
    _get_diagonal_ordered_matrix_matrix(): number;
    _get_magic5x5_circle_matrix(): number;
    _get_magic6x6_circle_matrix(): number;
    _get_magic7x7_circle_matrix(): number;
    _get_magic4x4_45_matrix(): number;
    _get_magic6x6_45_matrix(): number;
    _get_magic8x8_45_matrix(): number;
    _get_variable_2x2_matrix(step: number): number;
    _get_variable_4x4_matrix(step: number): number;
    _get_interleaved_gradient_noise(size: number, a: number, b: number, c: number): number;

    // Riemersma
    _riemersma_dither(imgPtr: number, curvePtr: number, useRiemersma: number, outPtr: number): void;
    _RiemersmaCurve_free(ptr: number): void;
    _create_curve(curvePtr: number, width: number, height: number, dimPtr: number): number;
    _get_hilbert_curve(): number;
    _get_hilbert_mod_curve(): number;
    _get_peano_curve(): number;
    _get_fass0_curve(): number;
    _get_fass1_curve(): number;
    _get_fass2_curve(): number;
    _get_gosper_curve(): number;
    _get_fass_spiral_curve(): number;

    // Pattern
    _pattern_dither(imgPtr: number, patternPtr: number, outPtr: number): void;
    _TilePattern_free(ptr: number): void;
    _get_2x2_pattern(): number;
    _get_3x3_v1_pattern(): number;
    _get_3x3_v2_pattern(): number;
    _get_3x3_v3_pattern(): number;
    _get_4x4_pattern(): number;
    _get_5x2_pattern(): number;

    // Dot Diffusion
    _dot_diffusion_dither(imgPtr: number, dmatrixPtr: number, cmatrixPtr: number, outPtr: number): void;
    _DotClassMatrix_free(ptr: number): void;
    _DotDiffusionMatrix_free(ptr: number): void;
    _get_default_diffusion_matrix(): number;
    _get_guoliu8_diffusion_matrix(): number;
    _get_guoliu16_diffusion_matrix(): number;
    _get_mini_knuth_class_matrix(): number;
    _get_knuth_class_matrix(): number;
    _get_optimized_knuth_class_matrix(): number;
    _get_mese_8x8_class_matrix(): number;
    _get_mese_16x16_class_matrix(): number;
    _get_guoliu_8x8_class_matrix(): number;
    _get_guoliu_16x16_class_matrix(): number;
    _get_spiral_class_matrix(): number;
    _get_spiral_inverted_class_matrix(): number;

    // Dot Lippens
    _dotlippens_dither(imgPtr: number, classMatrixPtr: number, coefficientsPtr: number, outPtr: number): void;
    _DotLippensCoefficients_free(ptr: number): void;
    _get_dotlippens_class_matrix(): number;
    _get_dotlippens_coefficients1(): number;
    _get_dotlippens_coefficients2(): number;
    _get_dotlippens_coefficients3(): number;

    // Variable Error Diffusion (0 = Ostromoukhov, 1 = Zhoufang)
    _variable_error_diffusion_dither(imgPtr: number, type: number, serpentine: number, outPtr: number): void;

    // Grid
    _grid_dither(imgPtr: number, w: number, h: number, minPixels: number, altAlgorithm: number, outPtr: number): void;

    // DBS
    _dbs_dither(imgPtr: number, v: number, outPtr: number): void;

    // Kacker-Allebach
    _kallebach_dither(imgPtr: number, random: number, outPtr: number): void;

    // Color dithering
    _ColorImage_new(width: number, height: number): number;
    _ColorImage_free(ptr: number): void;
    _ColorImage_set_rgb(ptr: number, addr: number, r: number, g: number, b: number, a: number): void;
    _CachedPalette_new(): number;
    _CachedPalette_free(ptr: number): void;
    _CachedPalette_from_BytePalette(ptr: number, palPtr: number): void;
    _CachedPalette_update_cache(ptr: number, mode: number, illuminantPtr: number): void;
    _BytePalette_new(size: number): number;
    _BytePalette_free(ptr: number): void;
    _BytePalette_set(ptr: number, index: number, colorPtr: number): void;
    _error_diffusion_dither_color(imgPtr: number, matrixPtr: number, palettePtr: number, serpentine: number, outPtr: number): void;
    _ordered_dither_color(imgPtr: number, palettePtr: number, matrixPtr: number, outPtr: number): void;

    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    HEAPF64: Float64Array;
}

// Module singleton
let wasmModule: LibDitherModule | null = null;
let wasmLoadPromise: Promise<LibDitherModule> | null = null;

/**
 * Load the Emscripten factory function, working in both main thread and workers.
 */
async function loadCreateLibDither(): Promise<(opts: Record<string, unknown>) => Promise<LibDitherModule>> {
    const globalScope = globalThis as Record<string, unknown>;

    // Already available (main thread, previously loaded)
    if (typeof globalScope.createLibDither === 'function') {
        return globalScope.createLibDither as (opts: Record<string, unknown>) => Promise<LibDitherModule>;
    }

    const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

    if (isWorker) {
        // In a worker: fetch the JS and evaluate it. The Emscripten output assigns
        // createLibDither to module.exports or defines it via define(), but in a
        // bare worker neither exists. We provide stubs so the assignment succeeds.
        const response = await fetch('/wasm/libdither.js');
        const source = await response.text();
        // Emscripten's UMD footer checks for module.exports first
        const exports: Record<string, unknown> = {};
        const module = { exports };
        const fn = new Function('module', 'exports', source);
        fn(module, exports);
        const factory = (module.exports as Record<string, unknown>).default ?? module.exports;
        if (typeof factory === 'function') {
            return factory as (opts: Record<string, unknown>) => Promise<LibDitherModule>;
        }
        throw new Error('createLibDither factory not found after eval in worker');
    } else {
        // Main thread: use script injection
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/wasm/libdither.js';
            script.onload = () => {
                const factory = globalScope.createLibDither;
                if (typeof factory === 'function') {
                    resolve(factory as (opts: Record<string, unknown>) => Promise<LibDitherModule>);
                } else {
                    reject(new Error('createLibDither not found after script load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load libdither.js'));
            document.head.appendChild(script);
        });
    }
}

/**
 * Initialize the WASM module
 */
export async function initWasm(): Promise<LibDitherModule> {
    if (wasmModule) return wasmModule;
    if (wasmLoadPromise) return wasmLoadPromise;

    wasmLoadPromise = (async () => {
        const createModule = await loadCreateLibDither();
        const module = await createModule({
            locateFile: (path: string) => `/wasm/${path}`
        });
        wasmModule = module;
        return module;
    })();

    return wasmLoadPromise;
}

/**
 * Check if WASM is loaded
 */
export function isWasmLoaded(): boolean {
    return wasmModule !== null;
}

/**
 * Convert ImageData to DitherImage pointer
 */
function imageDataToDitherImage(wasm: LibDitherModule, imageData: ImageData): number {
    const { width, height, data } = imageData;
    const imgPtr = wasm._DitherImage_new(width, height);

    if (imgPtr === 0) {
        console.error('[WASM] Failed to create DitherImage');
        return 0;
    }

    // Don't apply gamma correction - input is already in sRGB
    const correctGamma = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            wasm._DitherImage_set_pixel(imgPtr, x, y, data[i], data[i + 1], data[i + 2], correctGamma);
        }
    }

    return imgPtr;
}

/**
 * Convert mono output buffer to ImageData with palette colors
 * Maps grayscale output values to the nearest palette color by luminance
 */
function monoOutputToImageData(
    wasm: LibDitherModule,
    outPtr: number,
    width: number,
    height: number,
    palette: Palette,
    imageData: ImageData
): ImageData {
    const output = new ImageData(width, height);
    const pixelCount = width * height;

    // Pre-compute luminance for all palette colors and sort by luminance
    const paletteWithLum = palette.colors.map(color => ({
        color,
        luminance: 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
    })).sort((a, b) => a.luminance - b.luminance);

    // Build a lookup table (256 entries) mapping grayscale value to palette color
    // This is much faster than computing nearest color per pixel
    const lut = new Array<{ r: number; g: number; b: number }>(256);

    for (let i = 0; i < 256; i++) {
        // Find nearest palette color by luminance
        let nearestIdx = 0;
        let minDist = Math.abs(i - paletteWithLum[0].luminance);

        for (let j = 1; j < paletteWithLum.length; j++) {
            const dist = Math.abs(i - paletteWithLum[j].luminance);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = j;
            }
        }

        lut[i] = paletteWithLum[nearestIdx].color;
    }

    // Map output values to palette colors using LUT
    for (let i = 0; i < pixelCount; i++) {
        const value = wasm.HEAPU8[outPtr + i];
        const outIdx = i * 4;
        const color = lut[value];

        output.data[outIdx] = color.r;
        output.data[outIdx + 1] = color.g;
        output.data[outIdx + 2] = color.b;
        output.data[outIdx + 3] = imageData.data[outIdx + 3]; // Preserve source alpha
    }

    return output;
}

/**
 * Convert ImageData to ColorImage pointer (for color dithering)
 */
function imageDataToColorImage(wasm: LibDitherModule, imageData: ImageData): number {
    const { width, height, data } = imageData;
    const imgPtr = wasm._ColorImage_new(width, height);

    if (imgPtr === 0) {
        console.error('[WASM] Failed to create ColorImage');
        return 0;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const addr = y * width + x;
            wasm._ColorImage_set_rgb(imgPtr, addr, data[i], data[i + 1], data[i + 2], data[i + 3]);
        }
    }

    return imgPtr;
}

/**
 * Create a CachedPalette from a Palette (for color dithering)
 * Returns { cachedPalette, bytePalette } pointers that need to be freed
 */
function createCachedPalette(wasm: LibDitherModule, palette: Palette): { cachedPalette: number; bytePalette: number } {
    const bytePalette = wasm._BytePalette_new(palette.colors.length);

    // Create a temporary buffer for ByteColor struct (4 bytes: r, g, b, a)
    const colorPtr = wasm._malloc(4);
    if (colorPtr === 0) throw new Error('[WASM] Failed to allocate color buffer');

    for (let i = 0; i < palette.colors.length; i++) {
        const color = palette.colors[i];
        wasm.HEAPU8[colorPtr] = color.r;
        wasm.HEAPU8[colorPtr + 1] = color.g;
        wasm.HEAPU8[colorPtr + 2] = color.b;
        wasm.HEAPU8[colorPtr + 3] = 255; // Alpha
        wasm._BytePalette_set(bytePalette, i, colorPtr);
    }

    wasm._free(colorPtr);

    const cachedPalette = wasm._CachedPalette_new();
    wasm._CachedPalette_from_BytePalette(cachedPalette, bytePalette);
    // Mode 0 = sRGB, null illuminant
    wasm._CachedPalette_update_cache(cachedPalette, 0, 0);

    return { cachedPalette, bytePalette };
}

/**
 * Convert palette index output to ImageData
 */
function indexOutputToImageData(
    wasm: LibDitherModule,
    outPtr: number,
    width: number,
    height: number,
    palette: Palette,
    imageData: ImageData
): ImageData {
    const output = new ImageData(width, height);
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
        // Output is int32 array (4 bytes per index)
        const index = wasm.HEAP32[(outPtr >> 2) + i];
        const outIdx = i * 4;

        if (index >= 0 && index < palette.colors.length) {
            const color = palette.colors[index];
            output.data[outIdx] = color.r;
            output.data[outIdx + 1] = color.g;
            output.data[outIdx + 2] = color.b;
            output.data[outIdx + 3] = imageData.data[outIdx + 3]; // Preserve source alpha
        } else {
            // Transparent or invalid index
            output.data[outIdx] = 0;
            output.data[outIdx + 1] = 0;
            output.data[outIdx + 2] = 0;
            output.data[outIdx + 3] = 0;
        }
    }

    return output;
}

/**
 * Check if algorithm supports color dithering in WASM
 */
function supportsWasmColorDither(algorithm: string): boolean {
    // Error diffusion algorithms that have color support
    const errorDiffusionAlgos = [
        'floyd-steinberg', 'jarvis-judice-ninke', 'stucki', 'burkes',
        'sierra3', 'sierra2', 'sierra-lite', 'atkinson', 'stevenson-arce',
        'fake-floyd-steinberg', 'shiau-fan1', 'shiau-fan2', 'shiau-fan3',
        'xot', 'diagonal', 'diffusion-1d', 'diffusion-2d',
        'steve-pigeon', 'robert-kist'
    ];

    // Ordered dithering algorithms that have color support
    const orderedAlgos = [
        'ordered-bayer2', 'ordered-bayer3', 'ordered-bayer4',
        'ordered-bayer8', 'ordered-bayer16', 'ordered-bayer32',
        'ordered-blue-noise',
        'ordered-clustered-v1', 'ordered-clustered-v2', 'ordered-clustered-v3',
        'ordered-clustered-v4', 'ordered-clustered-v5', 'ordered-clustered-v6',
        'ordered-clustered-v7', 'ordered-clustered-v8', 'ordered-clustered-v9',
        'ordered-clustered-v10', 'ordered-clustered-v11',
        'ordered-dispersed-v1', 'ordered-dispersed-v2', 'ordered-ulichney-void',
        'ordered-nonrect-v1', 'ordered-nonrect-v2', 'ordered-nonrect-v3', 'ordered-nonrect-v4',
        'ordered-ulichney-bayer5', 'ordered-ulichney-standard', 'ordered-ulichney-clustered',
        'ordered-diagonal',
        'ordered-im-circle5', 'ordered-im-circle6', 'ordered-im-circle7',
        'ordered-im-45deg4', 'ordered-im-45deg6', 'ordered-im-45deg8',
        'ordered-variable2', 'ordered-variable4', 'ordered-interleaved-gradient'
    ];

    return errorDiffusionAlgos.includes(algorithm) || orderedAlgos.includes(algorithm);
}

/**
 * WASM color dithering for multi-color palettes
 */
async function wasmDitherColor(
    imageData: ImageData,
    algorithm: Algorithm,
    palette: Palette,
    options: AlgorithmOptions = {}
): Promise<ImageData> {
    const wasm = await initWasm();
    const { width, height } = imageData;
    const pixelCount = width * height;

    // Allocate output buffer (int32 for palette indices)
    const outPtr = wasm._malloc(pixelCount * 4);
    if (outPtr === 0) {
        throw new Error('[WASM] Failed to allocate output buffer');
    }

    // Initialize output to -1 (transparent)
    for (let i = 0; i < pixelCount; i++) {
        wasm.HEAP32[(outPtr >> 2) + i] = -1;
    }

    // Create ColorImage from input
    const imgPtr = imageDataToColorImage(wasm, imageData);
    if (imgPtr === 0) {
        wasm._free(outPtr);
        throw new Error('[WASM] Failed to create ColorImage');
    }

    // Create palette
    const { cachedPalette, bytePalette } = createCachedPalette(wasm, palette);

    try {
        const serpentine = (options as { serpentine?: boolean }).serpentine ? 1 : 0;

        // Check if it's an error diffusion or ordered algorithm
        const isErrorDiffusion = !algorithm.startsWith('ordered-');

        if (isErrorDiffusion) {
            const matrixPtr = getErrorDiffusionMatrix(wasm, algorithm);
            wasm._error_diffusion_dither_color(imgPtr, matrixPtr, cachedPalette, serpentine, outPtr);
            wasm._ErrorDiffusionMatrix_free(matrixPtr);
        } else {
            const { ptr: matrixPtr, needsFree } = getOrderedMatrix(wasm, algorithm, options);
            wasm._ordered_dither_color(imgPtr, cachedPalette, matrixPtr, outPtr);
            if (needsFree) wasm._OrderedDitherMatrix_free(matrixPtr);
        }

        return indexOutputToImageData(wasm, outPtr, width, height, palette, imageData);

    } finally {
        wasm._ColorImage_free(imgPtr);
        wasm._CachedPalette_free(cachedPalette);
        wasm._BytePalette_free(bytePalette);
        wasm._free(outPtr);
    }
}

/**
 * Get error diffusion matrix by algorithm name
 */
function getErrorDiffusionMatrix(wasm: LibDitherModule, algorithm: string): number {
    const matrixMap: Record<string, () => number> = {
        'floyd-steinberg': () => wasm._get_floyd_steinberg_matrix(),
        'jarvis-judice-ninke': () => wasm._get_jarvis_judice_ninke_matrix(),
        'stucki': () => wasm._get_stucki_matrix(),
        'burkes': () => wasm._get_burkes_matrix(),
        'sierra3': () => wasm._get_sierra_3_matrix(),
        'sierra2': () => wasm._get_sierra_2row_matrix(),
        'sierra-lite': () => wasm._get_sierra_lite_matrix(),
        'atkinson': () => wasm._get_atkinson_matrix(),
        'stevenson-arce': () => wasm._get_stevenson_arce_matrix(),
        'fake-floyd-steinberg': () => wasm._get_fake_floyd_steinberg_matrix(),
        'shiau-fan1': () => wasm._get_shiaufan1_matrix(),
        'shiau-fan2': () => wasm._get_shiaufan2_matrix(),
        'shiau-fan3': () => wasm._get_shiaufan3_matrix(),
        'xot': () => wasm._get_xot_matrix(),
        'diagonal': () => wasm._get_diagonal_matrix(),
        'diffusion-1d': () => wasm._get_diffusion_1d_matrix(),
        'diffusion-2d': () => wasm._get_diffusion_2d_matrix(),
        'steve-pigeon': () => wasm._get_steve_pigeon_matrix(),
        'robert-kist': () => wasm._get_robert_kist_matrix(),
    };

    const getter = matrixMap[algorithm];
    if (!getter) {
        console.warn(`Unknown error diffusion algorithm: ${algorithm}, using Floyd-Steinberg`);
        return wasm._get_floyd_steinberg_matrix();
    }
    return getter();
}

/**
 * Get ordered dither matrix by algorithm name
 */
function getOrderedMatrix(wasm: LibDitherModule, algorithm: string, options: AlgorithmOptions): { ptr: number; needsFree: boolean } {
    // Handle variable matrices that need parameters
    if (algorithm === 'ordered-variable2') {
        const step = (options as { step?: number }).step ?? 0;
        return { ptr: wasm._get_variable_2x2_matrix(step), needsFree: true };
    }
    if (algorithm === 'ordered-variable4') {
        const step = (options as { step?: number }).step ?? 0;
        return { ptr: wasm._get_variable_4x4_matrix(step), needsFree: true };
    }
    if (algorithm === 'ordered-interleaved-gradient') {
        const opts = options as { a?: number; b?: number; c?: number; size?: number };
        return {
            ptr: wasm._get_interleaved_gradient_noise(opts.size ?? 64, opts.a ?? 0.5, opts.b ?? 0.5, opts.c ?? 52.9829189),
            needsFree: true
        };
    }

    const matrixMap: Record<string, () => number> = {
        'ordered-bayer2': () => wasm._get_bayer2x2_matrix(),
        'ordered-bayer3': () => wasm._get_bayer3x3_matrix(),
        'ordered-bayer4': () => wasm._get_bayer4x4_matrix(),
        'ordered-bayer8': () => wasm._get_bayer8x8_matrix(),
        'ordered-bayer16': () => wasm._get_bayer16x16_matrix(),
        'ordered-bayer32': () => wasm._get_bayer32x32_matrix(),
        'ordered-blue-noise': () => wasm._get_blue_noise_128x128(),
        'ordered-dispersed-v1': () => wasm._get_dispersed_dots_1_matrix(),
        'ordered-dispersed-v2': () => wasm._get_dispersed_dots_2_matrix(),
        'ordered-ulichney-void': () => wasm._get_ulichney_void_dispersed_dots_matrix(),
        'ordered-nonrect-v1': () => wasm._get_non_rectangular_1_matrix(),
        'ordered-nonrect-v2': () => wasm._get_non_rectangular_2_matrix(),
        'ordered-nonrect-v3': () => wasm._get_non_rectangular_3_matrix(),
        'ordered-nonrect-v4': () => wasm._get_non_rectangular_4_matrix(),
        'ordered-ulichney-bayer5': () => wasm._get_ulichney_bayer_5_matrix(),
        'ordered-ulichney-standard': () => wasm._get_ulichney_matrix(),
        'ordered-ulichney-clustered': () => wasm._get_ulichney_clustered_dot_matrix(),
        'ordered-clustered-v1': () => wasm._get_bayer_clustered_dot_1_matrix(),
        'ordered-clustered-v2': () => wasm._get_bayer_clustered_dot_2_matrix(),
        'ordered-clustered-v3': () => wasm._get_bayer_clustered_dot_3_matrix(),
        'ordered-clustered-v4': () => wasm._get_bayer_clustered_dot_4_matrix(),
        'ordered-clustered-v5': () => wasm._get_bayer_clustered_dot_5_matrix(),
        'ordered-clustered-v6': () => wasm._get_bayer_clustered_dot_6_matrix(),
        'ordered-clustered-v7': () => wasm._get_bayer_clustered_dot_7_matrix(),
        'ordered-clustered-v8': () => wasm._get_bayer_clustered_dot_8_matrix(),
        'ordered-clustered-v9': () => wasm._get_bayer_clustered_dot_9_matrix(),
        'ordered-clustered-v10': () => wasm._get_bayer_clustered_dot_10_matrix(),
        'ordered-clustered-v11': () => wasm._get_bayer_clustered_dot_11_matrix(),
        'ordered-diagonal': () => wasm._get_diagonal_ordered_matrix_matrix(),
        'ordered-im-circle5': () => wasm._get_magic5x5_circle_matrix(),
        'ordered-im-circle6': () => wasm._get_magic6x6_circle_matrix(),
        'ordered-im-circle7': () => wasm._get_magic7x7_circle_matrix(),
        'ordered-im-45deg4': () => wasm._get_magic4x4_45_matrix(),
        'ordered-im-45deg6': () => wasm._get_magic6x6_45_matrix(),
        'ordered-im-45deg8': () => wasm._get_magic8x8_45_matrix(),
    };

    const getter = matrixMap[algorithm];
    if (!getter) {
        console.warn(`Unknown ordered dither algorithm: ${algorithm}, using Bayer 8x8`);
        return { ptr: wasm._get_bayer8x8_matrix(), needsFree: false };
    }
    return { ptr: getter(), needsFree: false };
}

/**
 * Get Riemersma curve by algorithm name
 */
function getRiemersmaCurve(wasm: LibDitherModule, algorithm: string): number {
    const curveMap: Record<string, () => number> = {
        'riemersma-hilbert': () => wasm._get_hilbert_curve(),
        'riemersma-hilbert-mod': () => wasm._get_hilbert_mod_curve(),
        'riemersma-peano': () => wasm._get_peano_curve(),
        'riemersma-fass0': () => wasm._get_fass0_curve(),
        'riemersma-fass1': () => wasm._get_fass1_curve(),
        'riemersma-fass2': () => wasm._get_fass2_curve(),
        'riemersma-gosper': () => wasm._get_gosper_curve(),
        'riemersma-fass-spiral': () => wasm._get_fass_spiral_curve(),
    };

    const getter = curveMap[algorithm];
    if (!getter) {
        return wasm._get_hilbert_curve();
    }
    return getter();
}

/**
 * Get pattern by algorithm name
 */
function getPattern(wasm: LibDitherModule, algorithm: string): number {
    const patternMap: Record<string, () => number> = {
        'pattern-2x2': () => wasm._get_2x2_pattern(),
        'pattern-3x3-v1': () => wasm._get_3x3_v1_pattern(),
        'pattern-3x3-v2': () => wasm._get_3x3_v2_pattern(),
        'pattern-3x3-v3': () => wasm._get_3x3_v3_pattern(),
        'pattern-4x4': () => wasm._get_4x4_pattern(),
        'pattern-5x2': () => wasm._get_5x2_pattern(),
    };

    const getter = patternMap[algorithm];
    if (!getter) {
        return wasm._get_2x2_pattern();
    }
    return getter();
}

/**
 * Get dot diffusion matrices by algorithm name
 */
function getDotDiffusionMatrices(wasm: LibDitherModule, algorithm: string): { diffusion: number; classMatrix: number } {
    const classMap: Record<string, () => number> = {
        'dot-diffusion-knuth': () => wasm._get_knuth_class_matrix(),
        'dot-diffusion-mini-knuth': () => wasm._get_mini_knuth_class_matrix(),
        'dot-diffusion-optimized-knuth': () => wasm._get_optimized_knuth_class_matrix(),
        'dot-diffusion-mese-8x8': () => wasm._get_mese_8x8_class_matrix(),
        'dot-diffusion-mese-16x16': () => wasm._get_mese_16x16_class_matrix(),
        'dot-diffusion-guo-liu-8x8': () => wasm._get_guoliu_8x8_class_matrix(),
        'dot-diffusion-guo-liu-16x16': () => wasm._get_guoliu_16x16_class_matrix(),
        'dot-diffusion-spiral': () => wasm._get_spiral_class_matrix(),
        'dot-diffusion-inverted-spiral': () => wasm._get_spiral_inverted_class_matrix(),
    };

    // Select appropriate diffusion matrix based on class matrix size
    let diffusion: number;
    if (algorithm.includes('16x16')) {
        diffusion = wasm._get_guoliu16_diffusion_matrix();
    } else if (algorithm.includes('guo-liu')) {
        diffusion = algorithm.includes('16x16') ? wasm._get_guoliu16_diffusion_matrix() : wasm._get_guoliu8_diffusion_matrix();
    } else {
        diffusion = wasm._get_default_diffusion_matrix();
    }

    const classGetter = classMap[algorithm];
    const classMatrix = classGetter ? classGetter() : wasm._get_knuth_class_matrix();

    return { diffusion, classMatrix };
}

/**
 * Get dot lippens coefficients by algorithm name
 */
function getDotLippensCoefficients(wasm: LibDitherModule, algorithm: string): number {
    const coeffMap: Record<string, () => number> = {
        'dot-lippens-li1': () => wasm._get_dotlippens_coefficients1(),
        'dot-lippens-li2': () => wasm._get_dotlippens_coefficients2(),
        'dot-lippens-li3': () => wasm._get_dotlippens_coefficients3(),
        'dot-lippens-guo': () => wasm._get_dotlippens_coefficients1(),
        'dot-lippens-mese': () => wasm._get_dotlippens_coefficients2(),
        'dot-lippens-knuth': () => wasm._get_dotlippens_coefficients3(),
    };

    const getter = coeffMap[algorithm];
    return getter ? getter() : wasm._get_dotlippens_coefficients1();
}

/**
 * Main WASM dithering function for mono algorithms
 * Uses color dithering path when palette has >2 colors and algorithm supports it
 */
export async function wasmDitherMono(
    imageData: ImageData,
    algorithm: Algorithm,
    palette: Palette,
    options: AlgorithmOptions = {}
): Promise<ImageData> {
    // Use color dithering for multi-color palettes when algorithm supports it
    // This gives proper multi-level dithering instead of binary output
    if (palette.colors.length > 2 && supportsWasmColorDither(algorithm)) {
        return wasmDitherColor(imageData, algorithm, palette, options);
    }

    const wasm = await initWasm();
    const { width, height } = imageData;
    const pixelCount = width * height;

    // Allocate output buffer
    const outPtr = wasm._malloc(pixelCount);
    if (outPtr === 0) {
        throw new Error('[WASM] Failed to allocate output buffer');
    }

    // Zero out the output buffer to ensure clean state
    for (let i = 0; i < pixelCount; i++) {
        wasm.HEAPU8[outPtr + i] = 0;
    }

    // Create DitherImage from input
    const imgPtr = imageDataToDitherImage(wasm, imageData);
    if (imgPtr === 0) {
        wasm._free(outPtr);
        throw new Error('[WASM] Failed to create DitherImage');
    }

    try {
        const serpentine = (options as { serpentine?: boolean }).serpentine ? 1 : 0;
        const jitter = (options as { jitter?: number }).jitter ?? 0;

        // Route to appropriate algorithm (mono binary dithering)
        if (algorithm === 'threshold') {
            const threshold = (options as { threshold?: number }).threshold ?? 0.5;
            const noise = (options as { noise?: number }).noise ?? 0;
            wasm._threshold_dither(imgPtr, threshold, noise, outPtr);
        }
        else if (algorithm.startsWith('ordered-') || algorithm === 'ordered-blue-noise') {
            const { ptr: matrixPtr, needsFree } = getOrderedMatrix(wasm, algorithm, options);
            wasm._ordered_dither(imgPtr, matrixPtr, jitter, outPtr);
            if (needsFree) wasm._OrderedDitherMatrix_free(matrixPtr);
        }
        else if (algorithm.startsWith('riemersma-')) {
            const curvePtr = getRiemersmaCurve(wasm, algorithm);
            const dimPtr = wasm._malloc(4);
            if (dimPtr === 0) throw new Error('[WASM] Failed to allocate dim buffer');
            wasm._create_curve(curvePtr, width, height, dimPtr);
            const useRiemersma = algorithm.includes('-mod') ? 0 : 1;
            wasm._riemersma_dither(imgPtr, curvePtr, useRiemersma, outPtr);
            wasm._free(dimPtr);
            wasm._RiemersmaCurve_free(curvePtr);
        }
        else if (algorithm.startsWith('pattern-')) {
            const patternPtr = getPattern(wasm, algorithm);
            wasm._pattern_dither(imgPtr, patternPtr, outPtr);
            wasm._TilePattern_free(patternPtr);
        }
        else if (algorithm.startsWith('dot-diffusion-')) {
            const { diffusion, classMatrix } = getDotDiffusionMatrices(wasm, algorithm);
            wasm._dot_diffusion_dither(imgPtr, diffusion, classMatrix, outPtr);
            wasm._DotDiffusionMatrix_free(diffusion);
            wasm._DotClassMatrix_free(classMatrix);
        }
        else if (algorithm.startsWith('dot-lippens-')) {
            const classMatrix = wasm._get_dotlippens_class_matrix();
            const coefficients = getDotLippensCoefficients(wasm, algorithm);
            wasm._dotlippens_dither(imgPtr, classMatrix, coefficients, outPtr);
            wasm._DotClassMatrix_free(classMatrix);
            wasm._DotLippensCoefficients_free(coefficients);
        }
        else if (algorithm === 'variable-ostromoukhov') {
            wasm._variable_error_diffusion_dither(imgPtr, 0, serpentine, outPtr);
        }
        else if (algorithm === 'variable-zhou-fang') {
            wasm._variable_error_diffusion_dither(imgPtr, 1, serpentine, outPtr);
        }
        else if (algorithm === 'grid') {
            const gridW = (options as { gridWidth?: number }).gridWidth ?? 4;
            const gridH = (options as { gridHeight?: number }).gridHeight ?? 4;
            const minPixels = (options as { minPixels?: number }).minPixels ?? 0;
            const altMode = (options as { alternativeMode?: boolean }).alternativeMode ? 1 : 0;
            wasm._grid_dither(imgPtr, gridW, gridH, minPixels, altMode, outPtr);
        }
        else if (algorithm === 'dbs') {
            const formula = (options as { formula?: number }).formula ?? 0;
            wasm._dbs_dither(imgPtr, formula, outPtr);
        }
        else if (algorithm === 'kacker-allebach') {
            const randomize = (options as { randomize?: boolean }).randomize ? 1 : 0;
            wasm._kallebach_dither(imgPtr, randomize, outPtr);
        }
        else {
            // Error diffusion algorithms (default)
            const matrixPtr = getErrorDiffusionMatrix(wasm, algorithm);
            wasm._error_diffusion_dither(imgPtr, matrixPtr, serpentine, jitter, outPtr);
            wasm._ErrorDiffusionMatrix_free(matrixPtr);
        }

        // Convert output to ImageData
        return monoOutputToImageData(wasm, outPtr, width, height, palette, imageData);

    } finally {
        // Clean up
        wasm._DitherImage_free(imgPtr);
        wasm._free(outPtr);
    }
}

// Pre-computed Set of WASM-accelerated algorithms (created once at module load)
const WASM_ALGORITHMS = new Set([
    // Additional error diffusion kernels (not in JS)
    'shiau-fan3', 'xot', 'diagonal', 'diffusion-1d', 'diffusion-2d',
    'steve-pigeon', 'robert-kist',
    // Additional ordered matrices (not in JS)
    'ordered-blue-noise',
    'ordered-clustered-v1', 'ordered-clustered-v2', 'ordered-clustered-v3',
    'ordered-clustered-v4', 'ordered-clustered-v5', 'ordered-clustered-v6',
    'ordered-clustered-v7', 'ordered-clustered-v8', 'ordered-clustered-v9',
    'ordered-clustered-v10', 'ordered-clustered-v11',
    'ordered-dispersed-v1', 'ordered-dispersed-v2', 'ordered-ulichney-void',
    'ordered-nonrect-v1', 'ordered-nonrect-v2', 'ordered-nonrect-v3', 'ordered-nonrect-v4',
    'ordered-ulichney-bayer5', 'ordered-ulichney-standard', 'ordered-ulichney-clustered',
    'ordered-diagonal',
    'ordered-im-circle5', 'ordered-im-circle6', 'ordered-im-circle7',
    'ordered-im-45deg4', 'ordered-im-45deg6', 'ordered-im-45deg8',
    'ordered-variable2', 'ordered-variable4', 'ordered-interleaved-gradient',
    // All Riemersma variants
    'riemersma-hilbert', 'riemersma-hilbert-mod', 'riemersma-peano',
    'riemersma-fass0', 'riemersma-fass1', 'riemersma-fass2',
    'riemersma-gosper', 'riemersma-fass-spiral',
    // Pattern dithering
    'pattern-2x2', 'pattern-3x3-v1', 'pattern-3x3-v2', 'pattern-3x3-v3',
    'pattern-4x4', 'pattern-5x2',
    // Dot diffusion
    'dot-diffusion-knuth', 'dot-diffusion-mini-knuth', 'dot-diffusion-optimized-knuth',
    'dot-diffusion-mese-8x8', 'dot-diffusion-mese-16x16',
    'dot-diffusion-guo-liu-8x8', 'dot-diffusion-guo-liu-16x16',
    'dot-diffusion-spiral', 'dot-diffusion-inverted-spiral',
    // Dot Lippens
    'dot-lippens-li1', 'dot-lippens-li2', 'dot-lippens-li3',
    'dot-lippens-guo', 'dot-lippens-mese', 'dot-lippens-knuth',
    // Variable error diffusion
    'variable-ostromoukhov', 'variable-zhou-fang',
    // Special algorithms
    'grid', 'dbs', 'kacker-allebach',
]);

/**
 * Check if an algorithm should use WASM
 */
export function shouldUseWasm(algorithm: Algorithm): boolean {
    return WASM_ALGORITHMS.has(algorithm);
}

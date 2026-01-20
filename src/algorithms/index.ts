import type {
    Algorithm,
    AlgorithmInfo,
    AlgorithmCategory,
    AlgorithmOptions,
    Palette,
    ColorMatchMethod
} from '../types/index.ts';
import { threshold, thresholdColor } from './threshold.ts';
import { errorDiffusionMono, errorDiffusionColor, ERROR_KERNELS } from './error-diffusion.ts';
import { orderedDitherMono, orderedDitherColor, BAYER_MATRICES } from './ordered.ts';
import { wasmDitherMono, shouldUseWasm, initWasm, isWasmLoaded } from '../engine/wasm-dither.ts';

/**
 * Algorithm registry with metadata
 */
export const ALGORITHMS: Record<Algorithm, AlgorithmInfo> = {
    // Error Diffusion
    'floyd-steinberg': { id: 'floyd-steinberg', name: 'Floyd-Steinberg', category: 'Error Diffusion' },
    'jarvis-judice-ninke': { id: 'jarvis-judice-ninke', name: 'Jarvis-Judice-Ninke', category: 'Error Diffusion' },
    'stucki': { id: 'stucki', name: 'Stucki', category: 'Error Diffusion' },
    'burkes': { id: 'burkes', name: 'Burkes', category: 'Error Diffusion' },
    'sierra3': { id: 'sierra3', name: 'Sierra 3-row', category: 'Error Diffusion' },
    'sierra2': { id: 'sierra2', name: 'Sierra 2-row', category: 'Error Diffusion' },
    'sierra-lite': { id: 'sierra-lite', name: 'Sierra Lite', category: 'Error Diffusion' },
    'atkinson': { id: 'atkinson', name: 'Atkinson', category: 'Error Diffusion' },
    'stevenson-arce': { id: 'stevenson-arce', name: 'Stevenson-Arce', category: 'Error Diffusion' },
    'fake-floyd-steinberg': { id: 'fake-floyd-steinberg', name: 'Fake Floyd-Steinberg', category: 'Error Diffusion' },
    'shiau-fan1': { id: 'shiau-fan1', name: 'Shiau-Fan 1', category: 'Error Diffusion' },
    'shiau-fan2': { id: 'shiau-fan2', name: 'Shiau-Fan 2', category: 'Error Diffusion' },
    'shiau-fan3': { id: 'shiau-fan3', name: 'Shiau-Fan 3', category: 'Error Diffusion' },
    'xot': { id: 'xot', name: 'XOT', category: 'Error Diffusion' },
    'diagonal': { id: 'diagonal', name: 'Diagonal', category: 'Error Diffusion' },
    'diffusion-1d': { id: 'diffusion-1d', name: 'Diffusion 1D', category: 'Error Diffusion' },
    'diffusion-2d': { id: 'diffusion-2d', name: 'Diffusion 2D', category: 'Error Diffusion' },
    'steve-pigeon': { id: 'steve-pigeon', name: 'Steve Pigeon', category: 'Error Diffusion' },
    'robert-kist': { id: 'robert-kist', name: 'Robert Kist', category: 'Error Diffusion' },

    // Ordered - Bayer
    'ordered-bayer2': { id: 'ordered-bayer2', name: 'Bayer 2×2', category: 'Ordered' },
    'ordered-bayer3': { id: 'ordered-bayer3', name: 'Bayer 3×3', category: 'Ordered' },
    'ordered-bayer4': { id: 'ordered-bayer4', name: 'Bayer 4×4', category: 'Ordered' },
    'ordered-bayer8': { id: 'ordered-bayer8', name: 'Bayer 8×8', category: 'Ordered' },
    'ordered-bayer16': { id: 'ordered-bayer16', name: 'Bayer 16×16', category: 'Ordered' },
    'ordered-bayer32': { id: 'ordered-bayer32', name: 'Bayer 32×32', category: 'Ordered' },

    // Ordered - Blue Noise
    'ordered-blue-noise': { id: 'ordered-blue-noise', name: 'Blue Noise', category: 'Ordered' },

    // Ordered - Clustered
    'ordered-clustered-v1': { id: 'ordered-clustered-v1', name: 'Clustered Dot v1', category: 'Ordered' },
    'ordered-clustered-v2': { id: 'ordered-clustered-v2', name: 'Clustered Dot v2', category: 'Ordered' },
    'ordered-clustered-v3': { id: 'ordered-clustered-v3', name: 'Clustered Dot v3', category: 'Ordered' },
    'ordered-clustered-v4': { id: 'ordered-clustered-v4', name: 'Clustered Dot v4', category: 'Ordered' },
    'ordered-clustered-v5': { id: 'ordered-clustered-v5', name: 'Clustered Dot v5', category: 'Ordered' },
    'ordered-clustered-v6': { id: 'ordered-clustered-v6', name: 'Clustered Dot v6', category: 'Ordered' },
    'ordered-clustered-v7': { id: 'ordered-clustered-v7', name: 'Clustered Dot v7', category: 'Ordered' },
    'ordered-clustered-v8': { id: 'ordered-clustered-v8', name: 'Clustered Dot v8', category: 'Ordered' },
    'ordered-clustered-v9': { id: 'ordered-clustered-v9', name: 'Clustered Dot v9', category: 'Ordered' },
    'ordered-clustered-v10': { id: 'ordered-clustered-v10', name: 'Clustered Dot v10', category: 'Ordered' },
    'ordered-clustered-v11': { id: 'ordered-clustered-v11', name: 'Clustered Dot v11', category: 'Ordered' },

    // Ordered - Dispersed
    'ordered-dispersed-v1': { id: 'ordered-dispersed-v1', name: 'Dispersed v1', category: 'Ordered' },
    'ordered-dispersed-v2': { id: 'ordered-dispersed-v2', name: 'Dispersed v2', category: 'Ordered' },
    'ordered-ulichney-void': { id: 'ordered-ulichney-void', name: 'Ulichney Void', category: 'Ordered' },

    // Ordered - Non-Rectangular
    'ordered-nonrect-v1': { id: 'ordered-nonrect-v1', name: 'Non-Rectangular v1', category: 'Ordered' },
    'ordered-nonrect-v2': { id: 'ordered-nonrect-v2', name: 'Non-Rectangular v2', category: 'Ordered' },
    'ordered-nonrect-v3': { id: 'ordered-nonrect-v3', name: 'Non-Rectangular v3', category: 'Ordered' },
    'ordered-nonrect-v4': { id: 'ordered-nonrect-v4', name: 'Non-Rectangular v4', category: 'Ordered' },

    // Ordered - Ulichney
    'ordered-ulichney-bayer5': { id: 'ordered-ulichney-bayer5', name: 'Ulichney Bayer 5×5', category: 'Ordered' },
    'ordered-ulichney-standard': { id: 'ordered-ulichney-standard', name: 'Ulichney Standard', category: 'Ordered' },
    'ordered-ulichney-clustered': { id: 'ordered-ulichney-clustered', name: 'Ulichney Clustered', category: 'Ordered' },

    // Ordered - Other
    'ordered-diagonal': { id: 'ordered-diagonal', name: 'Diagonal', category: 'Ordered' },
    'ordered-im-circle5': { id: 'ordered-im-circle5', name: 'IM Circle 5×5', category: 'Ordered' },
    'ordered-im-circle6': { id: 'ordered-im-circle6', name: 'IM Circle 6×6', category: 'Ordered' },
    'ordered-im-circle7': { id: 'ordered-im-circle7', name: 'IM Circle 7×7', category: 'Ordered' },
    'ordered-im-45deg4': { id: 'ordered-im-45deg4', name: 'IM 45° 4×4', category: 'Ordered' },
    'ordered-im-45deg6': { id: 'ordered-im-45deg6', name: 'IM 45° 6×6', category: 'Ordered' },
    'ordered-im-45deg8': { id: 'ordered-im-45deg8', name: 'IM 45° 8×8', category: 'Ordered' },
    'ordered-variable2': { id: 'ordered-variable2', name: 'Variable 2×2', category: 'Ordered' },
    'ordered-variable4': { id: 'ordered-variable4', name: 'Variable 4×4', category: 'Ordered' },
    'ordered-interleaved-gradient': { id: 'ordered-interleaved-gradient', name: 'Interleaved Gradient', category: 'Ordered' },

    // Riemersma
    'riemersma-hilbert': { id: 'riemersma-hilbert', name: 'Hilbert Curve', category: 'Riemersma' },
    'riemersma-hilbert-mod': { id: 'riemersma-hilbert-mod', name: 'Hilbert Modified', category: 'Riemersma' },
    'riemersma-peano': { id: 'riemersma-peano', name: 'Peano Curve', category: 'Riemersma' },
    'riemersma-fass0': { id: 'riemersma-fass0', name: 'Fass 0', category: 'Riemersma' },
    'riemersma-fass1': { id: 'riemersma-fass1', name: 'Fass 1', category: 'Riemersma' },
    'riemersma-fass2': { id: 'riemersma-fass2', name: 'Fass 2', category: 'Riemersma' },
    'riemersma-gosper': { id: 'riemersma-gosper', name: 'Gosper Curve', category: 'Riemersma' },
    'riemersma-fass-spiral': { id: 'riemersma-fass-spiral', name: 'Fass Spiral', category: 'Riemersma' },

    // Pattern
    'pattern-2x2': { id: 'pattern-2x2', name: 'Pattern 2×2', category: 'Pattern' },
    'pattern-3x3-v1': { id: 'pattern-3x3-v1', name: 'Pattern 3×3 v1', category: 'Pattern' },
    'pattern-3x3-v2': { id: 'pattern-3x3-v2', name: 'Pattern 3×3 v2', category: 'Pattern' },
    'pattern-3x3-v3': { id: 'pattern-3x3-v3', name: 'Pattern 3×3 v3', category: 'Pattern' },
    'pattern-4x4': { id: 'pattern-4x4', name: 'Pattern 4×4', category: 'Pattern' },
    'pattern-5x2': { id: 'pattern-5x2', name: 'Pattern 5×2', category: 'Pattern' },

    // Dot Diffusion
    'dot-diffusion-knuth': { id: 'dot-diffusion-knuth', name: 'Knuth', category: 'Dot Diffusion' },
    'dot-diffusion-mini-knuth': { id: 'dot-diffusion-mini-knuth', name: 'Mini-Knuth', category: 'Dot Diffusion' },
    'dot-diffusion-optimized-knuth': { id: 'dot-diffusion-optimized-knuth', name: 'Optimized Knuth', category: 'Dot Diffusion' },
    'dot-diffusion-mese-8x8': { id: 'dot-diffusion-mese-8x8', name: 'Mese 8×8', category: 'Dot Diffusion' },
    'dot-diffusion-mese-16x16': { id: 'dot-diffusion-mese-16x16', name: 'Mese 16×16', category: 'Dot Diffusion' },
    'dot-diffusion-guo-liu-8x8': { id: 'dot-diffusion-guo-liu-8x8', name: 'Guo-Liu 8×8', category: 'Dot Diffusion' },
    'dot-diffusion-guo-liu-16x16': { id: 'dot-diffusion-guo-liu-16x16', name: 'Guo-Liu 16×16', category: 'Dot Diffusion' },
    'dot-diffusion-spiral': { id: 'dot-diffusion-spiral', name: 'Spiral', category: 'Dot Diffusion' },
    'dot-diffusion-inverted-spiral': { id: 'dot-diffusion-inverted-spiral', name: 'Inverted Spiral', category: 'Dot Diffusion' },

    // Dot Lippens
    'dot-lippens-li1': { id: 'dot-lippens-li1', name: 'Lippens Li1', category: 'Dot Lippens' },
    'dot-lippens-li2': { id: 'dot-lippens-li2', name: 'Lippens Li2', category: 'Dot Lippens' },
    'dot-lippens-li3': { id: 'dot-lippens-li3', name: 'Lippens Li3', category: 'Dot Lippens' },
    'dot-lippens-guo': { id: 'dot-lippens-guo', name: 'Lippens Guo', category: 'Dot Lippens' },
    'dot-lippens-mese': { id: 'dot-lippens-mese', name: 'Lippens Mese', category: 'Dot Lippens' },
    'dot-lippens-knuth': { id: 'dot-lippens-knuth', name: 'Lippens Knuth', category: 'Dot Lippens' },

    // Variable Error Diffusion
    'variable-ostromoukhov': { id: 'variable-ostromoukhov', name: 'Ostromoukhov', category: 'Variable Error Diffusion' },
    'variable-zhou-fang': { id: 'variable-zhou-fang', name: 'Zhou-Fang', category: 'Variable Error Diffusion' },

    // Other
    'threshold': { id: 'threshold', name: 'Threshold', category: 'Other' },
    'dbs': { id: 'dbs', name: 'Direct Binary Search', category: 'Other', description: 'Very slow but high quality' },
    'grid': { id: 'grid', name: 'Grid', category: 'Other' },
    'kacker-allebach': { id: 'kacker-allebach', name: 'Kacker-Allebach', category: 'Other' },

    // Color variants
    'floyd-steinberg-color': { id: 'floyd-steinberg-color', name: 'Floyd-Steinberg', category: 'Error Diffusion', isColor: true },
    'jarvis-judice-ninke-color': { id: 'jarvis-judice-ninke-color', name: 'Jarvis-Judice-Ninke', category: 'Error Diffusion', isColor: true },
    'stucki-color': { id: 'stucki-color', name: 'Stucki', category: 'Error Diffusion', isColor: true },
    'burkes-color': { id: 'burkes-color', name: 'Burkes', category: 'Error Diffusion', isColor: true },
    'sierra3-color': { id: 'sierra3-color', name: 'Sierra 3-row', category: 'Error Diffusion', isColor: true },
    'sierra2-color': { id: 'sierra2-color', name: 'Sierra 2-row', category: 'Error Diffusion', isColor: true },
    'sierra-lite-color': { id: 'sierra-lite-color', name: 'Sierra Lite', category: 'Error Diffusion', isColor: true },
    'atkinson-color': { id: 'atkinson-color', name: 'Atkinson', category: 'Error Diffusion', isColor: true },
    'ordered-bayer8-color': { id: 'ordered-bayer8-color', name: 'Bayer 8×8', category: 'Ordered', isColor: true },
    'ordered-blue-noise-color': { id: 'ordered-blue-noise-color', name: 'Blue Noise', category: 'Ordered', isColor: true },
    'riemersma-hilbert-color': { id: 'riemersma-hilbert-color', name: 'Hilbert Curve', category: 'Riemersma', isColor: true },
    'threshold-color': { id: 'threshold-color', name: 'Threshold', category: 'Other', isColor: true }
};

/**
 * Get algorithms grouped by category
 */
export function getAlgorithmsByCategory(mode: 'mono' | 'color'): Map<AlgorithmCategory, AlgorithmInfo[]> {
    const grouped = new Map<AlgorithmCategory, AlgorithmInfo[]>();

    for (const algo of Object.values(ALGORITHMS)) {
        const isColorAlgo = algo.isColor === true;

        // Filter by mode
        if (mode === 'mono' && isColorAlgo) continue;
        if (mode === 'color' && !isColorAlgo) continue;

        const list = grouped.get(algo.category) || [];
        list.push(algo);
        grouped.set(algo.category, list);
    }

    return grouped;
}

/**
 * Get list of mono algorithms
 */
export function getMonoAlgorithms(): AlgorithmInfo[] {
    return Object.values(ALGORITHMS).filter(a => !a.isColor);
}

/**
 * Get list of color algorithms
 */
export function getColorAlgorithms(): AlgorithmInfo[] {
    return Object.values(ALGORITHMS).filter(a => a.isColor === true);
}

/**
 * Main dithering function
 */
export function dither(
    input: ImageData,
    algorithm: Algorithm,
    palette: Palette,
    options: AlgorithmOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean'
): ImageData {
    const baseOptions = options;

    // Route to appropriate implementation
    switch (algorithm) {
        // Threshold
        case 'threshold':
            return threshold(input, palette, options);
        case 'threshold-color':
            return thresholdColor(input, palette, options, colorMatchMethod);

        // Error Diffusion - Mono
        case 'floyd-steinberg':
            return errorDiffusionMono(input, palette, 'floyd-steinberg', baseOptions, colorMatchMethod);
        case 'jarvis-judice-ninke':
            return errorDiffusionMono(input, palette, 'jarvis-judice-ninke', baseOptions, colorMatchMethod);
        case 'stucki':
            return errorDiffusionMono(input, palette, 'stucki', baseOptions, colorMatchMethod);
        case 'burkes':
            return errorDiffusionMono(input, palette, 'burkes', baseOptions, colorMatchMethod);
        case 'sierra3':
            return errorDiffusionMono(input, palette, 'sierra3', baseOptions, colorMatchMethod);
        case 'sierra2':
            return errorDiffusionMono(input, palette, 'sierra2', baseOptions, colorMatchMethod);
        case 'sierra-lite':
            return errorDiffusionMono(input, palette, 'sierra-lite', baseOptions, colorMatchMethod);
        case 'atkinson':
            return errorDiffusionMono(input, palette, 'atkinson', baseOptions, colorMatchMethod);
        case 'stevenson-arce':
            return errorDiffusionMono(input, palette, 'stevenson-arce', baseOptions, colorMatchMethod);
        case 'fake-floyd-steinberg':
            return errorDiffusionMono(input, palette, 'fake-floyd-steinberg', baseOptions, colorMatchMethod);
        case 'shiau-fan1':
            return errorDiffusionMono(input, palette, 'shiau-fan1', baseOptions, colorMatchMethod);
        case 'shiau-fan2':
            return errorDiffusionMono(input, palette, 'shiau-fan2', baseOptions, colorMatchMethod);

        // Error Diffusion - Color
        case 'floyd-steinberg-color':
            return errorDiffusionColor(input, palette, 'floyd-steinberg', baseOptions, colorMatchMethod);
        case 'jarvis-judice-ninke-color':
            return errorDiffusionColor(input, palette, 'jarvis-judice-ninke', baseOptions, colorMatchMethod);
        case 'stucki-color':
            return errorDiffusionColor(input, palette, 'stucki', baseOptions, colorMatchMethod);
        case 'burkes-color':
            return errorDiffusionColor(input, palette, 'burkes', baseOptions, colorMatchMethod);
        case 'sierra3-color':
            return errorDiffusionColor(input, palette, 'sierra3', baseOptions, colorMatchMethod);
        case 'sierra2-color':
            return errorDiffusionColor(input, palette, 'sierra2', baseOptions, colorMatchMethod);
        case 'sierra-lite-color':
            return errorDiffusionColor(input, palette, 'sierra-lite', baseOptions, colorMatchMethod);
        case 'atkinson-color':
            return errorDiffusionColor(input, palette, 'atkinson', baseOptions, colorMatchMethod);

        // Ordered - Mono
        case 'ordered-bayer2':
            return orderedDitherMono(input, palette, 2, options);
        case 'ordered-bayer3':
            return orderedDitherMono(input, palette, 3, options);
        case 'ordered-bayer4':
            return orderedDitherMono(input, palette, 4, options);
        case 'ordered-bayer8':
            return orderedDitherMono(input, palette, 8, options);
        case 'ordered-bayer16':
            return orderedDitherMono(input, palette, 16, options);
        case 'ordered-bayer32':
            return orderedDitherMono(input, palette, 32, options);

        // Ordered - Color
        case 'ordered-bayer8-color':
            return orderedDitherColor(input, palette, 8, options, colorMatchMethod);

        // For unimplemented algorithms, fall back to Floyd-Steinberg
        default:
            console.warn(`Algorithm ${algorithm} not yet implemented, using Floyd-Steinberg`);
            return errorDiffusionMono(input, palette, 'floyd-steinberg', baseOptions);
    }
}

/**
 * Check if algorithm is implemented
 */
export function isAlgorithmImplemented(algorithm: Algorithm): boolean {
    // JS-implemented algorithms
    const jsImplemented = [
        'threshold', 'threshold-color',
        'floyd-steinberg', 'jarvis-judice-ninke', 'stucki', 'burkes',
        'sierra3', 'sierra2', 'sierra-lite', 'atkinson', 'stevenson-arce',
        'fake-floyd-steinberg', 'shiau-fan1', 'shiau-fan2',
        'floyd-steinberg-color', 'jarvis-judice-ninke-color', 'stucki-color',
        'burkes-color', 'sierra3-color', 'sierra2-color', 'sierra-lite-color', 'atkinson-color',
        'ordered-bayer2', 'ordered-bayer3', 'ordered-bayer4',
        'ordered-bayer8', 'ordered-bayer16', 'ordered-bayer32',
        'ordered-bayer8-color'
    ];

    // WASM-implemented algorithms
    const wasmImplemented = [
        // Additional error diffusion kernels
        'shiau-fan3', 'xot', 'diagonal', 'diffusion-1d', 'diffusion-2d',
        'steve-pigeon', 'robert-kist',
        // Additional ordered matrices
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
        // Riemersma
        'riemersma-hilbert', 'riemersma-hilbert-mod', 'riemersma-peano',
        'riemersma-fass0', 'riemersma-fass1', 'riemersma-fass2',
        'riemersma-gosper', 'riemersma-fass-spiral',
        // Pattern
        'pattern-2x2', 'pattern-3x3-v1', 'pattern-3x3-v2', 'pattern-3x3-v3',
        'pattern-4x4', 'pattern-5x2',
        // Dot Diffusion
        'dot-diffusion-knuth', 'dot-diffusion-mini-knuth', 'dot-diffusion-optimized-knuth',
        'dot-diffusion-mese-8x8', 'dot-diffusion-mese-16x16',
        'dot-diffusion-guo-liu-8x8', 'dot-diffusion-guo-liu-16x16',
        'dot-diffusion-spiral', 'dot-diffusion-inverted-spiral',
        // Dot Lippens
        'dot-lippens-li1', 'dot-lippens-li2', 'dot-lippens-li3',
        'dot-lippens-guo', 'dot-lippens-mese', 'dot-lippens-knuth',
        // Variable Error Diffusion
        'variable-ostromoukhov', 'variable-zhou-fang',
        // Other
        'grid', 'dbs', 'kacker-allebach'
    ];

    return jsImplemented.includes(algorithm) || wasmImplemented.includes(algorithm);
}

/**
 * Async dithering function that uses WASM when available
 */
export async function ditherAsync(
    input: ImageData,
    algorithm: Algorithm,
    palette: Palette,
    options: AlgorithmOptions = {},
    colorMatchMethod: ColorMatchMethod = 'euclidean'
): Promise<ImageData> {
    // Check if this algorithm should use WASM
    if (shouldUseWasm(algorithm)) {
        try {
            return await wasmDitherMono(input, algorithm, palette, options);
        } catch (error) {
            console.warn(`WASM dither failed for ${algorithm}, falling back to JS:`, error);
        }
    }

    // Fall back to synchronous JS implementation
    return dither(input, algorithm, palette, options, colorMatchMethod);
}

/**
 * Pre-initialize WASM module (call on app startup)
 */
export async function initDitherWasm(): Promise<boolean> {
    try {
        await initWasm();
        console.log('WASM dither module initialized');
        return true;
    } catch (error) {
        console.warn('Failed to initialize WASM dither module:', error);
        return false;
    }
}

/**
 * Check if WASM dithering is available
 */
export function isWasmDitherAvailable(): boolean {
    return isWasmLoaded();
}

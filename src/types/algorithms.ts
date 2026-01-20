/**
 * Monochrome dithering algorithm identifiers
 */
export type MonoAlgorithm =
    // Error Diffusion
    | 'floyd-steinberg'
    | 'jarvis-judice-ninke'
    | 'stucki'
    | 'burkes'
    | 'sierra3'
    | 'sierra2'
    | 'sierra-lite'
    | 'atkinson'
    | 'stevenson-arce'
    | 'shiau-fan1'
    | 'shiau-fan2'
    | 'shiau-fan3'
    | 'fake-floyd-steinberg'
    | 'xot'
    | 'diagonal'
    | 'diffusion-1d'
    | 'diffusion-2d'
    | 'steve-pigeon'
    | 'robert-kist'
    // Ordered - Bayer
    | 'ordered-bayer2'
    | 'ordered-bayer3'
    | 'ordered-bayer4'
    | 'ordered-bayer8'
    | 'ordered-bayer16'
    | 'ordered-bayer32'
    // Ordered - Blue Noise
    | 'ordered-blue-noise'
    // Ordered - Clustered Dot
    | 'ordered-clustered-v1'
    | 'ordered-clustered-v2'
    | 'ordered-clustered-v3'
    | 'ordered-clustered-v4'
    | 'ordered-clustered-v5'
    | 'ordered-clustered-v6'
    | 'ordered-clustered-v7'
    | 'ordered-clustered-v8'
    | 'ordered-clustered-v9'
    | 'ordered-clustered-v10'
    | 'ordered-clustered-v11'
    // Ordered - Dispersed
    | 'ordered-dispersed-v1'
    | 'ordered-dispersed-v2'
    | 'ordered-ulichney-void'
    // Ordered - Non-Rectangular
    | 'ordered-nonrect-v1'
    | 'ordered-nonrect-v2'
    | 'ordered-nonrect-v3'
    | 'ordered-nonrect-v4'
    // Ordered - Ulichney
    | 'ordered-ulichney-bayer5'
    | 'ordered-ulichney-standard'
    | 'ordered-ulichney-clustered'
    // Ordered - Diagonal
    | 'ordered-diagonal'
    // Ordered - ImageMagick
    | 'ordered-im-circle5'
    | 'ordered-im-circle6'
    | 'ordered-im-circle7'
    | 'ordered-im-45deg4'
    | 'ordered-im-45deg6'
    | 'ordered-im-45deg8'
    // Ordered - Variable
    | 'ordered-variable2'
    | 'ordered-variable4'
    // Ordered - Interleaved Gradient
    | 'ordered-interleaved-gradient'
    // Riemersma (Space-filling curves)
    | 'riemersma-hilbert'
    | 'riemersma-hilbert-mod'
    | 'riemersma-peano'
    | 'riemersma-fass0'
    | 'riemersma-fass1'
    | 'riemersma-fass2'
    | 'riemersma-gosper'
    | 'riemersma-fass-spiral'
    // Pattern
    | 'pattern-2x2'
    | 'pattern-3x3-v1'
    | 'pattern-3x3-v2'
    | 'pattern-3x3-v3'
    | 'pattern-4x4'
    | 'pattern-5x2'
    // Dot Diffusion
    | 'dot-diffusion-knuth'
    | 'dot-diffusion-mini-knuth'
    | 'dot-diffusion-optimized-knuth'
    | 'dot-diffusion-mese-8x8'
    | 'dot-diffusion-mese-16x16'
    | 'dot-diffusion-guo-liu-8x8'
    | 'dot-diffusion-guo-liu-16x16'
    | 'dot-diffusion-spiral'
    | 'dot-diffusion-inverted-spiral'
    // Dot Lippens
    | 'dot-lippens-li1'
    | 'dot-lippens-li2'
    | 'dot-lippens-li3'
    | 'dot-lippens-guo'
    | 'dot-lippens-mese'
    | 'dot-lippens-knuth'
    // Variable Error Diffusion
    | 'variable-ostromoukhov'
    | 'variable-zhou-fang'
    // Other
    | 'threshold'
    | 'dbs'
    | 'grid'
    | 'kacker-allebach';

/**
 * Color dithering algorithm identifiers
 */
export type ColorAlgorithm =
    | 'floyd-steinberg-color'
    | 'jarvis-judice-ninke-color'
    | 'stucki-color'
    | 'burkes-color'
    | 'sierra3-color'
    | 'sierra2-color'
    | 'sierra-lite-color'
    | 'atkinson-color'
    | 'ordered-bayer8-color'
    | 'ordered-blue-noise-color'
    | 'riemersma-hilbert-color'
    | 'threshold-color';

/**
 * All dithering algorithms (mono + color)
 */
export type Algorithm = MonoAlgorithm | ColorAlgorithm;

/**
 * Algorithm category for UI organization
 */
export type AlgorithmCategory =
    | 'Error Diffusion'
    | 'Ordered'
    | 'Riemersma'
    | 'Pattern'
    | 'Dot Diffusion'
    | 'Dot Lippens'
    | 'Variable Error Diffusion'
    | 'Other';

/**
 * Algorithm metadata for registry
 */
export interface AlgorithmInfo {
    id: Algorithm;
    name: string;
    category: AlgorithmCategory;
    description?: string;
    isColor?: boolean;
}

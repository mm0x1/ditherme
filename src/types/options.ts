/**
 * Base options available for most algorithms
 */
export interface BaseOptions {
    serpentine?: boolean;  // Alternate scan direction each row
}

/**
 * Options for ordered dithering algorithms
 */
export interface OrderedOptions extends BaseOptions {
    jitter?: number;       // 0.0 - 1.0, add randomness to threshold
    matrixSize?: number;   // Override matrix size
    step?: number;         // For variable matrices
}

/**
 * Options for threshold dithering
 */
export interface ThresholdOptions extends BaseOptions {
    threshold?: number;    // 0.0 - 1.0, default 0.5
    auto?: boolean;        // Calculate optimal threshold
    noise?: number;        // 0.0 - 1.0, add noise before threshold
}

/**
 * Options for DBS (Direct Binary Search)
 */
export interface DBSOptions extends BaseOptions {
    formula?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;  // Optimization formula
    maxIterations?: number;  // Iteration limit for performance
}

/**
 * Options for grid dithering
 */
export interface GridOptions extends BaseOptions {
    gridWidth?: number;       // Block width in pixels
    gridHeight?: number;      // Block height in pixels
    minPixels?: number;       // Threshold for block
    alternativeMode?: boolean;
}

/**
 * Options for Riemersma dithering
 */
export interface RiemersmaOptions extends BaseOptions {
    modified?: boolean;  // Use modified algorithm
}

/**
 * Options for interleaved gradient noise
 */
export interface InterleavedGradientOptions extends BaseOptions {
    a?: number;  // Parameter a
    b?: number;  // Parameter b
    c?: number;  // Parameter c
}

/**
 * Options for Kacker-Allebach
 */
export interface KackerAllebachOptions extends BaseOptions {
    randomize?: boolean;
}

/**
 * Union of all algorithm-specific options
 */
export type AlgorithmOptions =
    | BaseOptions
    | OrderedOptions
    | ThresholdOptions
    | DBSOptions
    | GridOptions
    | RiemersmaOptions
    | InterleavedGradientOptions
    | KackerAllebachOptions;

/**
 * Type guard helpers
 */
export function isOrderedOptions(opts: AlgorithmOptions): opts is OrderedOptions {
    return 'jitter' in opts || 'matrixSize' in opts || 'step' in opts;
}

export function isThresholdOptions(opts: AlgorithmOptions): opts is ThresholdOptions {
    return 'threshold' in opts || 'auto' in opts || 'noise' in opts;
}

export function isDBSOptions(opts: AlgorithmOptions): opts is DBSOptions {
    return 'formula' in opts || 'maxIterations' in opts;
}

export function isGridOptions(opts: AlgorithmOptions): opts is GridOptions {
    return 'gridWidth' in opts || 'gridHeight' in opts || 'minPixels' in opts;
}

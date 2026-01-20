import type { Algorithm } from './algorithms.ts';
import type { AlgorithmOptions } from './options.ts';
import type { Palette, ColorMatchMethod, QuantizationMethod } from './palette.ts';

/**
 * Image adjustment parameters
 */
export interface ImageAdjustments {
    brightness: number;    // -100 to 100
    contrast: number;      // -100 to 100
    gamma: number;         // 0.1 to 3.0
    saturation?: number;   // -100 to 100 (color mode only)
    blackPoint: number;    // 0-50, pixels below this luminance become black (0 = disabled)
    whitePoint: number;    // 205-255, pixels above this luminance become white (255 = disabled)
}

/**
 * Dithering mode
 */
export type DitherMode = 'mono' | 'color';

/**
 * Application state
 */
export interface AppState {
    // Images
    sourceImage: ImageData | null;
    ditheredImage: ImageData | null;
    originalFileName: string | null;

    // Algorithm
    mode: DitherMode;
    algorithm: Algorithm;
    options: AlgorithmOptions;

    // Palette
    palette: Palette;
    customPalette: Palette | null;  // User-defined custom palette
    colorMatch: ColorMatchMethod;
    quantization: QuantizationMethod;

    // Dither Settings
    pixelScale: number;  // 1-16, block size for dithering (1 = normal, 4 = 4x4 blocks)
    levels: number;      // 2-256, number of colors to use from palette (posterization)

    // Adjustments
    adjustments: ImageAdjustments;

    // Video
    videoFrames: ImageData[] | null;
    currentFrame: number;
    isProcessingVideo: boolean;

    // UI State
    zoom: number;
    panX: number;
    panY: number;
    showOriginal: boolean;

    // Processing
    isProcessing: boolean;
    processingProgress: number;
}

/**
 * Partial state update type
 */
export type StateUpdate = Partial<AppState>;

/**
 * State change event detail
 */
export interface StateChangeDetail {
    oldState: AppState;
    newState: AppState;
    changes: StateUpdate;
}

/**
 * Default image adjustments
 */
export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    saturation: 0,
    blackPoint: 0,    // 0 = disabled
    whitePoint: 255   // 255 = disabled
};

/**
 * Default mono palette (black and white)
 */
export const DEFAULT_MONO_PALETTE: Palette = {
    name: 'Mono',
    colors: [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
    ]
};

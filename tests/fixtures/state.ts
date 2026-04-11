import type { AppState, ImageAdjustments } from '../../src/types/state.ts';
import { BLACK_WHITE } from './palettes.ts';

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    saturation: 0,
    blackPoint: 0,
    whitePoint: 255,
};

export function createMockState(overrides: Partial<AppState> = {}): AppState {
    return {
        sourceImage: null,
        ditheredImage: null,
        originalFileName: null,
        mode: 'mono',
        algorithm: 'floyd-steinberg',
        palette: BLACK_WHITE,
        customPalette: null,
        options: {},
        colorMatch: 'euclidean',
        quantization: 'median-cut',
        pixelScale: 1,
        levels: 0,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        videoFile: null,
        videoMetadata: null,
        currentFrame: 0,
        isVideoMode: false,
        isPlaying: false,
        playbackSpeed: 1,
        isProcessingVideo: false,
        zoom: 1,
        panX: 0,
        panY: 0,
        showOriginal: false,
        postEffect: 'none',
        effectColor: '#ffffff',
        layer2Adjustments: { ...DEFAULT_ADJUSTMENTS },
        imageEffect: 'none',
        imageEffectParams: {
            intensity: 0.5,
            radius: 10,
            color: '#ffffff',
            amount: 1,
            threshold: 0.5,
        },
        isProcessing: false,
        processingProgress: 0,
        ...overrides,
    };
}

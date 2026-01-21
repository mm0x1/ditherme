/**
 * Video engine module
 * Re-exports all video-related functionality
 */

// Types
export type {
    VideoMetadata,
    VideoFrame,
    DitheredFrame,
    VideoExportOptions,
    VideoExportFormat,
    VideoProcessingProgress,
    VideoProcessingStage,
    VideoCapability,
    FrameExtractor,
    VideoEncoderInterface,
    FrameCacheOptions,
    ProgressCallback,
} from '../../types/video.ts';

export {
    SUPPORTED_VIDEO_TYPES,
    isSupportedVideoType,
    MAX_VIDEO_DURATION,
    MAX_VIDEO_DIMENSION,
} from '../../types/video.ts';

// Capability detection
export {
    hasWebCodecsSupport,
    hasOffscreenCanvas,
    detectVideoCapability,
    getVideoCapability,
    isDecoderSupported,
    isEncoderSupported,
    shouldUseWebCodecs,
} from './capability.ts';

// Frame cache
export {
    FrameCache,
    createFrameCache,
    computeSettingsHash,
} from './frame-cache.ts';

// Frame extraction
export {
    createExtractor,
    WebCodecsExtractor,
    FFmpegExtractor,
} from './extractor.ts';

// Video encoding
export {
    createEncoder,
    WebCodecsEncoderWrapper,
    FFmpegEncoderWrapper,
    type VideoEncoderWrapper,
} from './encoder.ts';

// Video manager
export {
    VideoManager,
    getVideoManager,
    cleanupVideoManager,
} from './video-manager.ts';

/**
 * Initialize the video engine
 * Detects capabilities and warms up resources
 */
export async function initVideoEngine(): Promise<void> {
    const { getVideoCapability } = await import('./capability.ts');
    const capability = await getVideoCapability();
    console.log(`[Video Engine] Initialized with capability: ${capability}`);
}

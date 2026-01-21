/**
 * Video processing types for ditherme
 */

/**
 * Video metadata extracted from source file
 */
export interface VideoMetadata {
    width: number;
    height: number;
    duration: number;        // seconds
    frameRate: number;       // fps
    frameCount: number;      // total frames
    codec: string;           // e.g., 'avc1', 'vp9'
    container: string;       // e.g., 'mp4', 'webm'
}

/**
 * A single video frame with its data
 */
export interface VideoFrame {
    index: number;
    timestamp: number;       // milliseconds
    imageData: ImageData;
}

/**
 * A dithered frame with cache metadata
 */
export interface DitheredFrame {
    index: number;
    timestamp: number;       // milliseconds
    imageData: ImageData;
    settingsHash: string;    // for cache invalidation
}

/**
 * Export format options
 */
export type VideoExportFormat = 'mp4' | 'webm' | 'gif';

/**
 * Video export configuration
 */
export interface VideoExportOptions {
    format: VideoExportFormat;
    quality: number;         // 1-100
    frameRate: number;       // output fps (can differ from source)
    width?: number;          // optional resize (maintains aspect ratio)
    height?: number;
}

/**
 * Processing stage for progress reporting
 */
export type VideoProcessingStage = 'loading' | 'extracting' | 'dithering' | 'encoding' | 'finalizing';

/**
 * Progress information during video processing
 */
export interface VideoProcessingProgress {
    stage: VideoProcessingStage;
    currentFrame: number;
    totalFrames: number;
    percentage: number;      // 0-100
    estimatedTimeRemaining?: number;  // milliseconds
}

/**
 * Video capability level
 */
export type VideoCapability = 'webcodecs' | 'ffmpeg' | 'none';

/**
 * Frame extraction interface (implemented by WebCodecs and FFmpeg backends)
 */
export interface FrameExtractor {
    open(file: File): Promise<VideoMetadata>;
    getFrame(index: number): Promise<VideoFrame>;
    getFrameRange(start: number, end: number): AsyncGenerator<VideoFrame, void, unknown>;
    seekToFrame(index: number): Promise<void>;
    close(): void;
}

/**
 * Video encoding interface (implemented by WebCodecs and FFmpeg backends)
 */
export interface VideoEncoderInterface {
    configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void>;
    addFrame(frame: ImageData, timestamp: number): Promise<void>;
    finalize(): Promise<Blob>;
    abort(): void;
    onProgress?: (percentage: number) => void;
}

/**
 * Frame cache options
 */
export interface FrameCacheOptions {
    maxFrames: number;       // LRU limit
    maxMemoryMB: number;     // Memory budget
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: VideoProcessingProgress) => void;

/**
 * Supported video MIME types
 */
export const SUPPORTED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',   // MOV
    'video/x-msvideo',   // AVI
    'video/ogg',
] as const;

/**
 * Check if a MIME type is a supported video type
 */
export function isSupportedVideoType(mimeType: string): boolean {
    return SUPPORTED_VIDEO_TYPES.includes(mimeType as typeof SUPPORTED_VIDEO_TYPES[number]);
}

/**
 * Maximum video duration in seconds
 */
export const MAX_VIDEO_DURATION = 30;

/**
 * Maximum video dimension (width or height)
 */
export const MAX_VIDEO_DIMENSION = 1920;

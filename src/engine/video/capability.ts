/**
 * Video capability detection
 * Determines whether to use WebCodecs (modern browsers) or FFmpeg.wasm (fallback)
 */

import type { VideoCapability } from '../../types/video.ts';

/**
 * Check if WebCodecs API is available
 */
export function hasWebCodecsSupport(): boolean {
    return (
        typeof VideoDecoder !== 'undefined' &&
        typeof VideoEncoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined'
    );
}

/**
 * Check if OffscreenCanvas is available (needed for worker-based rendering)
 */
export function hasOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Check if a specific video codec is supported for decoding
 */
export async function isDecoderSupported(codec: string): Promise<boolean> {
    if (!hasWebCodecsSupport()) return false;

    try {
        const support = await VideoDecoder.isConfigSupported({
            codec,
            codedWidth: 1920,
            codedHeight: 1080,
        });
        return support.supported === true;
    } catch {
        return false;
    }
}

/**
 * Check if a specific video codec is supported for encoding
 */
export async function isEncoderSupported(codec: string): Promise<boolean> {
    if (!hasWebCodecsSupport()) return false;

    try {
        const support = await VideoEncoder.isConfigSupported({
            codec,
            width: 1920,
            height: 1080,
            bitrate: 5_000_000,
            framerate: 30,
        });
        return support.supported === true;
    } catch {
        return false;
    }
}

/**
 * Check common codec support for decoding
 */
export async function checkDecoderCodecs(): Promise<Record<string, boolean>> {
    const codecs = [
        'avc1.42E01E',  // H.264 Baseline
        'avc1.4D401E',  // H.264 Main
        'avc1.64001E',  // H.264 High
        'vp8',          // VP8
        'vp09.00.10.08', // VP9
    ];

    const results: Record<string, boolean> = {};
    for (const codec of codecs) {
        results[codec] = await isDecoderSupported(codec);
    }
    return results;
}

/**
 * Check common codec support for encoding
 */
export async function checkEncoderCodecs(): Promise<Record<string, boolean>> {
    const codecs = [
        'avc1.42E01E',   // H.264 Baseline
        'avc1.4D401E',   // H.264 Main
        'vp8',           // VP8
        'vp09.00.10.08', // VP9
    ];

    const results: Record<string, boolean> = {};
    for (const codec of codecs) {
        results[codec] = await isEncoderSupported(codec);
    }
    return results;
}

/**
 * Detect the best available video capability
 */
export async function detectVideoCapability(): Promise<VideoCapability> {
    // Check for WebCodecs support
    if (hasWebCodecsSupport()) {
        // Verify at least one common codec works
        const h264Supported = await isDecoderSupported('avc1.42E01E');
        const vp9Supported = await isDecoderSupported('vp09.00.10.08');

        if (h264Supported || vp9Supported) {
            return 'webcodecs';
        }
    }

    // FFmpeg.wasm is always available as a fallback
    // (loaded on demand when needed)
    return 'ffmpeg';
}

// Cache the detected capability
let cachedCapability: VideoCapability | null = null;

/**
 * Get the video capability (cached)
 */
export async function getVideoCapability(): Promise<VideoCapability> {
    if (cachedCapability === null) {
        cachedCapability = await detectVideoCapability();
        console.log(`[Video] Detected capability: ${cachedCapability}`);
    }
    return cachedCapability;
}

/**
 * Check if we should use WebCodecs for a specific format
 */
export function shouldUseWebCodecs(format: 'mp4' | 'webm' | 'gif'): boolean {
    // GIF always uses FFmpeg
    if (format === 'gif') return false;

    // MP4 and WebM can use WebCodecs if available
    return cachedCapability === 'webcodecs';
}

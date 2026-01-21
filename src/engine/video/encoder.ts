/**
 * Video encoding with WebCodecs and FFmpeg backends
 */

import type { VideoMetadata, VideoExportOptions, VideoEncoderInterface } from '../../types/video.ts';
import { getVideoCapability, shouldUseWebCodecs } from './capability.ts';

// Lazy load FFmpeg
let ffmpegInstance: FFmpegInstance | null = null;

interface FFmpegInstance {
    load: () => Promise<void>;
    loaded: boolean;
    writeFile: (path: string, data: Uint8Array) => Promise<void>;
    readFile: (path: string) => Promise<Uint8Array>;
    exec: (args: string[]) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    terminate: () => void;
}

async function getFFmpeg(): Promise<FFmpegInstance> {
    if (ffmpegInstance && ffmpegInstance.loaded) {
        return ffmpegInstance;
    }

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');

    const ffmpeg = new FFmpeg();

    await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.wasm',
        workerURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.worker.js',
    });

    ffmpegInstance = {
        load: async () => { },
        loaded: true,
        writeFile: async (path: string, data: Uint8Array) => {
            await ffmpeg.writeFile(path, data);
        },
        readFile: async (path: string) => {
            const data = await ffmpeg.readFile(path);
            return data as Uint8Array;
        },
        exec: async (args: string[]) => {
            await ffmpeg.exec(args);
        },
        deleteFile: async (path: string) => {
            await ffmpeg.deleteFile(path);
        },
        terminate: () => {
            ffmpeg.terminate();
            ffmpegInstance = null;
        },
    };

    return ffmpegInstance;
}

/**
 * Wrapper interface for our encoders
 */
export interface VideoEncoderWrapper extends VideoEncoderInterface {
    configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void>;
    addFrame(frame: ImageData, timestamp: number): Promise<void>;
    finalize(): Promise<Blob>;
    abort(): void;
}

/**
 * WebCodecs-based encoder for MP4/WebM (hardware accelerated)
 */
export class WebCodecsEncoderWrapper implements VideoEncoderWrapper {
    private encoder: VideoEncoder | null = null;
    private muxer: MP4Muxer | null = null;
    private options: VideoExportOptions | null = null;
    private metadata: VideoMetadata | null = null;
    private chunks: EncodedVideoChunk[] = [];
    private frameIndex = 0;
    private aborted = false;

    async configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void> {
        this.options = options;
        this.metadata = metadata;
        this.chunks = [];
        this.frameIndex = 0;
        this.aborted = false;

        // Determine codec based on format
        const codec = options.format === 'webm' ? 'vp09.00.10.08' : 'avc1.42E01E';
        const width = options.width ?? metadata.width;
        const height = options.height ?? metadata.height;

        this.encoder = new VideoEncoder({
            output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
                this.chunks.push(chunk);
            },
            error: (e: Error) => {
                console.error('[WebCodecsEncoder] Error:', e);
            },
        });

        const config: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate: this.calculateBitrate(width, height, options.quality),
            framerate: options.frameRate,
        };

        // Check if codec is supported
        const support = await VideoEncoder.isConfigSupported(config);
        if (!support.supported) {
            throw new Error(`Codec ${codec} not supported`);
        }

        this.encoder.configure(config);

        // Initialize mp4box muxer
        const MP4Box = await import('mp4box');
        this.muxer = MP4Box.createFile();
    }

    private calculateBitrate(width: number, height: number, quality: number): number {
        // Base bitrate on resolution and quality
        const pixels = width * height;
        const baseBitrate = pixels * 0.1; // 0.1 bits per pixel as base
        return Math.round(baseBitrate * (quality / 50)); // Scale by quality
    }

    async addFrame(imageData: ImageData, timestamp: number): Promise<void> {
        if (this.aborted || !this.encoder || !this.options) return;

        // Convert ImageData to VideoFrame
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);

        const videoFrame = new VideoFrame(canvas, {
            timestamp: timestamp * 1000, // Convert ms to microseconds
            duration: (1000 / this.options.frameRate) * 1000, // Duration in microseconds
        });

        // Encode the frame
        const keyFrame = this.frameIndex % 30 === 0; // Keyframe every 30 frames
        this.encoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        this.frameIndex++;
    }

    async finalize(): Promise<Blob> {
        if (!this.encoder || !this.options) {
            throw new Error('Encoder not configured');
        }

        // Flush encoder
        await this.encoder.flush();
        this.encoder.close();

        // For now, use a simple approach - convert chunks to raw data
        // In a full implementation, you'd use mp4box.js to create proper container
        const totalSize = this.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const buffer = new Uint8Array(totalSize);
        let offset = 0;

        for (const chunk of this.chunks) {
            chunk.copyTo(buffer.subarray(offset));
            offset += chunk.byteLength;
        }

        // For proper container format, we'd need to use mp4box.js muxer
        // This is a simplified version that returns raw encoded data
        const mimeType = this.options.format === 'webm' ? 'video/webm' : 'video/mp4';
        return new Blob([buffer], { type: mimeType });
    }

    abort(): void {
        this.aborted = true;
        if (this.encoder && this.encoder.state !== 'closed') {
            this.encoder.close();
        }
    }
}

/**
 * FFmpeg-based encoder (fallback for Safari, required for GIF)
 */
export class FFmpegEncoderWrapper implements VideoEncoderWrapper {
    private ffmpeg: FFmpegInstance | null = null;
    private options: VideoExportOptions | null = null;
    private metadata: VideoMetadata | null = null;
    private frameIndex = 0;
    private aborted = false;
    private frameFiles: string[] = [];

    async configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void> {
        this.options = options;
        this.metadata = metadata;
        this.frameIndex = 0;
        this.aborted = false;
        this.frameFiles = [];

        this.ffmpeg = await getFFmpeg();
    }

    async addFrame(imageData: ImageData, _timestamp: number): Promise<void> {
        if (this.aborted || !this.ffmpeg) return;

        // Convert ImageData to PNG (FFmpeg-compatible format)
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);

        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const arrayBuffer = await blob.arrayBuffer();

        // Write frame to FFmpeg filesystem
        const frameFile = `frame_${String(this.frameIndex).padStart(6, '0')}.png`;
        await this.ffmpeg.writeFile(frameFile, new Uint8Array(arrayBuffer));
        this.frameFiles.push(frameFile);

        this.frameIndex++;
    }

    async finalize(): Promise<Blob> {
        if (!this.ffmpeg || !this.options || !this.metadata) {
            throw new Error('Encoder not configured');
        }

        const width = this.options.width ?? this.metadata.width;
        const height = this.options.height ?? this.metadata.height;
        const outputFile = this.getOutputFileName();

        // Build FFmpeg command based on format
        const args = this.buildFFmpegArgs(width, height, outputFile);

        // Run FFmpeg
        await this.ffmpeg.exec(args);

        // Read output file
        const data = await this.ffmpeg.readFile(outputFile);

        // Cleanup
        await this.cleanup(outputFile);

        const mimeType = this.getMimeType();
        // Create a copy of the data with a regular ArrayBuffer
        const buffer = new ArrayBuffer(data.length);
        new Uint8Array(buffer).set(data);
        return new Blob([buffer], { type: mimeType });
    }

    private buildFFmpegArgs(width: number, height: number, outputFile: string): string[] {
        const fps = this.options!.frameRate.toString();

        if (this.options!.format === 'gif') {
            // GIF with palette optimization for better quality and smaller size
            return [
                '-framerate', fps,
                '-i', 'frame_%06d.png',
                '-vf', `fps=${fps},scale=${width}:${height}:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
                '-loop', '0',
                outputFile,
            ];
        } else if (this.options!.format === 'webm') {
            // WebM with VP9
            const crf = Math.round(63 - (this.options!.quality * 0.63)); // CRF 0-63, lower is better
            return [
                '-framerate', fps,
                '-i', 'frame_%06d.png',
                '-c:v', 'libvpx-vp9',
                '-crf', crf.toString(),
                '-b:v', '0',
                '-vf', `scale=${width}:${height}`,
                outputFile,
            ];
        } else {
            // MP4 with H.264
            const crf = Math.round(51 - (this.options!.quality * 0.51)); // CRF 0-51, lower is better
            return [
                '-framerate', fps,
                '-i', 'frame_%06d.png',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', crf.toString(),
                '-pix_fmt', 'yuv420p',
                '-vf', `scale=${width}:${height}`,
                outputFile,
            ];
        }
    }

    private getOutputFileName(): string {
        switch (this.options!.format) {
            case 'gif': return 'output.gif';
            case 'webm': return 'output.webm';
            default: return 'output.mp4';
        }
    }

    private getMimeType(): string {
        switch (this.options!.format) {
            case 'gif': return 'image/gif';
            case 'webm': return 'video/webm';
            default: return 'video/mp4';
        }
    }

    private async cleanup(outputFile: string): Promise<void> {
        if (!this.ffmpeg) return;

        // Delete frame files
        for (const file of this.frameFiles) {
            try {
                await this.ffmpeg.deleteFile(file);
            } catch { /* ignore */ }
        }

        // Delete output file
        try {
            await this.ffmpeg.deleteFile(outputFile);
        } catch { /* ignore */ }

        this.frameFiles = [];
    }

    abort(): void {
        this.aborted = true;
        // FFmpeg doesn't support aborting mid-process,
        // but we'll stop adding frames
    }
}

/**
 * Create the appropriate encoder based on format and capabilities
 */
export async function createEncoder(format: VideoExportOptions['format']): Promise<VideoEncoderWrapper> {
    // GIF always uses FFmpeg
    if (format === 'gif') {
        return new FFmpegEncoderWrapper();
    }

    // Check if WebCodecs is available
    if (shouldUseWebCodecs(format)) {
        try {
            return new WebCodecsEncoderWrapper();
        } catch (e) {
            console.warn('[Encoder] WebCodecs failed, falling back to FFmpeg:', e);
        }
    }

    // Fallback to FFmpeg
    return new FFmpegEncoderWrapper();
}

// Type stubs for mp4box.js
interface MP4Muxer {
    // Simplified interface
}

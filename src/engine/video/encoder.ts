/**
 * Video encoding with WebCodecs and FFmpeg backends
 */

import type { VideoMetadata, VideoExportOptions, VideoEncoderInterface } from '../../types/video.ts';
import { shouldUseWebCodecs } from './capability.ts';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';

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
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();

    // Use single-threaded core (no SharedArrayBuffer / COOP+COEP headers required).
    // Load via blob URLs so the WASM is fetched with correct MIME types.
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

    await ffmpeg.load({ coreURL, wasmURL });

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

type AnyMuxer = Mp4Muxer<Mp4ArrayBufferTarget> | WebmMuxer<WebmArrayBufferTarget>;
type AnyTarget = Mp4ArrayBufferTarget | WebmArrayBufferTarget;

/**
 * WebCodecs-based encoder for MP4/WebM (hardware accelerated)
 *
 * Feeds encoded chunks directly to the muxer in the encoder's output callback.
 * Uses sequential timestamps computed from frameIndex (not source video timestamps)
 * to guarantee monotonic ordering.
 */
export class WebCodecsEncoderWrapper implements VideoEncoderWrapper {
    private encoder: VideoEncoder | null = null;
    private muxer: AnyMuxer | null = null;
    private target: AnyTarget | null = null;
    private options: VideoExportOptions | null = null;
    private _metadata: VideoMetadata | null = null;
    private frameIndex = 0;
    private aborted = false;
    private encodingError: Error | null = null;

    async configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void> {
        this.options = options;
        this._metadata = metadata;
        this.frameIndex = 0;
        this.aborted = false;
        this.encodingError = null;

        // Determine codec based on format
        // H.264 High profile (0x64=High, 0x00=no constraints, 0x1E=level 3.0)
        // for CABAC entropy coding and 8x8 transforms — much better quality than Baseline
        const codec = options.format === 'webm' ? 'vp09.00.10.08' : 'avc1.64001E';
        const width = options.width ?? metadata.width;
        const height = options.height ?? metadata.height;

        // Create the appropriate muxer
        if (options.format === 'webm') {
            const target = new WebmArrayBufferTarget();
            this.target = target;
            this.muxer = new WebmMuxer({
                target,
                video: {
                    codec: 'V_VP9',
                    width,
                    height,
                    frameRate: options.frameRate,
                },
                firstTimestampBehavior: 'offset',
            });
        } else {
            const target = new Mp4ArrayBufferTarget();
            this.target = target;
            this.muxer = new Mp4Muxer({
                target,
                video: {
                    codec: 'avc',
                    width,
                    height,
                    frameRate: options.frameRate,
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });
        }

        // Feed encoded chunks directly to the muxer as they arrive.
        // The muxer libraries handle ordering internally.
        const muxer = this.muxer;

        let chunkIndex = 0;
        this.encoder = new VideoEncoder({
            output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
                console.log(`[Encoder] Chunk ${chunkIndex++}: type=${chunk.type}, timestamp=${chunk.timestamp}µs, duration=${chunk.duration}µs, size=${chunk.byteLength}`);
                muxer.addVideoChunk(chunk, meta);
            },
            error: (e: Error) => {
                this.encodingError = e;
                console.error('[WebCodecsEncoder] Error:', e);
            },
        });

        const bitrate = this.calculateBitrate(width, height, options.quality);
        const config: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate,
            framerate: options.frameRate,
            latencyMode: 'realtime',
        };

        console.log(`[Encoder] Config: codec=${codec}, ${width}x${height}, bitrate=${(bitrate/1_000_000).toFixed(2)}Mbps, fps=${options.frameRate}, quality=${options.quality}`);

        // Check if codec is supported
        const support = await VideoEncoder.isConfigSupported(config);
        if (!support.supported) {
            throw new Error(`Codec ${codec} not supported`);
        }

        this.encoder.configure(config);
    }

    private calculateBitrate(width: number, height: number, quality: number): number {
        // Dithered content has high-frequency spatial detail (dot patterns) that
        // H.264 struggles to compress — needs significantly more bitrate than
        // natural video to avoid quality degradation between keyframes.
        // At quality=100: ~24 Mbps for 1080p, ~10.5 Mbps for 720p
        // At quality=50:  ~12 Mbps for 1080p, ~5.25 Mbps for 720p
        const pixels = width * height;
        const referencePixels = 1920 * 1080;
        const baseBitrate = 24_000_000 * (pixels / referencePixels);
        const qualityMultiplier = 0.5 + (quality / 100) * 0.5; // 0.5x at q=0, 1.0x at q=100
        return Math.round(Math.max(2_000_000, baseBitrate * qualityMultiplier));
    }

    async addFrame(imageData: ImageData, _timestamp: number): Promise<void> {
        if (this.aborted || !this.encoder || !this.options) return;

        if (this.encodingError) {
            throw this.encodingError;
        }

        // Convert ImageData to VideoFrame
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);

        // Use sequential timestamps based on frame index and output frame rate.
        // Source video timestamps can be non-uniform or duplicated; computing
        // our own guarantees monotonically increasing values.
        const frameDurationUs = (1_000_000 / this.options.frameRate);
        const timestampUs = Math.round(this.frameIndex * frameDurationUs);

        const videoFrame = new VideoFrame(canvas, {
            timestamp: timestampUs,
            duration: Math.round(frameDurationUs),
        });

        // Encode the frame — flush after each to ensure the output callback fires
        // before the next frame, keeping chunks in presentation order for the muxer.
        // Keyframe every 15 frames — dithered patterns change unpredictably between
        // frames so frequent keyframes prevent progressive quality degradation.
        const keyFrame = this.frameIndex % 15 === 0;
        this.encoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        // Flush ensures the encoded chunk is delivered to the muxer before we
        // encode the next frame. This prevents out-of-order delivery.
        await this.encoder.flush();

        this.frameIndex++;
    }

    async finalize(): Promise<Blob> {
        if (!this.encoder || !this.options || !this.muxer || !this.target) {
            throw new Error('Encoder not configured');
        }

        if (this.encodingError) {
            throw this.encodingError;
        }

        // Flush encoder to process any remaining frames
        await this.encoder.flush();
        this.encoder.close();

        if (this.encodingError) {
            throw this.encodingError;
        }

        // Finalize the muxer to produce proper container format
        this.muxer.finalize();

        const mimeType = this.options.format === 'webm' ? 'video/webm' : 'video/mp4';
        return new Blob([this.target.buffer], { type: mimeType });
    }

    abort(): void {
        this.aborted = true;
        if (this.encoder && this.encoder.state !== 'closed') {
            this.encoder.close();
        }
        this.muxer = null;
        this.target = null;
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
        try {
            await this.ffmpeg.exec(args);
        } catch (e) {
            await this.cleanup(outputFile);
            throw new Error(`FFmpeg encoding failed: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Read output file
        let data: Uint8Array;
        try {
            data = await this.ffmpeg.readFile(outputFile);
        } catch (e) {
            await this.cleanup(outputFile);
            throw new Error(`Failed to read FFmpeg output: ${e instanceof Error ? e.message : String(e)}`);
        }

        if (data.length === 0) {
            await this.cleanup(outputFile);
            throw new Error('FFmpeg produced empty output');
        }

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
                '-y',
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
                '-y',
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
                '-y',
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

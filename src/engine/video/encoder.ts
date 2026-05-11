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
    // Vite mangles @ffmpeg/ffmpeg's internal worker URL during dep pre-bundling
    // (NS_ERROR_CORRUPTED_CONTENT / wrong MIME). Importing the worker file with
    // `?worker&url` produces a stable URL we can hand to ffmpeg.load() via
    // classWorkerURL, bypassing the pre-bundling.
    const workerURL = (await import('@ffmpeg/ffmpeg/worker?worker&url')).default;

    const ffmpeg = new FFmpeg();

    // Single-threaded core (no SharedArrayBuffer / COOP+COEP headers required).
    // Vite serves @ffmpeg/ffmpeg's worker as a module worker, which cannot use
    // importScripts — it must dynamic-`import()` the core. That requires the
    // ESM build of @ffmpeg/core, not the UMD one. Load via blob URLs to keep
    // MIME types correct across CDN/CORS quirks.
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

    await ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL });

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
 * Pass an MP4 Blob through ffmpeg.wasm with `-c copy` and the h264_metadata
 * bitstream filter to rewrite the SPS. No re-encode, no quality loss. Fixes
 * the Resolve-incompatible SPS that Chromium's WebCodecs encoder emits
 * (num_reorder_frames=2 with no B-frames, occasional duplicate sps_id=1).
 */
async function remuxMp4ForCompatibility(input: Blob): Promise<Blob> {
    const ffmpeg = await getFFmpeg();
    const inputName = `webcodecs_${Date.now()}.mp4`;
    const outputName = `remuxed_${Date.now()}.mp4`;

    const inputBytes = new Uint8Array(await input.arrayBuffer());
    await ffmpeg.writeFile(inputName, inputBytes);

    try {
        // Re-encode through libx264 to guarantee Resolve-compatible SPS. We
        // tried `-c copy -bsf:v h264_metadata=...` first, but the default
        // @ffmpeg/core build doesn't ship the h264_metadata bitstream filter.
        // -preset ultrafast keeps the time cost ~1s for typical short clips.
        // -bf 0 forces zero B-frames so the SPS will encode num_reorder_frames=0.
        await ffmpeg.exec([
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            '-bf', '0',
            '-movflags', '+faststart',
            '-y',
            outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        if (data.length === 0) {
            throw new Error('FFmpeg remux produced empty output');
        }

        const buffer = new ArrayBuffer(data.length);
        new Uint8Array(buffer).set(data);
        return new Blob([buffer], { type: 'video/mp4' });
    } catch (e) {
        console.warn('[Encoder] MP4 remux failed, returning raw WebCodecs output:', e);
        return input;
    } finally {
        try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    }
}

/**
 * Wrapper interface for our encoders
 */
export interface VideoEncoderWrapper extends VideoEncoderInterface {
    configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void>;
    addFrame(frame: ImageData, timestamp: number): Promise<void>;
    finalize(onRemuxStart?: () => void): Promise<Blob>;
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
    private _useQuantizer = false;

    async configure(options: VideoExportOptions, metadata: VideoMetadata): Promise<void> {
        this.options = options;
        this._metadata = metadata;
        this.frameIndex = 0;
        this.aborted = false;
        this.encodingError = null;

        const width = options.width ?? metadata.width;
        const height = options.height ?? metadata.height;

        // Determine codec based on format
        // H.264 High profile (0x64=High, 0x00=no constraints, 0x1E=level 3.0)
        // for CABAC entropy coding and 8x8 transforms — much better quality than Baseline
        // VP9 Profile 0, 8-bit, level computed from resolution:
        //   Level 3.1 (31) supports up to 1280x720 (983,040 samples)
        //   Level 4.0 (40) supports up to 2048x1080 (2,228,224 samples)
        const vp9Level = this.getVP9Level(width, height, options.frameRate);
        const codec = options.format === 'webm'
            ? `vp09.00.${vp9Level}.08`
            : 'avc1.64001E';

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
            // Intentionally omit `frameRate` here: passing it makes mp4-muxer set
            // the track timescale equal to the frame rate (e.g. 1/24), which
            // breaks sub-frame PTS precision and causes timing/seek issues in
            // strict NLEs like DaVinci Resolve. Without it, the muxer uses a
            // microsecond timescale derived from our chunk timestamps.
            this.muxer = new Mp4Muxer({
                target,
                video: {
                    codec: 'avc',
                    width,
                    height,
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
                console.debug(`[Encoder] Chunk ${chunkIndex++}: type=${chunk.type}, timestamp=${chunk.timestamp}µs, duration=${chunk.duration}µs, size=${chunk.byteLength}`);
                muxer.addVideoChunk(chunk, meta);
            },
            error: (e: Error) => {
                this.encodingError = e;
                console.error('[WebCodecsEncoder] Error:', e);
            },
        });

        // Try quantizer mode first (quality-adaptive), fall back to bitrate mode
        const qp = this.qualityToQuantizer(options.quality);
        let useQuantizer = false;

        const quantizerConfig: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrateMode: 'quantizer',
            framerate: options.frameRate,
            // 'realtime' suppresses B-frames. mp4-muxer doesn't accept a
            // compositionTimeOffset from our output callback, so any B-frame
            // would be muxed with DTS=PTS and produce a broken/short MP4.
            latencyMode: 'realtime',
            avc: { format: 'avc' },
        };

        try {
            const support = await VideoEncoder.isConfigSupported(quantizerConfig);
            if (support.supported) {
                useQuantizer = true;
            }
        } catch (e) {
            console.debug('[Encoder] Quantizer mode not supported by this browser:', e);
        }

        if (useQuantizer) {
            console.debug(`[Encoder] Config: codec=${codec}, ${width}x${height}, bitrateMode=quantizer, qp=${qp}, fps=${options.frameRate}, quality=${options.quality}`);
            this.encoder.configure(quantizerConfig);
        } else {
            // Fallback: high bitrate VBR mode
            const bitrate = this.calculateFallbackBitrate(width, height, options.quality);
            const config: VideoEncoderConfig = {
                codec,
                width,
                height,
                bitrate,
                framerate: options.frameRate,
                latencyMode: 'realtime',
                avc: { format: 'avc' },
            };

            const support = await VideoEncoder.isConfigSupported(config);
            if (!support.supported) {
                throw new Error(`Codec ${codec} not supported`);
            }

            console.debug(`[Encoder] Config (fallback): codec=${codec}, ${width}x${height}, bitrate=${(bitrate/1_000_000).toFixed(2)}Mbps, fps=${options.frameRate}, quality=${options.quality}`);
            this.encoder.configure(config);
        }

        this._useQuantizer = useQuantizer;
    }

    /**
     * Map UI quality (0-100) to codec-native quantizer parameter.
     * Lower QP = higher quality = larger file.
     * H.264 QP range: 0-51; VP9 QP range: 0-63 (effective).
     */
    private qualityToQuantizer(quality: number): number {
        if (this.options?.format === 'webm') {
            // VP9: QP 0-63, lower = better
            // quality 100 → QP 10 (near-lossless), quality 0 → QP 55
            return Math.round(55 - (quality / 100) * 45);
        }
        // H.264: QP 0-51, lower = better
        // quality 100 → QP 10 (near-lossless), quality 0 → QP 48
        return Math.round(48 - (quality / 100) * 38);
    }

    /**
     * Fallback bitrate calculation when quantizer mode is not supported.
     * Uses generous bitrate for dithered content.
     */
    private calculateFallbackBitrate(width: number, height: number, quality: number): number {
        const pixels = width * height;
        const referencePixels = 1920 * 1080;
        const baseBitrate = 24_000_000 * (pixels / referencePixels);
        const qualityMultiplier = 0.5 + (quality / 100) * 0.5;
        return Math.round(Math.max(2_000_000, baseBitrate * qualityMultiplier));
    }

    /**
     * Determine VP9 level based on resolution and frame rate.
     * Returns a two-digit string for the codec string (e.g., "31" for Level 3.1).
     */
    private getVP9Level(width: number, height: number, fps: number): string {
        const samples = width * height;
        const sampleRate = samples * fps;

        // VP9 levels: [level string, max samples/frame, max samples/sec]
        const levels: [string, number, number][] = [
            ['10', 36_864, 829_440],
            ['20', 245_760, 3_686_400],
            ['21', 245_760, 7_372_800],
            ['30', 552_960, 18_432_000],
            ['31', 983_040, 36_864_000],
            ['40', 2_228_224, 83_558_400],
            ['41', 2_228_224, 160_432_128],
            ['50', 8_912_896, 311_951_360],
            ['51', 8_912_896, 588_251_136],
        ];

        for (const [level, maxSamples, maxRate] of levels) {
            if (samples <= maxSamples && sampleRate <= maxRate) {
                return level;
            }
        }
        return '51'; // fallback to highest
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

        // Keyframe every 15 frames — dithered patterns change unpredictably
        // between frames so frequent keyframes prevent progressive quality
        // degradation.
        const keyFrame = this.frameIndex % 15 === 0;
        if (this._useQuantizer) {
            const quantizer = this.qualityToQuantizer(this.options.quality);
            // Quantizer must be nested under codec-specific key per the WebCodecs
            // codec registration specs (e.g., VideoEncoderEncodeOptionsForAvc)
            const encodeOptions: Record<string, unknown> = { keyFrame };
            if (this.options.format === 'webm') {
                encodeOptions.vp9 = { quantizer };
            } else {
                encodeOptions.avc = { quantizer };
            }
            this.encoder.encode(videoFrame, encodeOptions as VideoEncoderEncodeOptions);
        } else {
            this.encoder.encode(videoFrame, { keyFrame });
        }
        videoFrame.close();

        // Per-frame flush acts as backpressure: WebCodecs in realtime mode
        // drops frames when fed faster than its processing rate. Awaiting flush
        // gates input to the encoder's actual throughput so no frames are lost.
        await this.encoder.flush();

        this.frameIndex++;
    }

    async finalize(onRemuxStart?: () => void): Promise<Blob> {
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
        const rawBlob = new Blob([this.target.buffer], { type: mimeType });

        // MP4-only: remux through ffmpeg.wasm to normalize the H.264 SPS that
        // Chromium's WebCodecs encoder produces. Chromium emits SPS with
        // num_reorder_frames=2 (declaring B-frame reorder buffering) even when
        // no B-frames exist, and occasionally a duplicate SPS with id=1.
        // DaVinci Resolve trusts the SPS and stutters; players like VLC don't.
        // `-c copy` keeps the WebCodecs encode (no quality loss); the
        // h264_metadata bitstream filter rewrites the SPS in place.
        if (this.options.format === 'mp4') {
            onRemuxStart?.();
            return await remuxMp4ForCompatibility(rawBlob);
        }
        return rawBlob;
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

    async finalize(_onRemuxStart?: () => void): Promise<Blob> {
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
            } catch (e) { console.warn('[Encoder] Failed to delete frame file:', file, e); }
        }

        // Delete output file
        try {
            await this.ffmpeg.deleteFile(outputFile);
        } catch (e) { console.warn('[Encoder] Failed to delete output file:', outputFile, e); }

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

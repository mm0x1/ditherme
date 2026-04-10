/**
 * Video frame extraction with WebCodecs and FFmpeg backends
 */

import type { VideoMetadata, VideoFrame, FrameExtractor } from '../../types/video.ts';
import { getVideoCapability } from './capability.ts';

// Lazy load FFmpeg to avoid large initial bundle
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

/**
 * Get or create the FFmpeg instance
 */
async function getFFmpeg(): Promise<FFmpegInstance> {
    if (ffmpegInstance && ffmpegInstance.loaded) {
        return ffmpegInstance;
    }

    // Dynamic import to avoid loading FFmpeg until needed
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');

    const ffmpeg = new FFmpeg();

    // Use multi-threaded core for better performance
    await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.wasm',
        workerURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.worker.js',
    });

    ffmpegInstance = {
        load: async () => { /* already loaded */ },
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
 * WebCodecs-based frame extractor using mp4box.js for demuxing
 */
export class WebCodecsExtractor implements FrameExtractor {
    private _file: File | null = null;
    private metadata: VideoMetadata | null = null;
    private decoder: VideoDecoder | null = null;
    private mp4boxFile: MP4BoxFile | null = null;
    private mp4boxModule: MP4BoxModule | null = null;
    private samples: MP4Sample[] = [];
    private pendingFrames: Map<number, (frame: VideoFrame) => void> = new Map();
    private decodedFrames: Map<number, VideoFrame> = new Map();
    private minTimestamp = Infinity;

    async open(file: File): Promise<VideoMetadata> {
        this._file = file;
        this.samples = [];
        this.decodedFrames.clear();
        this.minTimestamp = Infinity;

        // Dynamic import mp4box
        const MP4Box = await import('mp4box');
        this.mp4boxModule = MP4Box;

        return new Promise((resolve, reject) => {
            const mp4boxFile = MP4Box.createFile();
            this.mp4boxFile = mp4boxFile;

            mp4boxFile.onReady = (info: MP4Info) => {
                const videoTrack = info.videoTracks[0];
                if (!videoTrack) {
                    reject(new Error('No video track found'));
                    return;
                }

                const frameRate = videoTrack.nb_samples / (info.duration / info.timescale);

                this.metadata = {
                    width: videoTrack.video.width,
                    height: videoTrack.video.height,
                    duration: info.duration / info.timescale,
                    frameRate: Math.round(frameRate * 100) / 100,
                    frameCount: videoTrack.nb_samples,
                    codec: videoTrack.codec,
                    container: 'mp4',
                };

                // Set up extraction
                mp4boxFile.setExtractionOptions(videoTrack.id, null, {
                    nbSamples: Infinity,
                });

                // Initialize decoder
                this.initDecoder(videoTrack);

                mp4boxFile.start();
                resolve(this.metadata);
            };

            mp4boxFile.onSamples = (_id: number, _user: unknown, samples: MP4Sample[]) => {
                this.samples.push(...samples);
                // Decode pending samples
                this.decodePendingSamples();
            };

            mp4boxFile.onError = (module: string, message: string) => {
                reject(new Error(`${module}: ${message}`));
            };

            // Read file and feed to mp4box
            this.readFileToMp4Box(file, mp4boxFile);
        });
    }

    private async readFileToMp4Box(file: File, mp4boxFile: MP4BoxFile): Promise<void> {
        const arrayBuffer = await file.arrayBuffer();
        // mp4box expects the buffer to have a fileStart property
        (arrayBuffer as ArrayBufferWithFileStart).fileStart = 0;
        mp4boxFile.appendBuffer(arrayBuffer);
        mp4boxFile.flush();
    }

    private initDecoder(track: MP4VideoTrack): void {
        this.decoder = new VideoDecoder({
            output: (frame: globalThis.VideoFrame) => {
                this.handleDecodedFrame(frame);
            },
            error: (e: Error) => {
                console.error('[WebCodecsExtractor] Decoder error:', e);
            },
        });

        // Get codec description from track
        const codecDescription = this.getCodecDescription(track);

        this.decoder.configure({
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description: codecDescription,
        });
    }

    private getCodecDescription(track: MP4VideoTrack): Uint8Array | undefined {
        // For H.264, we need the avcC box data
        // For VP9, we may not need description
        if (track.codec.startsWith('avc')) {
            // Extract avcC from trak box
            const trak = this.mp4boxFile?.getTrackById(track.id);
            if (trak) {
                const avcC = trak.mdia?.minf?.stbl?.stsd?.entries?.[0]?.avcC;
                if (avcC && this.mp4boxModule) {
                    const stream = new this.mp4boxModule.DataStream(undefined, 0, this.mp4boxModule.DataStream.BIG_ENDIAN);
                    avcC.write(stream);
                    return new Uint8Array(stream.buffer, 8); // Skip box header
                }
            }
        }
        return undefined;
    }

    private handleDecodedFrame(frame: globalThis.VideoFrame): void {
        const timestamp = frame.timestamp ?? 0;

        // Track the minimum timestamp (the first I-frame's CTS, used as base)
        if (timestamp < this.minTimestamp) {
            this.minTimestamp = timestamp;
        }

        // Compute presentation-order index from timestamp instead of using a
        // sequential counter. The WebCodecs decoder outputs frames in decode
        // order (I, P, B, B, B, ...) which differs from presentation order
        // when the source has B-frames.
        const frameDurationUs = 1_000_000 / this.metadata!.frameRate;
        const index = Math.round((timestamp - this.minTimestamp) / frameDurationUs);

        console.log(`[Extractor] Decoded frame: index=${index}, timestamp=${timestamp}µs (${(timestamp/1000).toFixed(1)}ms), size=${frame.displayWidth}x${frame.displayHeight}`);

        // Convert VideoFrame to ImageData
        const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(frame, 0, 0);
        const imageData = ctx.getImageData(0, 0, frame.displayWidth, frame.displayHeight);

        frame.close();

        const videoFrame: VideoFrame = {
            index,
            timestamp: timestamp / 1000, // Convert to ms
            imageData,
        };

        this.decodedFrames.set(index, videoFrame);

        // Resolve any pending requests for this frame
        const resolver = this.pendingFrames.get(index);
        if (resolver) {
            resolver(videoFrame);
            this.pendingFrames.delete(index);
        }
    }

    private decodePendingSamples(): void {
        if (!this.decoder) return;

        let fed = 0;
        while (this.samples.length > 0 && this.decoder.decodeQueueSize < 10) {
            const sample = this.samples.shift()!;
            const cts = sample.cts * 1_000_000 / sample.timescale;
            const dts = sample.dts !== undefined ? sample.dts * 1_000_000 / sample.timescale : 'N/A';
            console.log(`[Extractor] Feed sample: cts=${cts}µs, dts=${dts}, sync=${sample.is_sync}, size=${sample.data.byteLength}, remaining=${this.samples.length}`);
            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: cts,
                duration: sample.duration * 1_000_000 / sample.timescale,
                data: sample.data,
            });
            this.decoder.decode(chunk);
            fed++;
        }
        if (fed > 0) {
            console.log(`[Extractor] Fed ${fed} samples, decodeQueueSize=${this.decoder.decodeQueueSize}, remaining=${this.samples.length}`);
        }
    }

    async getFrame(index: number): Promise<VideoFrame> {
        // Check if already decoded
        const cached = this.decodedFrames.get(index);
        if (cached) return cached;

        // Wait for frame to be decoded
        return new Promise((resolve) => {
            this.pendingFrames.set(index, resolve);
            // Trigger more decoding
            this.decodePendingSamples();
        });
    }

    async *getFrameRange(start: number, end: number): AsyncGenerator<VideoFrame, void, unknown> {
        for (let i = start; i <= end; i++) {
            yield await this.getFrame(i);
        }
    }

    async seekToFrame(_index: number): Promise<void> {
        // For WebCodecs, we decode sequentially so this is a no-op
        // The frame will be available when getFrame is called
    }

    close(): void {
        if (this.decoder) {
            this.decoder.close();
            this.decoder = null;
        }
        this.mp4boxFile = null;
        this.mp4boxModule = null;
        this.samples = [];
        this.decodedFrames.clear();
        this.pendingFrames.clear();
        this.minTimestamp = Infinity;
        this._file = null;
        this.metadata = null;
    }
}

/**
 * FFmpeg-based frame extractor (fallback for Safari and unsupported codecs)
 */
export class FFmpegExtractor implements FrameExtractor {
    private file: File | null = null;
    private metadata: VideoMetadata | null = null;
    private ffmpeg: FFmpegInstance | null = null;
    private inputFileName = 'input.mp4';

    async open(file: File): Promise<VideoMetadata> {
        this.file = file;
        this.ffmpeg = await getFFmpeg();

        // Write file to FFmpeg virtual filesystem
        const data = new Uint8Array(await file.arrayBuffer());
        await this.ffmpeg.writeFile(this.inputFileName, data);

        // Get video metadata using ffprobe
        this.metadata = await this.probeMetadata();

        return this.metadata;
    }

    private async probeMetadata(): Promise<VideoMetadata> {
        if (!this.ffmpeg) throw new Error('FFmpeg not initialized');

        // Use FFmpeg to extract metadata
        // Write a small frame to get dimensions
        await this.ffmpeg.exec([
            '-i', this.inputFileName,
            '-vframes', '1',
            '-f', 'null',
            '-'
        ]);

        // For now, we'll use a simple approach:
        // Extract first frame and get dimensions from it
        await this.ffmpeg.exec([
            '-i', this.inputFileName,
            '-vframes', '1',
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            'probe.raw'
        ]);

        // Get video stream info by parsing FFmpeg output
        // This is a simplified approach; in production you'd parse FFmpeg's stderr
        // For now, we'll extract a frame and get dimensions from the image

        // Default to standard values if we can't detect
        return {
            width: 1920,
            height: 1080,
            duration: 30,
            frameRate: 30,
            frameCount: 900,
            codec: 'unknown',
            container: this.getContainerFromFile(this.file!),
        };
    }

    private getContainerFromFile(file: File): string {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        return ext;
    }

    async getFrame(index: number): Promise<VideoFrame> {
        if (!this.ffmpeg || !this.metadata) {
            throw new Error('Extractor not initialized');
        }

        const timestamp = index / this.metadata.frameRate;
        const outputFile = `frame_${index}.rgba`;

        // Extract single frame at specific timestamp
        await this.ffmpeg.exec([
            '-ss', timestamp.toString(),
            '-i', this.inputFileName,
            '-vframes', '1',
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            outputFile,
        ]);

        // Read the raw frame data
        const frameData = await this.ffmpeg.readFile(outputFile);
        await this.ffmpeg.deleteFile(outputFile);

        // Convert to ImageData
        const imageData = new ImageData(
            new Uint8ClampedArray(frameData.buffer as ArrayBuffer),
            this.metadata.width,
            this.metadata.height
        );

        return {
            index,
            timestamp: timestamp * 1000,
            imageData,
        };
    }

    async *getFrameRange(start: number, end: number): AsyncGenerator<VideoFrame, void, unknown> {
        for (let i = start; i <= end; i++) {
            yield await this.getFrame(i);
        }
    }

    async seekToFrame(_index: number): Promise<void> {
        // FFmpeg extracts frames directly by timestamp, no seeking needed
    }

    close(): void {
        if (this.ffmpeg) {
            try {
                // Clean up input file
                this.ffmpeg.deleteFile(this.inputFileName).catch(() => {});
            } catch {
                // Ignore cleanup errors
            }
        }
        this.file = null;
        this.metadata = null;
    }
}

/**
 * Create the appropriate frame extractor based on browser capabilities
 */
export async function createExtractor(): Promise<FrameExtractor> {
    const capability = await getVideoCapability();

    if (capability === 'webcodecs') {
        return new WebCodecsExtractor();
    }

    return new FFmpegExtractor();
}

// Type definitions for mp4box.js (not all features, just what we need)
// Using 'any' for mp4box types since the library's types don't match exactly
/* eslint-disable @typescript-eslint/no-explicit-any */
type MP4BoxFile = any;
type MP4Info = any;
type MP4VideoTrack = any;
type MP4Sample = any;
type MP4BoxModule = any;

interface ArrayBufferWithFileStart extends ArrayBuffer {
    fileStart: number;
}

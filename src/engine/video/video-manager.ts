/**
 * Video Manager - Orchestrates video loading, frame processing, and export
 */

import type { VideoMetadata, VideoFrame, DitheredFrame, VideoExportOptions, ProgressCallback, FrameExtractor } from '../../types/video.ts';
import type { AppState } from '../../types/state.ts';
import { createExtractor } from './extractor.ts';
import { FrameCache, createFrameCache, computeSettingsHash } from './frame-cache.ts';
import { createVideoWorkerPool, type WorkerPool } from '../../workers/worker-pool.ts';
import type { VideoProcessorAPI, FrameDitherSettings } from '../../workers/video-processor.worker.ts';
import { createEncoder, type VideoEncoderWrapper } from './encoder.ts';

/**
 * Source frame buffer for efficient extraction
 */
class SourceFrameBuffer {
    private buffer: Map<number, VideoFrame> = new Map();
    private readonly maxSize: number;
    private extractor: FrameExtractor | null = null;

    constructor(maxSize = 10) {
        this.maxSize = maxSize;
    }

    setExtractor(extractor: FrameExtractor): void {
        this.extractor = extractor;
        this.buffer.clear();
    }

    async getFrame(index: number): Promise<VideoFrame> {
        // Check buffer first
        if (this.buffer.has(index)) {
            return this.buffer.get(index)!;
        }

        if (!this.extractor) {
            throw new Error('Extractor not set');
        }

        // Extract frame
        const frame = await this.extractor.getFrame(index);

        // Add to buffer
        this.buffer.set(index, frame);

        // Evict if over limit (keep frames near current index)
        if (this.buffer.size > this.maxSize) {
            const keys = Array.from(this.buffer.keys()).sort((a, b) => {
                const distA = Math.abs(a - index);
                const distB = Math.abs(b - index);
                return distB - distA; // Sort furthest first
            });

            while (this.buffer.size > this.maxSize) {
                this.buffer.delete(keys.shift()!);
            }
        }

        return frame;
    }

    clear(): void {
        this.buffer.clear();
    }
}

/**
 * Video Manager handles all video processing operations
 */
export class VideoManager {
    private extractor: FrameExtractor | null = null;
    private sourceBuffer: SourceFrameBuffer;
    private frameCache: FrameCache;
    private workerPool: WorkerPool<VideoProcessorAPI> | null = null;
    private metadata: VideoMetadata | null = null;
    private file: File | null = null;
    private currentSettingsHash: string = '';
    private abortController: AbortController | null = null;

    constructor() {
        this.sourceBuffer = new SourceFrameBuffer(10);
        this.frameCache = createFrameCache({
            maxFrames: 50,
            maxMemoryMB: 500,
        });
    }

    /**
     * Load a video file
     */
    async loadVideo(file: File): Promise<VideoMetadata> {
        // Close previous video if any
        this.closeVideo();

        this.file = file;
        this.extractor = await createExtractor();
        this.metadata = await this.extractor.open(file);
        this.sourceBuffer.setExtractor(this.extractor);

        // Initialize worker pool on first load
        if (!this.workerPool) {
            this.workerPool = createVideoWorkerPool();
            // Initialize workers
            await this.workerPool.execute(worker => worker.initialize());
        }

        return this.metadata;
    }

    /**
     * Get the current video metadata
     */
    getMetadata(): VideoMetadata | null {
        return this.metadata;
    }

    /**
     * Get a source frame (not dithered)
     */
    async getSourceFrame(index: number): Promise<VideoFrame> {
        if (!this.metadata) {
            throw new Error('No video loaded');
        }

        if (index < 0 || index >= this.metadata.frameCount) {
            throw new Error(`Frame index out of range: ${index}`);
        }

        return this.sourceBuffer.getFrame(index);
    }

    /**
     * Get a dithered frame, using cache when possible
     */
    async getDitheredFrame(index: number, state: AppState): Promise<DitheredFrame> {
        if (!this.metadata || !this.workerPool) {
            throw new Error('No video loaded');
        }

        const settingsHash = computeSettingsHash(state);

        // Check cache
        const cached = this.frameCache.get(index, settingsHash);
        if (cached) {
            return cached;
        }

        // Get source frame
        const sourceFrame = await this.getSourceFrame(index);

        // Build settings for worker
        const settings: FrameDitherSettings = {
            algorithm: state.algorithm,
            palette: state.customPalette ?? state.palette,
            adjustments: state.adjustments,
            options: state.options,
            colorMatchMethod: state.colorMatch,
            pixelScale: state.pixelScale,
            levels: state.levels,
        };

        // Process frame in worker
        const processedImageData = await this.workerPool.execute(
            worker => worker.processFrame(sourceFrame.imageData, settings)
        );

        const ditheredFrame: DitheredFrame = {
            index,
            timestamp: sourceFrame.timestamp,
            imageData: processedImageData,
            settingsHash,
        };

        // Cache the result
        this.frameCache.set(index, ditheredFrame);

        return ditheredFrame;
    }

    /**
     * Invalidate the frame cache (called when dither settings change)
     */
    invalidateCache(): void {
        this.frameCache.invalidateAll();
    }

    /**
     * Check if settings changed and invalidate if needed
     */
    checkSettingsChange(state: AppState): boolean {
        const newHash = computeSettingsHash(state);
        if (newHash !== this.currentSettingsHash) {
            this.currentSettingsHash = newHash;
            this.invalidateCache();
            return true;
        }
        return false;
    }

    /**
     * Export video to file
     */
    async exportVideo(
        options: VideoExportOptions,
        state: AppState,
        onProgress?: ProgressCallback
    ): Promise<Blob> {
        if (!this.metadata || !this.workerPool) {
            throw new Error('No video loaded');
        }

        this.abortController = new AbortController();
        const { signal } = this.abortController;

        const encoder = await createEncoder(options.format);
        await encoder.configure(options, this.metadata);

        const frameCount = this.metadata.frameCount;
        const settings: FrameDitherSettings = {
            algorithm: state.algorithm,
            palette: state.customPalette ?? state.palette,
            adjustments: state.adjustments,
            options: state.options,
            colorMatchMethod: state.colorMatch,
            pixelScale: state.pixelScale,
            levels: state.levels,
        };

        try {
            // Process and encode frames
            for (let i = 0; i < frameCount; i++) {
                if (signal.aborted) {
                    encoder.abort();
                    throw new Error('Export cancelled');
                }

                // Report progress
                onProgress?.({
                    stage: 'dithering',
                    currentFrame: i,
                    totalFrames: frameCount,
                    percentage: Math.round((i / frameCount) * 50), // First 50% is dithering
                });

                // Get dithered frame
                const ditheredFrame = await this.getDitheredFrame(i, state);

                // Add to encoder
                onProgress?.({
                    stage: 'encoding',
                    currentFrame: i,
                    totalFrames: frameCount,
                    percentage: 50 + Math.round((i / frameCount) * 50), // Second 50% is encoding
                });

                await encoder.addFrame(ditheredFrame.imageData, ditheredFrame.timestamp);
            }

            // Finalize and return blob
            onProgress?.({
                stage: 'finalizing',
                currentFrame: frameCount,
                totalFrames: frameCount,
                percentage: 100,
            });

            return await encoder.finalize();
        } catch (error) {
            encoder.abort();
            throw error;
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Cancel ongoing export
     */
    cancelExport(): void {
        this.abortController?.abort();
    }

    /**
     * Pre-load frames around a specific index for smooth playback
     */
    async preloadRange(centerIndex: number, range = 5, state: AppState): Promise<void> {
        if (!this.metadata) return;

        const start = Math.max(0, centerIndex - range);
        const end = Math.min(this.metadata.frameCount - 1, centerIndex + range);

        const tasks: Promise<DitheredFrame>[] = [];
        for (let i = start; i <= end; i++) {
            const settingsHash = computeSettingsHash(state);
            if (!this.frameCache.has(i, settingsHash)) {
                tasks.push(this.getDitheredFrame(i, state));
            }
        }

        // Process in parallel
        await Promise.all(tasks);
    }

    /**
     * Close the current video and cleanup resources
     */
    closeVideo(): void {
        if (this.extractor) {
            this.extractor.close();
            this.extractor = null;
        }

        this.sourceBuffer.clear();
        this.frameCache.invalidateAll();
        this.metadata = null;
        this.file = null;
        this.currentSettingsHash = '';
    }

    /**
     * Terminate the video manager and release all resources
     */
    terminate(): void {
        this.closeVideo();

        if (this.workerPool) {
            this.workerPool.terminate();
            this.workerPool = null;
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { frames: number; memoryMB: number } {
        const stats = this.frameCache.getStats();
        return {
            frames: stats.frames,
            memoryMB: stats.memoryMB,
        };
    }
}

// Singleton instance
let videoManager: VideoManager | null = null;

/**
 * Get or create the video manager instance
 */
export function getVideoManager(): VideoManager {
    if (!videoManager) {
        videoManager = new VideoManager();
    }
    return videoManager;
}

/**
 * Cleanup the video manager
 */
export function cleanupVideoManager(): void {
    if (videoManager) {
        videoManager.terminate();
        videoManager = null;
    }
}

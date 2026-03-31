/**
 * LRU Frame Cache for dithered video frames
 * Manages memory by evicting oldest frames when limits are reached
 */

import type { DitheredFrame, FrameCacheOptions } from '../../types/video.ts';
import type { AppState } from '../../types/state.ts';

/**
 * Internal cache entry with access tracking
 */
interface CacheEntry {
    frame: DitheredFrame;
    accessTime: number;
    sizeBytes: number;
}

/**
 * LRU cache for dithered video frames
 */
export class FrameCache {
    private cache: Map<number, CacheEntry> = new Map();
    private readonly maxFrames: number;
    private readonly maxMemoryBytes: number;
    private currentMemoryBytes = 0;
    private currentSettingsHash: string = '';

    constructor(options: FrameCacheOptions) {
        this.maxFrames = options.maxFrames;
        this.maxMemoryBytes = options.maxMemoryMB * 1024 * 1024;
    }

    /**
     * Get a frame from cache if it exists and settings match
     */
    get(index: number, settingsHash: string): DitheredFrame | null {
        // If settings changed, invalidate entire cache
        if (settingsHash !== this.currentSettingsHash) {
            this.invalidateAll();
            this.currentSettingsHash = settingsHash;
            return null;
        }

        const entry = this.cache.get(index);
        if (!entry) return null;

        // Update access time for LRU
        entry.accessTime = Date.now();
        return entry.frame;
    }

    /**
     * Store a dithered frame in cache
     */
    set(index: number, frame: DitheredFrame): void {
        // Update settings hash if this is the first frame
        if (this.cache.size === 0) {
            this.currentSettingsHash = frame.settingsHash;
        }

        // Check if settings match (shouldn't cache if different)
        if (frame.settingsHash !== this.currentSettingsHash) {
            console.warn('[FrameCache] Settings hash mismatch, skipping cache');
            return;
        }

        const sizeBytes = this.estimateFrameSize(frame.imageData);

        // Remove existing entry if present
        if (this.cache.has(index)) {
            const existing = this.cache.get(index)!;
            this.currentMemoryBytes -= existing.sizeBytes;
            this.cache.delete(index);
        }

        // Evict if necessary
        this.evictIfNeeded(sizeBytes);

        // Add new entry
        const entry: CacheEntry = {
            frame,
            accessTime: Date.now(),
            sizeBytes,
        };

        this.cache.set(index, entry);
        this.currentMemoryBytes += sizeBytes;
    }

    /**
     * Check if a frame exists in cache with matching settings
     */
    has(index: number, settingsHash: string): boolean {
        if (settingsHash !== this.currentSettingsHash) return false;
        return this.cache.has(index);
    }

    /**
     * Invalidate all cached frames
     */
    invalidateAll(): void {
        this.cache.clear();
        this.currentMemoryBytes = 0;
        this.currentSettingsHash = '';
    }

    /**
     * Invalidate frames in a specific range
     */
    invalidateRange(start: number, end: number): void {
        for (let i = start; i <= end; i++) {
            const entry = this.cache.get(i);
            if (entry) {
                this.currentMemoryBytes -= entry.sizeBytes;
                this.cache.delete(i);
            }
        }
    }

    /**
     * Get current memory usage in bytes
     */
    getMemoryUsage(): number {
        return this.currentMemoryBytes;
    }

    /**
     * Get current memory usage in MB
     */
    getMemoryUsageMB(): number {
        return this.currentMemoryBytes / (1024 * 1024);
    }

    /**
     * Get number of cached frames
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStats(): { frames: number; memoryMB: number; maxFrames: number; maxMemoryMB: number } {
        return {
            frames: this.cache.size,
            memoryMB: this.getMemoryUsageMB(),
            maxFrames: this.maxFrames,
            maxMemoryMB: this.maxMemoryBytes / (1024 * 1024),
        };
    }

    /**
     * Evict oldest frames until there's room for a new frame
     */
    private evictIfNeeded(newFrameSize: number): void {
        // Check frame count limit
        while (this.cache.size >= this.maxFrames) {
            this.evictOldest();
        }

        // Check memory limit
        while (this.currentMemoryBytes + newFrameSize > this.maxMemoryBytes && this.cache.size > 0) {
            this.evictOldest();
        }
    }

    /**
     * Evict the least recently used frame
     */
    private evictOldest(): void {
        let oldestKey: number | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.accessTime < oldestTime) {
                oldestTime = entry.accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey !== null) {
            const entry = this.cache.get(oldestKey)!;
            this.currentMemoryBytes -= entry.sizeBytes;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Estimate frame size in bytes
     */
    private estimateFrameSize(imageData: ImageData): number {
        // ImageData stores 4 bytes per pixel (RGBA)
        return imageData.width * imageData.height * 4;
    }
}

/**
 * Compute a hash of dither-affecting settings for cache invalidation
 */
export function computeSettingsHash(state: AppState): string {
    const relevantSettings = {
        algorithm: state.algorithm,
        options: state.options,
        palette: state.palette.name,
        customPalette: state.customPalette?.colors,
        colorMatch: state.colorMatch,
        adjustments: state.adjustments,
        pixelScale: state.pixelScale,
        levels: state.levels,
        mode: state.mode,
        postEffect: state.postEffect,
        effectColor: (state.postEffect === 'duotone-pin-cutout' ||
                      state.postEffect === 'chroma-pin-composite')
                     ? state.effectColor : null,
        layer2Adjustments: state.postEffect === 'luminous-pin-light' ? state.layer2Adjustments : null,
    };

    // Simple hash using JSON string
    const str = JSON.stringify(relevantSettings);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}

/**
 * Create a frame cache with default options
 */
export function createFrameCache(options?: Partial<FrameCacheOptions>): FrameCache {
    return new FrameCache({
        maxFrames: options?.maxFrames ?? 50,
        maxMemoryMB: options?.maxMemoryMB ?? 500,
    });
}

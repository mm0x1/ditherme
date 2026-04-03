/**
 * Image cache - LRU cache for dithered results
 * Enables instant switching between previously computed settings
 */

import type { AppState } from '../types/state.ts';
import { settings } from '../utils/settings.ts';

interface CacheEntry {
    imageData: ImageData;
    timestamp: number;
    sizeBytes: number;
}

/**
 * LRU Image Cache with memory limit
 */
class ImageCache {
    private cache: Map<string, CacheEntry> = new Map();
    private currentMemoryBytes = 0;

    /**
     * Get max memory from settings
     */
    private get maxMemoryBytes(): number {
        return settings.get('cacheMaxMemoryMB') * 1024 * 1024;
    }

    /**
     * Generate a cache key from relevant state properties
     * Only properties that affect dithering output are included
     */
    private generateKey(state: AppState): string {
        const keyData = {
            algorithm: state.algorithm,
            options: state.options,
            mode: state.mode,
            paletteName: state.palette.name,
            paletteColorsCount: state.palette.colors.length,
            // Include first/last palette colors to detect changes
            paletteFirst: state.palette.colors[0],
            paletteLast: state.palette.colors[state.palette.colors.length - 1],
            colorMatch: state.colorMatch,
            adjustments: state.adjustments,
            pixelScale: state.pixelScale,
            levels: state.levels,
            // Use source image dimensions as part of key
            // (actual pixel data would be too expensive to hash)
            sourceWidth: state.sourceImage?.width ?? 0,
            sourceHeight: state.sourceImage?.height ?? 0,
            postEffect: state.postEffect,
            effectColor: (state.postEffect === 'duotone-pin-cutout' ||
                          state.postEffect === 'chroma-pin-composite')
                         ? state.effectColor : null,
            layer2Adjustments: state.postEffect === 'luminous-pin-light' ? state.layer2Adjustments : null,
            imageEffect: state.imageEffect,
            imageEffectParams: state.imageEffect !== 'none' ? state.imageEffectParams : null,
        };

        return this.hashObject(keyData);
    }

    /**
     * Simple hash function for objects
     */
    private hashObject(obj: unknown): string {
        const str = JSON.stringify(obj);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get cached result for current state
     * Returns null if not cached or caching is disabled
     */
    get(state: AppState): ImageData | null {
        if (!settings.get('enableCaching')) {
            return null;
        }

        const key = this.generateKey(state);
        const entry = this.cache.get(key);

        if (entry) {
            // Update timestamp for LRU
            entry.timestamp = Date.now();
            return entry.imageData;
        }

        return null;
    }

    /**
     * Store result in cache
     */
    set(state: AppState, imageData: ImageData): void {
        if (!settings.get('enableCaching')) {
            return;
        }

        const key = this.generateKey(state);
        const sizeBytes = imageData.width * imageData.height * 4; // RGBA

        // Evict entries if needed to make room
        while (this.currentMemoryBytes + sizeBytes > this.maxMemoryBytes && this.cache.size > 0) {
            this.evictOldest();
        }

        // Don't cache if single image is larger than max memory
        if (sizeBytes > this.maxMemoryBytes) {
            return;
        }

        // Remove existing entry if present (to update)
        if (this.cache.has(key)) {
            const existing = this.cache.get(key)!;
            this.currentMemoryBytes -= existing.sizeBytes;
        }

        // Store new entry
        this.cache.set(key, {
            imageData,
            timestamp: Date.now(),
            sizeBytes
        });

        this.currentMemoryBytes += sizeBytes;
    }

    /**
     * Evict the least recently used entry
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.cache.get(oldestKey)!;
            this.currentMemoryBytes -= entry.sizeBytes;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
        this.currentMemoryBytes = 0;
    }

    /**
     * Invalidate cache when source image changes
     */
    invalidateForNewSource(): void {
        this.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { entries: number; memoryMB: number; maxMemoryMB: number } {
        return {
            entries: this.cache.size,
            memoryMB: this.currentMemoryBytes / (1024 * 1024),
            maxMemoryMB: this.maxMemoryBytes / (1024 * 1024)
        };
    }
}

// Export singleton instance
export const imageCache = new ImageCache();

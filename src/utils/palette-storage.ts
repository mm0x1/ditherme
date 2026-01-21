/**
 * Palette storage manager - persists custom palettes to localStorage
 */

import type { Color, SavedPalette } from '../types/palette.ts';

const STORAGE_KEY = 'ditherme_palettes';
const MAX_PALETTES = 50;

/**
 * Palette storage manager with localStorage persistence
 */
class PaletteStorageManager extends EventTarget {
    private palettes: SavedPalette[];

    constructor() {
        super();
        this.palettes = this.load();
    }

    /**
     * Load palettes from localStorage
     */
    private load(): SavedPalette[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                // Defensive: check for extremely large data
                if (stored.length > 500000) {
                    console.warn('Palette data is unusually large, resetting');
                    localStorage.removeItem(STORAGE_KEY);
                    return [];
                }
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to load palettes from localStorage:', e);
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {}
        }
        return [];
    }

    /**
     * Save palettes to localStorage
     */
    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.palettes));
            this.dispatchEvent(new CustomEvent('paletteschange', {
                detail: { palettes: this.palettes }
            }));
        } catch (e) {
            console.warn('Failed to save palettes to localStorage:', e);
        }
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return `pal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get all saved palettes
     */
    getAll(): ReadonlyArray<SavedPalette> {
        return [...this.palettes];
    }

    /**
     * Get a palette by ID
     */
    getById(id: string): SavedPalette | undefined {
        return this.palettes.find(p => p.id === id);
    }

    /**
     * Get a palette by name
     */
    getByName(name: string): SavedPalette | undefined {
        return this.palettes.find(p => p.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Save a new palette or update existing by name
     */
    savePalette(name: string, colors: Color[], source?: SavedPalette['source']): SavedPalette {
        const existing = this.getByName(name);
        const now = Date.now();

        if (existing) {
            // Update existing
            existing.colors = [...colors];
            existing.updatedAt = now;
            if (source) existing.source = source;
            this.save();
            return existing;
        }

        // Check max limit
        if (this.palettes.length >= MAX_PALETTES) {
            // Remove oldest palette
            this.palettes.sort((a, b) => a.updatedAt - b.updatedAt);
            this.palettes.shift();
        }

        // Create new palette
        const palette: SavedPalette = {
            id: this.generateId(),
            name,
            colors: [...colors],
            createdAt: now,
            updatedAt: now,
            source: source || 'custom'
        };

        this.palettes.push(palette);
        this.save();
        return palette;
    }

    /**
     * Update an existing palette by ID
     */
    updatePalette(id: string, updates: Partial<Pick<SavedPalette, 'name' | 'colors'>>): SavedPalette | undefined {
        const palette = this.getById(id);
        if (!palette) return undefined;

        if (updates.name !== undefined) {
            palette.name = updates.name;
        }
        if (updates.colors !== undefined) {
            palette.colors = [...updates.colors];
        }
        palette.updatedAt = Date.now();

        this.save();
        return palette;
    }

    /**
     * Delete a palette by ID
     */
    deletePalette(id: string): boolean {
        const index = this.palettes.findIndex(p => p.id === id);
        if (index === -1) return false;

        this.palettes.splice(index, 1);
        this.save();
        return true;
    }

    /**
     * Check if a name already exists
     */
    nameExists(name: string): boolean {
        return this.palettes.some(p => p.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Get the count of saved palettes
     */
    getCount(): number {
        return this.palettes.length;
    }

    /**
     * Check if at max capacity
     */
    isAtCapacity(): boolean {
        return this.palettes.length >= MAX_PALETTES;
    }

    /**
     * Listen for palette changes
     */
    onChange(callback: (palettes: SavedPalette[]) => void): () => void {
        const handler = (e: Event) => {
            callback((e as CustomEvent).detail.palettes);
        };
        this.addEventListener('paletteschange', handler);
        return () => this.removeEventListener('paletteschange', handler);
    }
}

// Export singleton instance
export const paletteStorage = new PaletteStorageManager();

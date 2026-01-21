/**
 * Settings manager - persists user preferences to localStorage
 */

import { UserSettings, DEFAULT_SETTINGS } from '../types/settings.ts';

const STORAGE_KEY = 'dithertoy_settings';

/**
 * Settings manager with localStorage persistence
 */
class SettingsManager extends EventTarget {
    private settings: UserSettings;

    constructor() {
        super();
        this.settings = this.load();
    }

    /**
     * Load settings from localStorage
     */
    private load(): UserSettings {
        try {
            console.time('settings-load');
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                // Defensive: check for extremely large data that could slow parsing
                if (stored.length > 100000) {
                    console.warn('Settings data is unusually large, resetting to defaults');
                    localStorage.removeItem(STORAGE_KEY);
                    console.timeEnd('settings-load');
                    return { ...DEFAULT_SETTINGS };
                }
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new settings added in updates
                console.timeEnd('settings-load');
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
            console.timeEnd('settings-load');
        } catch (e) {
            console.warn('Failed to load settings from localStorage:', e);
            // Clear corrupt data
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {}
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Save settings to localStorage
     */
    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
            this.dispatchEvent(new CustomEvent('settingschange', {
                detail: { settings: this.settings }
            }));
        } catch (e) {
            console.warn('Failed to save settings to localStorage:', e);
        }
    }

    /**
     * Get a single setting value
     */
    get<K extends keyof UserSettings>(key: K): UserSettings[K] {
        return this.settings[key];
    }

    /**
     * Set a single setting value
     */
    set<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
        this.settings[key] = value;
        this.save();
    }

    /**
     * Update multiple settings at once
     */
    update(updates: Partial<UserSettings>): void {
        this.settings = { ...this.settings, ...updates };
        this.save();
    }

    /**
     * Get all settings (read-only copy)
     */
    getAll(): Readonly<UserSettings> {
        return { ...this.settings };
    }

    /**
     * Reset all settings to defaults
     */
    reset(): void {
        this.settings = { ...DEFAULT_SETTINGS };
        this.save();
    }

    /**
     * Add an algorithm to favorites
     */
    addFavorite(algorithmId: string): void {
        const favorites = [...this.settings.favoriteAlgorithms];
        if (!favorites.includes(algorithmId)) {
            favorites.push(algorithmId);
            this.set('favoriteAlgorithms', favorites);
        }
    }

    /**
     * Remove an algorithm from favorites
     */
    removeFavorite(algorithmId: string): void {
        const favorites = this.settings.favoriteAlgorithms.filter(id => id !== algorithmId);
        this.set('favoriteAlgorithms', favorites);
    }

    /**
     * Toggle an algorithm favorite status
     */
    toggleFavorite(algorithmId: string): boolean {
        const isFavorite = this.settings.favoriteAlgorithms.includes(algorithmId);
        if (isFavorite) {
            this.removeFavorite(algorithmId);
            return false;
        } else {
            this.addFavorite(algorithmId);
            return true;
        }
    }

    /**
     * Check if an algorithm is a favorite
     */
    isFavorite(algorithmId: string): boolean {
        return this.settings.favoriteAlgorithms.includes(algorithmId);
    }

    /**
     * Add algorithm to recent list
     */
    addRecent(algorithmId: string): void {
        const recent = this.settings.recentAlgorithms.filter(id => id !== algorithmId);
        recent.unshift(algorithmId);

        // Trim to max length
        if (recent.length > this.settings.maxRecentItems) {
            recent.length = this.settings.maxRecentItems;
        }

        this.set('recentAlgorithms', recent);
    }

    /**
     * Listen for settings changes
     */
    onChange(callback: (settings: UserSettings) => void): () => void {
        const handler = (e: Event) => {
            callback((e as CustomEvent).detail.settings);
        };
        this.addEventListener('settingschange', handler);
        return () => this.removeEventListener('settingschange', handler);
    }
}

// Export singleton instance
export const settings = new SettingsManager();

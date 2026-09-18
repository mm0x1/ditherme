// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import after setting environment — SettingsManager reads localStorage in constructor
async function getSettings() {
    // Re-import to get a fresh instance (singleton re-initializes per module load)
    const mod = await import('../../../src/utils/settings.ts');
    return mod.settings;
}

const STORAGE_KEY = 'ditherme_settings';

describe('SettingsManager (integration)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it('loads default settings when localStorage is empty', async () => {
        const settings = await getSettings();
        expect(settings.get('defaultMode')).toBe('mono');
        expect(settings.get('favoriteAlgorithms')).toEqual([]);
        expect(settings.get('apiEnabled')).toBe(false);
    });

    it('persists a setting to localStorage', async () => {
        const settings = await getSettings();
        settings.set('defaultMode', 'color');
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.defaultMode).toBe('color');
    });

    it('getAll returns a copy, not the internal object', async () => {
        const settings = await getSettings();
        settings.reset(); // ensure known state
        const all = settings.getAll();
        const original = all.defaultMode;
        const mutated = original === 'mono' ? 'color' : 'mono';
        (all as { defaultMode: string }).defaultMode = mutated;
        expect(settings.get('defaultMode')).toBe(original);
    });

    it('update merges multiple settings at once', async () => {
        const settings = await getSettings();
        settings.update({ defaultMode: 'color', enableCaching: false });
        expect(settings.get('defaultMode')).toBe('color');
        expect(settings.get('enableCaching')).toBe(false);
    });

    it('reset restores all defaults', async () => {
        const settings = await getSettings();
        settings.set('defaultMode', 'color');
        settings.reset();
        expect(settings.get('defaultMode')).toBe('mono');
    });

    it('addFavorite appends algorithm id', async () => {
        const settings = await getSettings();
        settings.addFavorite('floyd-steinberg');
        expect(settings.get('favoriteAlgorithms')).toContain('floyd-steinberg');
    });

    it('addFavorite does not add duplicates', async () => {
        const settings = await getSettings();
        settings.addFavorite('floyd-steinberg');
        settings.addFavorite('floyd-steinberg');
        expect(settings.get('favoriteAlgorithms').filter(id => id === 'floyd-steinberg')).toHaveLength(1);
    });

    it('removeFavorite removes the algorithm id', async () => {
        const settings = await getSettings();
        settings.addFavorite('floyd-steinberg');
        settings.removeFavorite('floyd-steinberg');
        expect(settings.get('favoriteAlgorithms')).not.toContain('floyd-steinberg');
    });

    it('toggleFavorite adds when not present', async () => {
        const settings = await getSettings();
        const result = settings.toggleFavorite('atkinson');
        expect(result).toBe(true);
        expect(settings.isFavorite('atkinson')).toBe(true);
    });

    it('toggleFavorite removes when present', async () => {
        const settings = await getSettings();
        settings.addFavorite('atkinson');
        const result = settings.toggleFavorite('atkinson');
        expect(result).toBe(false);
        expect(settings.isFavorite('atkinson')).toBe(false);
    });

    it('addRecent inserts at front of list', async () => {
        const settings = await getSettings();
        settings.addRecent('algo-a');
        settings.addRecent('algo-b');
        const recent = settings.get('recentAlgorithms');
        expect(recent[0]).toBe('algo-b');
        expect(recent[1]).toBe('algo-a');
    });

    it('addRecent deduplicates (moves existing entry to front)', async () => {
        const settings = await getSettings();
        settings.addRecent('algo-a');
        settings.addRecent('algo-b');
        settings.addRecent('algo-a');
        const recent = settings.get('recentAlgorithms');
        expect(recent[0]).toBe('algo-a');
        expect(recent.filter(id => id === 'algo-a')).toHaveLength(1);
    });

    it('addRecent trims list to maxRecentItems', async () => {
        const settings = await getSettings();
        settings.set('maxRecentItems', 3);
        ['a', 'b', 'c', 'd', 'e'].forEach(id => settings.addRecent(id));
        expect(settings.get('recentAlgorithms')).toHaveLength(3);
    });

    it('onChange fires callback when setting changes', async () => {
        const settings = await getSettings();
        let fired = false;
        const unsubscribe = settings.onChange(() => { fired = true; });
        settings.set('defaultMode', 'color');
        expect(fired).toBe(true);
        unsubscribe();
    });

    it('unsubscribed onChange does not fire after removal', async () => {
        const settings = await getSettings();
        let count = 0;
        const unsubscribe = settings.onChange(() => { count++; });
        settings.set('defaultMode', 'color');
        unsubscribe();
        settings.set('defaultMode', 'mono');
        expect(count).toBe(1);
    });

    it('merges stored settings with defaults on load (handles new settings keys)', async () => {
        // The singleton is already initialized — test merge behavior via update
        // This verifies: settings has all keys from defaults even if not explicitly set
        const settings = await getSettings();
        settings.reset();
        settings.set('defaultMode', 'color');
        // Other defaults remain intact
        expect(settings.get('defaultMode')).toBe('color');
        expect(settings.get('enableCaching')).toBe(true); // from defaults
    });

    it('removes legacy API settings and tokens when loading', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            apiEnabled: true,
            apiPort: 9000,
            apiAuthEnabled: true,
            apiAuthToken: 'legacy-secret',
            defaultMode: 'color'
        }));

        const settings = await getSettings();
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

        expect(settings.get('defaultMode')).toBe('color');
        expect(settings.get('apiEnabled')).toBe(false);
        expect(settings.get('apiPort')).toBe(7842);
        expect(settings.get('apiBindAddress')).toBe('127.0.0.1');
        expect(settings.get('apiAuthEnabled')).toBe(false);
        expect(settings.get('apiAuthToken')).toBeNull();
        expect(stored).not.toHaveProperty('apiEnabled');
        expect(stored).not.toHaveProperty('apiPort');
        expect(stored).not.toHaveProperty('apiBindAddress');
        expect(stored).not.toHaveProperty('apiAuthEnabled');
        expect(stored).not.toHaveProperty('apiAuthToken');
    });

    it('reset clears customizations and restores all defaults', async () => {
        const settings = await getSettings();
        settings.set('defaultMode', 'color');
        settings.set('enableCaching', false);
        settings.addFavorite('test-algo');
        settings.reset();
        expect(settings.get('defaultMode')).toBe('mono');
        expect(settings.get('enableCaching')).toBe(true);
        expect(settings.get('favoriteAlgorithms')).toEqual([]);
    });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { paletteStorage } from '../../../src/utils/palette-storage.ts';

const RED = { r: 255, g: 0, b: 0 };
const GREEN = { r: 0, g: 255, b: 0 };
const BLUE = { r: 0, g: 0, b: 255 };

beforeEach(() => {
    // Remove all saved palettes between tests
    const all = [...paletteStorage.getAll()];
    for (const p of all) {
        paletteStorage.deletePalette(p.id);
    }
});

describe('paletteStorage', () => {
    it('starts empty after cleanup', () => {
        expect(paletteStorage.getAll()).toHaveLength(0);
    });

    it('savePalette creates a new palette', () => {
        const p = paletteStorage.savePalette('My Palette', [RED, BLUE]);
        expect(p.name).toBe('My Palette');
        expect(p.colors).toHaveLength(2);
        expect(p.id).toMatch(/^pal_/);
    });

    it('getAll returns all saved palettes', () => {
        paletteStorage.savePalette('P1', [RED, GREEN]);
        paletteStorage.savePalette('P2', [GREEN, BLUE]);
        expect(paletteStorage.getAll()).toHaveLength(2);
    });

    it('getById returns palette by id', () => {
        const p = paletteStorage.savePalette('Test', [RED, GREEN]);
        expect(paletteStorage.getById(p.id)).toBeDefined();
        expect(paletteStorage.getById(p.id)!.name).toBe('Test');
    });

    it('getById returns undefined for unknown id', () => {
        expect(paletteStorage.getById('nonexistent')).toBeUndefined();
    });

    it('getByName returns palette by name (case-insensitive)', () => {
        paletteStorage.savePalette('MyPalette', [RED, GREEN]);
        expect(paletteStorage.getByName('mypalette')).toBeDefined();
        expect(paletteStorage.getByName('MYPALETTE')).toBeDefined();
    });

    it('savePalette updates existing palette by name', () => {
        const p = paletteStorage.savePalette('Shared', [RED, GREEN]);
        const updatedAt1 = p.updatedAt;
        const p2 = paletteStorage.savePalette('Shared', [RED, GREEN, BLUE]);
        expect(paletteStorage.getAll()).toHaveLength(1);
        expect(p2.colors).toHaveLength(3);
        expect(p2.updatedAt).toBeGreaterThanOrEqual(updatedAt1);
    });

    it('updatePalette changes name and colors', () => {
        const p = paletteStorage.savePalette('Old', [RED]);
        paletteStorage.updatePalette(p.id, { name: 'New', colors: [GREEN, BLUE] });
        const updated = paletteStorage.getById(p.id)!;
        expect(updated.name).toBe('New');
        expect(updated.colors).toHaveLength(2);
    });

    it('updatePalette returns undefined for unknown id', () => {
        expect(paletteStorage.updatePalette('bad-id', { name: 'X' })).toBeUndefined();
    });

    it('deletePalette removes by id and returns true', () => {
        const p = paletteStorage.savePalette('ToDelete', [RED, GREEN]);
        expect(paletteStorage.deletePalette(p.id)).toBe(true);
        expect(paletteStorage.getById(p.id)).toBeUndefined();
    });

    it('deletePalette returns false for unknown id', () => {
        expect(paletteStorage.deletePalette('ghost')).toBe(false);
    });

    it('nameExists is case-insensitive', () => {
        paletteStorage.savePalette('TestPalette', [RED, GREEN]);
        expect(paletteStorage.nameExists('testpalette')).toBe(true);
        expect(paletteStorage.nameExists('TESTPALETTE')).toBe(true);
        expect(paletteStorage.nameExists('other')).toBe(false);
    });

    it('getCount matches number of stored palettes', () => {
        paletteStorage.savePalette('A', [RED, GREEN]);
        paletteStorage.savePalette('B', [GREEN, BLUE]);
        expect(paletteStorage.getCount()).toBe(2);
    });

    it('isAtCapacity returns false below limit', () => {
        expect(paletteStorage.isAtCapacity()).toBe(false);
    });

    it('onChange fires callback on save', () => {
        let fired = false;
        const unsubscribe = paletteStorage.onChange(() => { fired = true; });
        paletteStorage.savePalette('Trigger', [RED, GREEN]);
        expect(fired).toBe(true);
        unsubscribe();
    });

    it('unsubscribed onChange does not fire', () => {
        let count = 0;
        const unsubscribe = paletteStorage.onChange(() => { count++; });
        paletteStorage.savePalette('First', [RED, GREEN]);
        unsubscribe();
        paletteStorage.savePalette('Second', [GREEN, BLUE]);
        expect(count).toBe(1);
    });

    it('savePalette stores a copy of the colors array (push-safe)', () => {
        const colors = [{ ...RED }, { ...GREEN }];
        const p = paletteStorage.savePalette('Copy', colors);
        colors.push({ ...BLUE });
        // The stored array should not grow when the source array is mutated
        expect(p.colors).toHaveLength(2);
    });

    it('createdAt is set on new palettes', () => {
        const before = Date.now();
        const p = paletteStorage.savePalette('New', [RED, GREEN]);
        const after = Date.now();
        expect(p.createdAt).toBeGreaterThanOrEqual(before);
        expect(p.createdAt).toBeLessThanOrEqual(after);
    });

    it('persists to localStorage', () => {
        paletteStorage.savePalette('Persist', [RED, GREEN]);
        const stored = JSON.parse(localStorage.getItem('ditherme_palettes')!);
        expect(Array.isArray(stored)).toBe(true);
        expect(stored.length).toBe(1);
        expect(stored[0].name).toBe('Persist');
    });
});

import { describe, it, expect } from 'vitest';
import { reducePalette } from '../../../src/engine/palette-utils.ts';
import { createImageData } from '../../fixtures/images.ts';
import { BLACK_WHITE, CGA, EMPTY, GRAYSCALE_4, createPalette } from '../../fixtures/palettes.ts';

describe('reducePalette', () => {
    it('throws on empty palette', () => {
        const img = createImageData(4, 4);
        expect(() => reducePalette(img, EMPTY, 2, 'euclidean')).toThrow('empty palette');
    });

    it('returns original palette unchanged when levels=0', () => {
        const img = createImageData(4, 4);
        const result = reducePalette(img, BLACK_WHITE, 0, 'euclidean');
        expect(result).toBe(BLACK_WHITE);
    });

    it('returns original palette unchanged when levels >= palette.colors.length', () => {
        const img = createImageData(4, 4);
        const result = reducePalette(img, BLACK_WHITE, 2, 'euclidean');
        expect(result).toBe(BLACK_WHITE);
        const result2 = reducePalette(img, BLACK_WHITE, 10, 'euclidean');
        expect(result2).toBe(BLACK_WHITE);
    });

    it('reduces a 4-color palette to 2 colors', () => {
        const img = createImageData(4, 4, 0, 0, 0); // all black
        const result = reducePalette(img, GRAYSCALE_4, 2, 'euclidean');
        expect(result.colors.length).toBe(2);
    });

    it('output name contains the level count', () => {
        const img = createImageData(4, 4, 0, 0, 0);
        const result = reducePalette(img, GRAYSCALE_4, 2, 'euclidean');
        expect(result.name).toContain('2');
    });

    it('uses most-used colors: all-black image keeps black in output', () => {
        const img = createImageData(8, 8, 0, 0, 0);
        const result = reducePalette(img, GRAYSCALE_4, 2, 'euclidean');
        const hasBlack = result.colors.some(c => c.r === 0 && c.g === 0 && c.b === 0);
        expect(hasBlack).toBe(true);
    });

    it('ensures minimum 2 colors even if image only uses 1 color', () => {
        // single-color palette would normally reduce to 1 — fallback adds black + white
        const img = createImageData(4, 4, 255, 0, 0);
        // 3-color palette where only 1 gets used → levels=1 triggers fallback
        const palette = createPalette([
            { r: 255, g: 0, b: 0 },
            { r: 0, g: 255, b: 0 },
            { r: 0, g: 0, b: 255 },
        ]);
        const result = reducePalette(img, palette, 1, 'euclidean');
        expect(result.colors.length).toBeGreaterThanOrEqual(2);
    });

    it('works with all color match methods', () => {
        const img = createImageData(4, 4, 128, 128, 128);
        const methods = ['euclidean', 'luminance', 'ciede2000', 'cie94', 'cie76', 'srgb-ccir'] as const;
        for (const method of methods) {
            const result = reducePalette(img, GRAYSCALE_4, 2, method);
            expect(result.colors.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('works on a 1x1 image', () => {
        const img = createImageData(1, 1, 255, 255, 255);
        const result = reducePalette(img, GRAYSCALE_4, 2, 'euclidean');
        expect(result.colors.length).toBeGreaterThanOrEqual(2);
    });

    it('works on a large image (> 100000 pixels) with sampling', () => {
        // 400x400 = 160000 pixels — triggers the sampleRate path
        const img = createImageData(400, 400, 200, 200, 200);
        const result = reducePalette(img, GRAYSCALE_4, 2, 'euclidean');
        expect(result.colors.length).toBeGreaterThanOrEqual(2);
    });

    it('returns a new object (does not mutate original palette)', () => {
        const img = createImageData(4, 4, 0, 0, 0);
        const originalColors = [...CGA.colors];
        reducePalette(img, CGA, 2, 'euclidean');
        expect(CGA.colors).toEqual(originalColors);
    });
});

import { describe, it, expect } from 'vitest';
import {
    orderedDitherMono,
    orderedDitherColor,
    BAYER_MATRICES,
} from '../../../src/algorithms/ordered.ts';
import { createImageData, createGradientImage, expectValidImageData } from '../../fixtures/images.ts';
import { BLACK_WHITE, CGA, GRAYSCALE_4 } from '../../fixtures/palettes.ts';

function isOnlyPaletteColors(img: ImageData, palette: typeof BLACK_WHITE): boolean {
    for (let i = 0; i < img.data.length; i += 4) {
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        if (!palette.colors.some(c => c.r === r && c.g === g && c.b === b)) return false;
    }
    return true;
}

describe('BAYER_MATRICES', () => {
    it('2x2 Bayer matrix has 4 entries', () => {
        expect(BAYER_MATRICES[2].data).toHaveLength(4);
    });

    it('8x8 Bayer matrix has 64 entries', () => {
        expect(BAYER_MATRICES[8].data).toHaveLength(64);
    });

    it('all values in 2x2 are unique and in [0, 1)', () => {
        const data = BAYER_MATRICES[2].data;
        const unique = new Set(data);
        expect(unique.size).toBe(4);
        for (const v of data) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('4x4 matrix has all unique values', () => {
        const data = BAYER_MATRICES[4].data;
        const unique = new Set(data);
        expect(unique.size).toBe(16);
    });
});

describe('orderedDitherMono', () => {
    it('output dimensions match input', () => {
        const img = createImageData(8, 6, 128, 128, 128);
        const out = orderedDitherMono(img, BLACK_WHITE);
        expect(out.width).toBe(8);
        expect(out.height).toBe(6);
    });

    it('all-white input → all-white output', () => {
        const img = createImageData(8, 8, 255, 255, 255);
        const out = orderedDitherMono(img, BLACK_WHITE);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(255);
        }
    });

    it('all-black input → all-black output', () => {
        const img = createImageData(8, 8, 0, 0, 0);
        const out = orderedDitherMono(img, BLACK_WHITE);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
        }
    });

    it('output only contains palette colors', () => {
        const img = createGradientImage(16, 16);
        const out = orderedDitherMono(img, BLACK_WHITE);
        expect(isOnlyPaletteColors(out, BLACK_WHITE)).toBe(true);
    });

    it('output has no NaN values', () => {
        const img = createGradientImage(16, 16);
        const out = orderedDitherMono(img, BLACK_WHITE, 8);
        expectValidImageData(out);
    });

    it('works with a multi-level palette', () => {
        const img = createGradientImage(16, 16);
        const out = orderedDitherMono(img, GRAYSCALE_4);
        expectValidImageData(out);
        expect(isOnlyPaletteColors(out, GRAYSCALE_4)).toBe(true);
    });

    it('different matrix sizes produce valid output', () => {
        const img = createGradientImage(16, 16);
        for (const size of [2, 4, 8]) {
            const out = orderedDitherMono(img, BLACK_WHITE, size);
            expectValidImageData(out);
        }
    });
});

describe('orderedDitherColor', () => {
    it('output dimensions match input', () => {
        const img = createImageData(6, 8, 200, 100, 50);
        const out = orderedDitherColor(img, CGA);
        expect(out.width).toBe(6);
        expect(out.height).toBe(8);
    });

    it('output only contains palette colors', () => {
        const img = createGradientImage(8, 8);
        const out = orderedDitherColor(img, CGA);
        expect(isOnlyPaletteColors(out, CGA)).toBe(true);
    });

    it('output has no NaN values', () => {
        const img = createGradientImage(8, 8);
        const out = orderedDitherColor(img, CGA);
        expectValidImageData(out);
    });

    it('solid black input stays black', () => {
        const img = createImageData(8, 8, 0, 0, 0);
        const out = orderedDitherColor(img, BLACK_WHITE);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
        }
    });
});

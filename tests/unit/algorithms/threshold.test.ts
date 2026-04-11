import { describe, it, expect } from 'vitest';
import { threshold, thresholdColor } from '../../../src/algorithms/threshold.ts';
import { createImageData, expectValidImageData } from '../../fixtures/images.ts';
import { BLACK_WHITE, CGA, GRAYSCALE_4, createPalette } from '../../fixtures/palettes.ts';

function isOnlyPaletteColors(img: ImageData, palette: typeof BLACK_WHITE): boolean {
    for (let i = 0; i < img.data.length; i += 4) {
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        const match = palette.colors.some(c => c.r === r && c.g === g && c.b === b);
        if (!match) return false;
    }
    return true;
}

describe('threshold', () => {
    it('output dimensions match input', () => {
        const img = createImageData(8, 6, 128, 128, 128);
        const out = threshold(img, BLACK_WHITE);
        expect(out.width).toBe(8);
        expect(out.height).toBe(6);
    });

    it('all-black input → all-black output (nearest to black in BW palette)', () => {
        const img = createImageData(4, 4, 0, 0, 0);
        const out = threshold(img, BLACK_WHITE);
        expectValidImageData(out);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
            expect(out.data[i + 1]).toBe(0);
            expect(out.data[i + 2]).toBe(0);
        }
    });

    it('all-white input → all-white output', () => {
        const img = createImageData(4, 4, 255, 255, 255);
        const out = threshold(img, BLACK_WHITE);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(255);
            expect(out.data[i + 1]).toBe(255);
            expect(out.data[i + 2]).toBe(255);
        }
    });

    it('output only contains palette colors', () => {
        const img = createImageData(8, 8, 128, 128, 128);
        const out = threshold(img, GRAYSCALE_4);
        expect(isOnlyPaletteColors(out, GRAYSCALE_4)).toBe(true);
    });

    it('output has no NaN values', () => {
        const img = createImageData(4, 4, 100, 150, 200);
        const out = threshold(img, BLACK_WHITE);
        expectValidImageData(out);
    });

    it('alpha channel is preserved', () => {
        const img = createImageData(4, 4, 128, 128, 128, 200);
        const out = threshold(img, BLACK_WHITE);
        for (let i = 3; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(200);
        }
    });

    it('works with a 4-color palette', () => {
        const img = createImageData(4, 4, 128, 128, 128);
        const out = threshold(img, GRAYSCALE_4);
        expectValidImageData(out);
        expect(isOnlyPaletteColors(out, GRAYSCALE_4)).toBe(true);
    });
});

describe('thresholdColor', () => {
    it('output dimensions match input', () => {
        const img = createImageData(6, 8, 200, 50, 50);
        const out = thresholdColor(img, CGA);
        expect(out.width).toBe(6);
        expect(out.height).toBe(8);
    });

    it('output only contains palette colors', () => {
        const img = createImageData(8, 8, 100, 200, 50);
        const out = thresholdColor(img, CGA);
        expect(isOnlyPaletteColors(out, CGA)).toBe(true);
    });

    it('maps each pixel to nearest palette color', () => {
        // All-black image with BW palette → all black output
        const img = createImageData(4, 4, 0, 0, 0);
        const out = thresholdColor(img, BLACK_WHITE);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
        }
    });

    it('output has no NaN values', () => {
        const img = createImageData(8, 8, 150, 50, 200);
        const out = thresholdColor(img, CGA, {}, 'euclidean');
        expectValidImageData(out);
    });

    it('preserves alpha channel', () => {
        const img = createImageData(4, 4, 200, 200, 200, 100);
        const out = thresholdColor(img, BLACK_WHITE);
        for (let i = 3; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(100);
        }
    });
});

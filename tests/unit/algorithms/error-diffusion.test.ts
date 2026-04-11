import { describe, it, expect } from 'vitest';
import { errorDiffusionMono, errorDiffusionColor, ERROR_KERNELS } from '../../../src/algorithms/error-diffusion.ts';
import { createImageData, createGradientImage, expectValidImageData } from '../../fixtures/images.ts';
import { BLACK_WHITE, CGA, GRAYSCALE_4 } from '../../fixtures/palettes.ts';

function isOnlyPaletteColors(img: ImageData, palette: typeof BLACK_WHITE): boolean {
    for (let i = 0; i < img.data.length; i += 4) {
        const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
        const match = palette.colors.some(c => c.r === r && c.g === g && c.b === b);
        if (!match) return false;
    }
    return true;
}

describe('ERROR_KERNELS', () => {
    it('each kernel weights sum to 1.0 (via divisor), except Atkinson (intentionally 0.75)', () => {
        for (const [name, kernel] of Object.entries(ERROR_KERNELS)) {
            const weightSum = kernel.offsets.reduce((s, [, , w]) => s + w, 0);
            const ratio = weightSum / kernel.divisor;
            if (name === 'atkinson') {
                // Atkinson deliberately diffuses only 3/4 of error (characteristic of the algorithm)
                expect(ratio).toBeCloseTo(0.75, 5);
            } else {
                expect(ratio, `${name} weights don't sum to 1`).toBeCloseTo(1.0, 5);
            }
        }
    });

    it('floyd-steinberg has exactly 4 neighbors', () => {
        expect(ERROR_KERNELS['floyd-steinberg'].offsets).toHaveLength(4);
    });

    it('jarvis-judice-ninke has 12 neighbors', () => {
        expect(ERROR_KERNELS['jarvis-judice-ninke'].offsets).toHaveLength(12);
    });
});

describe('errorDiffusionMono', () => {
    it('throws for unknown kernel', () => {
        const img = createImageData(4, 4);
        expect(() => errorDiffusionMono(img, BLACK_WHITE, 'nonexistent')).toThrow('Unknown kernel');
    });

    it('output dimensions match input', () => {
        const img = createImageData(8, 6, 128, 128, 128);
        const out = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg');
        expect(out.width).toBe(8);
        expect(out.height).toBe(6);
    });

    it('all-black input → all-black output', () => {
        const img = createImageData(8, 8, 0, 0, 0);
        const out = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg');
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
            expect(out.data[i + 1]).toBe(0);
            expect(out.data[i + 2]).toBe(0);
        }
    });

    it('all-white input → all-white output', () => {
        const img = createImageData(8, 8, 255, 255, 255);
        const out = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg');
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(255);
        }
    });

    it('output only contains palette colors', () => {
        const img = createGradientImage(16, 16);
        const out = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg');
        expect(isOnlyPaletteColors(out, BLACK_WHITE)).toBe(true);
    });

    it('output has no NaN values', () => {
        const img = createGradientImage(8, 8);
        const out = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg');
        expectValidImageData(out);
    });

    it('serpentine=true produces a different result than serpentine=false', () => {
        const img = createGradientImage(16, 16);
        const out1 = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg', { serpentine: false });
        const out2 = errorDiffusionMono(img, BLACK_WHITE, 'floyd-steinberg', { serpentine: true });
        // Results should differ for a gradient image
        const differs = Array.from(out1.data).some((v, i) => v !== out2.data[i]);
        expect(differs).toBe(true);
    });

    it('all supported kernels produce valid output', () => {
        const img = createGradientImage(8, 8);
        for (const kernelName of Object.keys(ERROR_KERNELS)) {
            const out = errorDiffusionMono(img, BLACK_WHITE, kernelName);
            expectValidImageData(out);
            expect(isOnlyPaletteColors(out, BLACK_WHITE)).toBe(true);
        }
    });

    it('works with a multi-level palette (grayscale 4)', () => {
        const img = createGradientImage(16, 16);
        const out = errorDiffusionMono(img, GRAYSCALE_4, 'floyd-steinberg');
        expectValidImageData(out);
        expect(isOnlyPaletteColors(out, GRAYSCALE_4)).toBe(true);
    });
});

describe('errorDiffusionColor', () => {
    it('output dimensions match input', () => {
        const img = createImageData(8, 6, 200, 100, 50);
        const out = errorDiffusionColor(img, CGA, 'floyd-steinberg');
        expect(out.width).toBe(8);
        expect(out.height).toBe(6);
    });

    it('output only contains palette colors', () => {
        const img = createGradientImage(8, 8);
        const out = errorDiffusionColor(img, CGA, 'floyd-steinberg');
        expect(isOnlyPaletteColors(out, CGA)).toBe(true);
    });

    it('output has no NaN values', () => {
        const img = createGradientImage(8, 8);
        const out = errorDiffusionColor(img, CGA, 'floyd-steinberg');
        expectValidImageData(out);
    });

    it('solid black input → black output', () => {
        const img = createImageData(8, 8, 0, 0, 0);
        const out = errorDiffusionColor(img, BLACK_WHITE, 'floyd-steinberg');
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(0);
        }
    });
});

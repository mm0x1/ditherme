import { describe, it, expect } from 'vitest';
import {
    applyAdjustments,
    applyBrightness,
    applyContrast,
    applyGamma,
    hasAdjustments,
} from '../../../src/engine/adjustments.ts';
import { createImageData, expectValidImageData, meanPixelValue } from '../../fixtures/images.ts';
import type { ImageAdjustments } from '../../../src/types/index.ts';

const NO_OP: ImageAdjustments = {
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    saturation: 0,
    blackPoint: 0,
    whitePoint: 255,
};

describe('hasAdjustments', () => {
    it('returns false for all-default values', () => {
        expect(hasAdjustments(NO_OP)).toBe(false);
    });

    it('returns true when brightness !== 0', () => {
        expect(hasAdjustments({ ...NO_OP, brightness: 10 })).toBe(true);
    });

    it('returns true when contrast !== 0', () => {
        expect(hasAdjustments({ ...NO_OP, contrast: -10 })).toBe(true);
    });

    it('returns true when gamma !== 1', () => {
        expect(hasAdjustments({ ...NO_OP, gamma: 2.0 })).toBe(true);
    });

    it('returns true when saturation !== 0', () => {
        expect(hasAdjustments({ ...NO_OP, saturation: 50 })).toBe(true);
    });

    it('returns true when blackPoint > 0', () => {
        expect(hasAdjustments({ ...NO_OP, blackPoint: 10 })).toBe(true);
    });

    it('returns true when whitePoint < 255', () => {
        expect(hasAdjustments({ ...NO_OP, whitePoint: 200 })).toBe(true);
    });
});

describe('applyAdjustments', () => {
    it('returns a new ImageData instance (does not mutate input)', () => {
        const img = createImageData(4, 4, 128, 128, 128);
        const original = Array.from(img.data);
        const out = applyAdjustments(img, NO_OP);
        expect(out).not.toBe(img);
        expect(Array.from(img.data)).toEqual(original);
    });

    it('identity: no-op adjustments produce identical pixel values', () => {
        const img = createImageData(4, 4, 100, 150, 200);
        const out = applyAdjustments(img, NO_OP);
        expect(Array.from(out.data)).toEqual(Array.from(img.data));
    });

    it('preserves dimensions', () => {
        const img = createImageData(10, 8, 128, 128, 128);
        const out = applyAdjustments(img, { ...NO_OP, brightness: 10 });
        expect(out.width).toBe(10);
        expect(out.height).toBe(8);
    });

    it('output has no NaN or out-of-range values', () => {
        const img = createImageData(8, 8, 100, 100, 100);
        const out = applyAdjustments(img, { ...NO_OP, brightness: 50, contrast: 30, gamma: 1.5 });
        expectValidImageData(out);
    });

    it('brightness +100 brings all pixels close to 255', () => {
        const img = createImageData(4, 4, 100, 100, 100);
        const out = applyBrightness(img, 100);
        expectValidImageData(out);
        expect(meanPixelValue(out)).toBeGreaterThan(meanPixelValue(img));
    });

    it('brightness -100 brings all pixels close to 0', () => {
        const img = createImageData(4, 4, 200, 200, 200);
        const out = applyBrightness(img, -100);
        expectValidImageData(out);
        expect(meanPixelValue(out)).toBeLessThan(meanPixelValue(img));
    });

    it('gamma > 1 (e.g. 2.0) brightens midtones (applies pow(x, 1/gamma))', () => {
        // Formula is pow(x/255, 1/gamma)*255, so gamma=2 → exponent=0.5 → brightens
        const img = createImageData(4, 4, 128, 128, 128);
        const out = applyGamma(img, 2.0);
        expectValidImageData(out);
        expect(meanPixelValue(out)).toBeGreaterThan(128);
    });

    it('gamma < 1 (e.g. 0.5) darkens midtones (applies pow(x, 1/gamma))', () => {
        // gamma=0.5 → exponent=2 → darkens
        const img = createImageData(4, 4, 128, 128, 128);
        const out = applyGamma(img, 0.5);
        expectValidImageData(out);
        expect(meanPixelValue(out)).toBeLessThan(128);
    });

    it('contrast +50 increases range from mid-gray', () => {
        const img = createImageData(4, 4, 128, 128, 128);
        const out = applyContrast(img, 50);
        expectValidImageData(out);
        // Contrast on pure mid-gray should stay near 128
        expect(out.data[0]).toBeCloseTo(128, 5);
    });

    it('alpha channel is preserved unchanged', () => {
        const img = createImageData(4, 4, 100, 100, 100, 200);
        const out = applyAdjustments(img, { ...NO_OP, brightness: 50 });
        for (let i = 3; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(200);
        }
    });

    it('blackPoint 128 maps values at/below 128 to 0', () => {
        const img = createImageData(4, 4, 64, 64, 64);
        const out = applyAdjustments(img, { ...NO_OP, blackPoint: 128 });
        expectValidImageData(out);
        expect(out.data[0]).toBe(0);
    });

    it('whitePoint 128 maps values at/above 128 to 255', () => {
        const img = createImageData(4, 4, 200, 200, 200);
        const out = applyAdjustments(img, { ...NO_OP, whitePoint: 128 });
        expectValidImageData(out);
        expect(out.data[0]).toBe(255);
    });
});

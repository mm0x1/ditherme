import { describe, it, expect } from 'vitest';
import { downscaleImage, upscaleImage } from '../../../src/engine/scaling.ts';
import {
    createImageData,
    createGradientImage,
    expectValidImageData,
} from '../../fixtures/images.ts';

describe('downscaleImage', () => {
    it('returns the same instance when scale is 1', () => {
        const img = createImageData(4, 4);
        expect(downscaleImage(img, 1)).toBe(img);
    });

    it('returns the same instance when scale is less than 1', () => {
        const img = createImageData(4, 4);
        expect(downscaleImage(img, 0)).toBe(img);
    });

    it('halves dimensions at scale=2', () => {
        const img = createImageData(8, 8);
        const out = downscaleImage(img, 2);
        expect(out.width).toBe(4);
        expect(out.height).toBe(4);
    });

    it('quarters dimensions at scale=4', () => {
        const img = createImageData(8, 8);
        const out = downscaleImage(img, 4);
        expect(out.width).toBe(2);
        expect(out.height).toBe(2);
    });

    it('produces valid pixel values (no NaN, no out-of-range)', () => {
        const img = createGradientImage(16, 16);
        const out = downscaleImage(img, 2);
        expectValidImageData(out);
    });

    it('1x1 input stays 1x1', () => {
        const img = createImageData(1, 1, 200, 100, 50);
        const out = downscaleImage(img, 2);
        expect(out.width).toBe(1);
        expect(out.height).toBe(1);
        expectValidImageData(out);
    });

    it('odd dimensions do not crash (7x7 at scale=2)', () => {
        const img = createImageData(7, 7, 128, 128, 128);
        expect(() => downscaleImage(img, 2)).not.toThrow();
        const out = downscaleImage(img, 2);
        expectValidImageData(out);
    });

    it('BUG REGRESSION: count=0 guard — no NaN output at image edges', () => {
        // A 1x1 image at scale=4 forces the block sampling loop to check bounds
        const img = createImageData(1, 1, 255, 0, 0);
        const out = downscaleImage(img, 4);
        expectValidImageData(out);
        // Output pixel should be [0,0,0,0] (default) or the source pixel — never NaN
        for (let i = 0; i < out.data.length; i++) {
            expect(isNaN(out.data[i])).toBe(false);
        }
    });

    it('solid color image downscaled preserves the color', () => {
        const img = createImageData(8, 8, 100, 150, 200);
        const out = downscaleImage(img, 2);
        // Each output pixel should be the averaged solid color
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(100);
            expect(out.data[i + 1]).toBe(150);
            expect(out.data[i + 2]).toBe(200);
            expect(out.data[i + 3]).toBe(255);
        }
    });

    it('preserves alpha channel', () => {
        const img = createImageData(4, 4, 255, 255, 255, 128);
        const out = downscaleImage(img, 2);
        expectValidImageData(out);
        for (let i = 3; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(128);
        }
    });
});

describe('upscaleImage', () => {
    it('returns correct target dimensions', () => {
        const img = createImageData(2, 2, 255, 0, 0);
        const out = upscaleImage(img, 8, 8);
        expect(out.width).toBe(8);
        expect(out.height).toBe(8);
    });

    it('solid color upscaled stays the same solid color', () => {
        const img = createImageData(2, 2, 50, 100, 200);
        const out = upscaleImage(img, 8, 8);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(50);
            expect(out.data[i + 1]).toBe(100);
            expect(out.data[i + 2]).toBe(200);
            expect(out.data[i + 3]).toBe(255);
        }
    });

    it('1x1 upscaled to 4x4: all 16 pixels identical to source', () => {
        const img = createImageData(1, 1, 77, 88, 99);
        const out = upscaleImage(img, 4, 4);
        expect(out.width).toBe(4);
        expect(out.height).toBe(4);
        for (let i = 0; i < out.data.length; i += 4) {
            expect(out.data[i]).toBe(77);
            expect(out.data[i + 1]).toBe(88);
            expect(out.data[i + 2]).toBe(99);
        }
    });

    it('produces valid pixel values', () => {
        const img = createGradientImage(4, 4);
        const out = upscaleImage(img, 16, 16);
        expectValidImageData(out);
    });

    it('nearest-neighbor: top-left pixel maps from source top-left', () => {
        const img = createImageData(2, 2, 10, 20, 30);
        // Override top-left pixel to a distinct color
        img.data[0] = 255; img.data[1] = 0; img.data[2] = 0;
        const out = upscaleImage(img, 4, 4);
        // top-left output pixel should be the top-left source
        expect(out.data[0]).toBe(255);
        expect(out.data[1]).toBe(0);
        expect(out.data[2]).toBe(0);
    });
});

describe('round-trip: downscale then upscale', () => {
    it('approximately preserves solid color', () => {
        const img = createImageData(8, 8, 120, 80, 200);
        const downscaled = downscaleImage(img, 2);
        const upscaled = upscaleImage(downscaled, 8, 8);
        expectValidImageData(upscaled);
        // Solid color round-trip should be exact
        expect(upscaled.data[0]).toBe(120);
        expect(upscaled.data[1]).toBe(80);
        expect(upscaled.data[2]).toBe(200);
    });
});

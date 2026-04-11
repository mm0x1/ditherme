import { expect } from 'vitest';

/**
 * Create a solid-color ImageData of the given size.
 */
export function createImageData(
    width: number,
    height: number,
    r = 128, g = 128, b = 128, a = 255
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
    return new ImageData(data, width, height);
}

/**
 * Create an ImageData with a horizontal gradient from black to white.
 */
export function createGradientImage(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = width > 1 ? Math.round((x / (width - 1)) * 255) : 128;
            const i = (y * width + x) * 4;
            data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
        }
    }
    return new ImageData(data, width, height);
}

/**
 * Create an ImageData with a simple repeating pattern for edge-case testing.
 * Even pixels = color A, odd pixels = color B.
 */
export function createCheckerboardImage(
    width: number,
    height: number,
    r1 = 0, g1 = 0, b1 = 0,
    r2 = 255, g2 = 255, b2 = 255
): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if ((x + y) % 2 === 0) {
                data[i] = r1; data[i + 1] = g1; data[i + 2] = b1; data[i + 3] = 255;
            } else {
                data[i] = r2; data[i + 1] = g2; data[i + 2] = b2; data[i + 3] = 255;
            }
        }
    }
    return new ImageData(data, width, height);
}

/**
 * Assert that two ImageData instances are pixel-identical.
 */
export function expectImageEqual(a: ImageData, b: ImageData): void {
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
}

/**
 * Assert no NaN or out-of-range pixel values exist in an ImageData.
 */
export function expectValidImageData(img: ImageData): void {
    for (let i = 0; i < img.data.length; i++) {
        const v = img.data[i];
        expect(isNaN(v), `pixel[${i}] is NaN`).toBe(false);
        expect(v, `pixel[${i}] < 0`).toBeGreaterThanOrEqual(0);
        expect(v, `pixel[${i}] > 255`).toBeLessThanOrEqual(255);
    }
}

/**
 * Compute the mean pixel value (R+G+B channels only) of an ImageData.
 */
export function meanPixelValue(img: ImageData): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < img.data.length; i += 4) {
        sum += img.data[i] + img.data[i + 1] + img.data[i + 2];
        count += 3;
    }
    return sum / count;
}

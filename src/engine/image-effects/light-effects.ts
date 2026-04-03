import { blurImageData } from './blur.ts';
import type { ImageEffectParams } from '../../types/image-effect.ts';

// --- Helpers (unexported) ---

function extractHighlights(input: ImageData, threshold: number): ImageData {
    const output = new ImageData(input.width, input.height);
    const { data } = input;
    const out = output.data;
    for (let i = 0; i < data.length; i += 4) {
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (luma > threshold) {
            out[i]     = data[i];
            out[i + 1] = data[i + 1];
            out[i + 2] = data[i + 2];
        }
        out[i + 3] = 255;
    }
    return output;
}

function screenBlend(base: ImageData, blend: ImageData, opacity: number): ImageData {
    const output = new ImageData(base.width, base.height);
    const b = base.data;
    const bl = blend.data;
    const out = output.data;
    for (let i = 0; i < b.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const baseVal = b[i + c];
            const blendVal = bl[i + c];
            const screened = 255 - ((255 - baseVal) * (255 - blendVal)) / 255;
            out[i + c] = baseVal + opacity * (screened - baseVal);
        }
        out[i + 3] = 255;
    }
    return output;
}

// Linear Dodge (Add): result = min(255, base + blend × opacity).
// Unlike Color Dodge, this CAN brighten pure-black pixels: when base=0 and
// the blurred blend layer has a halo value from nearby bright pixels, the output
// is that halo value × opacity — a visible, physically-accurate spread of light.
// Color Dodge fails on dithered images because base=0 always yields 0.
function addBlend(base: ImageData, blend: ImageData, opacity: number): ImageData {
    const output = new ImageData(base.width, base.height);
    const b = base.data;
    const bl = blend.data;
    const out = output.data;
    for (let i = 0; i < b.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            out[i + c] = Math.min(255, Math.round(b[i + c] + bl[i + c] * opacity));
        }
        out[i + 3] = 255;
    }
    return output;
}

// High-contrast levels adjustment for bloom: pixels at or below threshold → 0,
// pixels above threshold remapped from [threshold, 255] → [0, 255].
// This crushes darks and boosts highlights before blurring, concentrating
// the bloom energy in the bright areas of the image.
function applyLevelsContrast(input: ImageData, threshold: number): ImageData {
    const output = new ImageData(input.width, input.height);
    const { data } = input;
    const out = output.data;
    const range = Math.max(1, 255 - threshold);
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const v = data[i + c];
            out[i + c] = v <= threshold ? 0 : Math.min(255, Math.round((v - threshold) * 255 / range));
        }
        out[i + 3] = 255;
    }
    return output;
}

function tintImageData(input: ImageData, hex: string): ImageData {
    const rMul = parseInt(hex.slice(1, 3), 16) / 255;
    const gMul = parseInt(hex.slice(3, 5), 16) / 255;
    const bMul = parseInt(hex.slice(5, 7), 16) / 255;
    const output = new ImageData(input.width, input.height);
    const { data } = input;
    const out = output.data;
    for (let i = 0; i < data.length; i += 4) {
        out[i]     = data[i]     * rMul;
        out[i + 1] = data[i + 1] * gMul;
        out[i + 2] = data[i + 2] * bMul;
        out[i + 3] = 255;
    }
    return output;
}

// --- Exported effect functions ---

export async function applyHalation(input: ImageData, params: ImageEffectParams): Promise<ImageData> {
    if (params.intensity === 0) return input;
    // Extract pixels above threshold — only those emit the warm glow.
    // Radius controls how far the glow bleeds into surrounding dark areas.
    const highlights = extractHighlights(input, params.threshold);
    const blurred = await blurImageData(highlights, params.radius);
    const tinted = tintImageData(blurred, params.color);
    return screenBlend(input, tinted, params.intensity / 100);
}

export async function applyGlow(input: ImageData, params: ImageEffectParams): Promise<ImageData> {
    if (params.intensity === 0) return input;
    // Blur the full image to create soft halos around all lit areas, then add
    // the blur result on top of the original (Linear Dodge / Add blend).
    // The blur spreads brightness from lit pixels into surrounding dark pixels.
    // Dark pixels adjacent to lit areas receive the halo value × opacity,
    // creating a real visible spread that grows with radius.
    const blurred = await blurImageData(input, params.radius);
    return addBlend(input, blurred, params.intensity / 100);
}

export async function applyBloom(input: ImageData, params: ImageEffectParams): Promise<ImageData> {
    if (params.intensity === 0) return input;
    // Apply high-contrast levels adjustment first: pixels at or below threshold → black,
    // above threshold remapped to [0, 255]. This concentrates the blur's energy on
    // highlights only, so only bright areas emit the bloom spread.
    // Then add the blurred result on top (Linear Dodge) so dark pixels adjacent to
    // highlights receive real visible brightening — the halo/bloom spread.
    const leveled = applyLevelsContrast(input, params.threshold);
    const blurred = await blurImageData(leveled, params.radius);
    return addBlend(input, blurred, params.intensity / 100);
}

/**
 * Layer compositor for post-processing effects
 */

import { pinLight } from './blend-modes.ts';
import type { PostEffect } from '../types/index.ts';

export type BlendMode = 'normal' | 'pin-light' | 'luminosity' | 'color';

export interface CompositorLayer {
    imageData: ImageData;
    blendMode: BlendMode;
}

/**
 * Composite layers bottom-to-top using specified blend modes.
 * layers[0] is the base layer (blendMode ignored).
 */
export async function composite(layers: CompositorLayer[]): Promise<ImageData> {
    const { width, height } = layers[0].imageData;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // Draw base layer
    ctx.putImageData(layers[0].imageData, 0, 0);

    for (let i = 1; i < layers.length; i++) {
        const layer = layers[i];

        if (layer.blendMode === 'pin-light') {
            const base = ctx.getImageData(0, 0, width, height);
            const blend = layer.imageData;
            const out = new ImageData(width, height);

            for (let p = 0; p < base.data.length; p += 4) {
                out.data[p]     = pinLight(blend.data[p]     / 255, base.data[p]     / 255) * 255;
                out.data[p + 1] = pinLight(blend.data[p + 1] / 255, base.data[p + 1] / 255) * 255;
                out.data[p + 2] = pinLight(blend.data[p + 2] / 255, base.data[p + 2] / 255) * 255;
                out.data[p + 3] = 255;
            }

            ctx.putImageData(out, 0, 0);
        } else {
            ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
            ctx.drawImage(await createImageBitmap(layer.imageData), 0, 0);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    return ctx.getImageData(0, 0, width, height);
}

/**
 * Build compositor layer stack for a given post-effect.
 * Returns null when effect is 'none' (no compositing needed).
 */
export function buildEffectLayers(
    effect: PostEffect,
    source: ImageData,
    dithered: ImageData,
    effectColor: string,
    brightDither: ImageData | null
): CompositorLayer[] | null {
    const w = source.width;
    const h = source.height;
    switch (effect) {
        case 'none': return null;
        case 'luminous-pin-light':
            if (!brightDither) throw new Error('luminous-pin-light requires brightDither');
            return [
                { imageData: source,       blendMode: 'normal'     },
                { imageData: dithered,     blendMode: 'luminosity' },
                { imageData: brightDither, blendMode: 'pin-light'  },
            ];
        case 'classic-luma-dither':
            return [
                { imageData: source,   blendMode: 'normal'     },
                { imageData: dithered, blendMode: 'luminosity' },
            ];
        case 'punchy-pin-light':
            return [
                { imageData: source,   blendMode: 'normal'    },
                { imageData: dithered, blendMode: 'pin-light' },
            ];
        case 'duotone-pin-cutout':
            return [
                { imageData: createSolidFill(effectColor, w, h), blendMode: 'normal'    },
                { imageData: dithered,                           blendMode: 'pin-light' },
            ];
        case 'chroma-pin-composite':
            return [
                { imageData: source,                             blendMode: 'normal'    },
                { imageData: createSolidFill(effectColor, w, h), blendMode: 'color'     },
                { imageData: dithered,                           blendMode: 'pin-light' },
            ];
    }
}

/**
 * Copy the alpha channel from `mask` onto `target` in place.
 *
 * Effects (pin-light compositing, light/chroma image effects) rebuild the pixel
 * buffer with a hardcoded opaque alpha, discarding source transparency. The
 * dithered result carries the correct source alpha, so we re-stamp it as the
 * final step of the pipeline. `target` and `mask` must share dimensions.
 */
export function applyAlphaMask(target: ImageData, mask: ImageData): void {
    const t = target.data;
    const m = mask.data;
    for (let i = 3; i < t.length; i += 4) {
        t[i] = m[i];
    }
}

/**
 * Create a solid-color ImageData fill from a hex color string.
 */
export function createSolidFill(hex: string, width: number, height: number): ImageData {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const imageData = new ImageData(width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i]     = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
    }
    return imageData;
}

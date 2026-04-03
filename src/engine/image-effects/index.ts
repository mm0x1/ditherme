import type { ImageEffect, ImageEffectParams } from '../../types/image-effect.ts';
import { applyHalation, applyGlow, applyBloom } from './light-effects.ts';
import { applyChromaAberration } from './chroma-aberration.ts';

export async function applyImageEffect(
    input: ImageData,
    effect: ImageEffect,
    params: ImageEffectParams
): Promise<ImageData> {
    switch (effect) {
        case 'none':              return input;
        case 'halation':          return applyHalation(input, params);
        case 'glow':              return applyGlow(input, params);
        case 'bloom':             return applyBloom(input, params);
        case 'chroma-aberration': return applyChromaAberration(input, params);
    }
}

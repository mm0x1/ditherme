import type { ImageEffectParams } from '../../types/image-effect.ts';

export function applyChromaAberration(
    input: ImageData,
    params: ImageEffectParams
): ImageData {
    const amount = Math.round(params.amount * params.intensity / 100);
    if (amount === 0) return input;

    const { width, height, data } = input;
    const output = new ImageData(width, height);
    const out = output.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dst = (y * width + x) * 4;

            // R channel shifted right (+amount)
            const rx = Math.max(0, Math.min(width - 1, x - amount));
            out[dst]     = data[(y * width + rx) * 4];

            // G channel unchanged
            out[dst + 1] = data[dst + 1];

            // B channel shifted left (-amount)
            const bx = Math.max(0, Math.min(width - 1, x + amount));
            out[dst + 2] = data[(y * width + bx) * 4 + 2];

            out[dst + 3] = 255;
        }
    }
    return output;
}

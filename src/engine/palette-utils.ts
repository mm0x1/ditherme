/**
 * Shared palette reduction utility used by both the main dither engine and video worker.
 */

import type { Palette, ColorMatchMethod, Color } from '../types/index.ts';
import { getColorDistanceFunction } from './color.ts';

/**
 * Reduce palette to N most representative colors based on image content.
 * Returns the original palette unchanged if levels is 0 or >= palette size.
 */
export function reducePalette(
    imageData: ImageData,
    palette: Palette,
    levels: number,
    colorMatchMethod: ColorMatchMethod
): Palette {
    if (palette.colors.length === 0) {
        throw new Error('Cannot reduce empty palette');
    }
    if (levels <= 0 || levels >= palette.colors.length) {
        return palette;
    }

    const distanceFunc = getColorDistanceFunction(colorMatchMethod);

    const colorUsage = new Map<number, number>();
    palette.colors.forEach((_, i) => colorUsage.set(i, 0));

    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const sampleRate = totalPixels > 100000 ? Math.ceil(totalPixels / 50000) : 1;

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const pixelColor: Color = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        };

        let minDist = Infinity;
        let nearestIdx = 0;
        for (let j = 0; j < palette.colors.length; j++) {
            const dist = distanceFunc(pixelColor, palette.colors[j]);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = j;
            }
        }

        colorUsage.set(nearestIdx, (colorUsage.get(nearestIdx) || 0) + 1);
    }

    const sortedIndices = Array.from(colorUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    const reducedColors = sortedIndices
        .slice(0, levels)
        .map(idx => palette.colors[idx]);

    if (reducedColors.length < 2) {
        reducedColors.push({ r: 0, g: 0, b: 0 });
        reducedColors.push({ r: 255, g: 255, b: 255 });
    }

    return {
        name: `${palette.name} (${levels} levels)`,
        colors: reducedColors
    };
}

import type { Palette, Color } from '../../src/types/index.ts';

export const BLACK_WHITE: Palette = {
    name: 'Black & White',
    colors: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }],
};

export const CGA: Palette = {
    name: 'CGA',
    colors: [
        { r: 0, g: 0, b: 0 },
        { r: 85, g: 255, b: 255 },
        { r: 255, g: 85, b: 255 },
        { r: 255, g: 255, b: 255 },
    ],
};

export const GRAYSCALE_4: Palette = {
    name: 'Grayscale 4',
    colors: [
        { r: 0, g: 0, b: 0 },
        { r: 85, g: 85, b: 85 },
        { r: 170, g: 170, b: 170 },
        { r: 255, g: 255, b: 255 },
    ],
};

export const SINGLE_COLOR: Palette = {
    name: 'Single',
    colors: [{ r: 255, g: 0, b: 0 }],
};

export const EMPTY: Palette = { name: 'Empty', colors: [] };

export function createPalette(colors: Color[], name = 'Test'): Palette {
    return { name, colors: colors.map(c => ({ ...c })) };
}

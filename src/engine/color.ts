import type { Color, LABColor, ColorMatchMethod } from '../types/index.ts';

/**
 * Clamp value to 0-255 range
 */
export function clamp(value: number, min = 0, max = 255): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Convert RGB to grayscale luminance (0-255)
 */
export function rgbToLuminance(r: number, g: number, b: number): number {
    // ITU-R BT.601 standard weights
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Convert RGB to linear RGB
 */
export function sRGBToLinear(value: number): number {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to sRGB
 */
export function linearToSRGB(value: number): number {
    const v = value <= 0.0031308
        ? 12.92 * value
        : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    return Math.round(v * 255);
}

/**
 * Convert RGB to XYZ color space
 */
export function rgbToXYZ(r: number, g: number, b: number): { x: number; y: number; z: number } {
    // Convert to linear RGB first
    const lr = sRGBToLinear(r);
    const lg = sRGBToLinear(g);
    const lb = sRGBToLinear(b);

    // Convert to XYZ using D65 illuminant
    return {
        x: lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
        y: lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750,
        z: lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041
    };
}

/**
 * Convert XYZ to LAB color space
 */
export function xyzToLAB(x: number, y: number, z: number): LABColor {
    // D65 reference white
    const refX = 0.95047;
    const refY = 1.00000;
    const refZ = 1.08883;

    const fx = labF(x / refX);
    const fy = labF(y / refY);
    const fz = labF(z / refZ);

    return {
        l: 116 * fy - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

/**
 * LAB helper function
 */
function labF(t: number): number {
    const delta = 6 / 29;
    return t > delta ** 3
        ? Math.cbrt(t)
        : t / (3 * delta ** 2) + 4 / 29;
}

/**
 * Convert RGB to LAB
 */
export function rgbToLAB(r: number, g: number, b: number): LABColor {
    const xyz = rgbToXYZ(r, g, b);
    return xyzToLAB(xyz.x, xyz.y, xyz.z);
}

/**
 * Euclidean distance in RGB space
 */
export function colorDistanceEuclidean(c1: Color, c2: Color): number {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Euclidean distance with perceptual weighting (CCIR 601)
 */
export function colorDistanceWeighted(c1: Color, c2: Color): number {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    // Weighted based on human perception
    return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

/**
 * CIE76 color difference (Delta E)
 */
export function colorDistanceCIE76(c1: Color, c2: Color): number {
    const lab1 = rgbToLAB(c1.r, c1.g, c1.b);
    const lab2 = rgbToLAB(c2.r, c2.g, c2.b);

    const dl = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;

    return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * CIE94 color difference
 */
export function colorDistanceCIE94(c1: Color, c2: Color): number {
    const lab1 = rgbToLAB(c1.r, c1.g, c1.b);
    const lab2 = rgbToLAB(c2.r, c2.g, c2.b);

    const dl = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;

    const c1c = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2c = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const dc = c1c - c2c;

    const dh2 = da * da + db * db - dc * dc;
    const dh = dh2 > 0 ? Math.sqrt(dh2) : 0;

    const sl = 1;
    const sc = 1 + 0.045 * c1c;
    const sh = 1 + 0.015 * c1c;

    return Math.sqrt(
        (dl / sl) ** 2 +
        (dc / sc) ** 2 +
        (dh / sh) ** 2
    );
}

/**
 * CIEDE2000 color difference (most accurate)
 */
export function colorDistanceCIEDE2000(c1: Color, c2: Color): number {
    const lab1 = rgbToLAB(c1.r, c1.g, c1.b);
    const lab2 = rgbToLAB(c2.r, c2.g, c2.b);

    const kL = 1;
    const kC = 1;
    const kH = 1;

    const L1 = lab1.l;
    const a1 = lab1.a;
    const b1 = lab1.b;
    const L2 = lab2.l;
    const a2 = lab2.a;
    const b2 = lab2.b;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cab = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));
    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);

    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    const h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
    const h1pp = h1p >= 0 ? h1p : h1p + 360;
    const h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
    const h2pp = h2p >= 0 ? h2p : h2p + 360;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp: number;
    if (C1p * C2p === 0) {
        dhp = 0;
    } else if (Math.abs(h2pp - h1pp) <= 180) {
        dhp = h2pp - h1pp;
    } else if (h2pp - h1pp > 180) {
        dhp = h2pp - h1pp - 360;
    } else {
        dhp = h2pp - h1pp + 360;
    }

    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;

    let Hp: number;
    if (C1p * C2p === 0) {
        Hp = h1pp + h2pp;
    } else if (Math.abs(h1pp - h2pp) <= 180) {
        Hp = (h1pp + h2pp) / 2;
    } else if (h1pp + h2pp < 360) {
        Hp = (h1pp + h2pp + 360) / 2;
    } else {
        Hp = (h1pp + h2pp - 360) / 2;
    }

    const T = 1
        - 0.17 * Math.cos((Hp - 30) * Math.PI / 180)
        + 0.24 * Math.cos(2 * Hp * Math.PI / 180)
        + 0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180)
        - 0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180);

    const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;

    const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
    const RT = -RC * Math.sin(2 * dTheta * Math.PI / 180);

    return Math.sqrt(
        Math.pow(dLp / (kL * SL), 2) +
        Math.pow(dCp / (kC * SC), 2) +
        Math.pow(dHp / (kH * SH), 2) +
        RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
    );
}

/**
 * Luminance-only distance
 */
export function colorDistanceLuminance(c1: Color, c2: Color): number {
    const l1 = rgbToLuminance(c1.r, c1.g, c1.b);
    const l2 = rgbToLuminance(c2.r, c2.g, c2.b);
    return Math.abs(l1 - l2);
}

/**
 * Get color distance function for a given method
 */
export function getColorDistanceFunction(method: ColorMatchMethod): (c1: Color, c2: Color) => number {
    switch (method) {
        case 'euclidean':
            return colorDistanceEuclidean;
        case 'luminance':
            return colorDistanceLuminance;
        case 'ciede2000':
            return colorDistanceCIEDE2000;
        case 'cie94':
            return colorDistanceCIE94;
        case 'cie76':
            return colorDistanceCIE76;
        case 'srgb-ccir':
        case 'linear-ccir':
            return colorDistanceWeighted;
        default:
            return colorDistanceEuclidean;
    }
}

/**
 * Find nearest color in palette
 */
export function findNearestColor(
    color: Color,
    palette: Color[],
    distanceFunc: (c1: Color, c2: Color) => number = colorDistanceEuclidean
): Color {
    if (palette.length === 0) {
        throw new Error('Cannot find nearest color in empty palette');
    }
    let minDist = Infinity;
    let nearest = palette[0];

    for (const paletteColor of palette) {
        const dist = distanceFunc(color, paletteColor);
        if (dist < minDist) {
            minDist = dist;
            nearest = paletteColor;
        }
    }

    return nearest;
}

/**
 * Find nearest color index in palette
 */
export function findNearestColorIndex(
    color: Color,
    palette: Color[],
    distanceFunc: (c1: Color, c2: Color) => number = colorDistanceEuclidean
): number {
    if (palette.length === 0) {
        throw new Error('Cannot find nearest color in empty palette');
    }
    let minDist = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
        const dist = distanceFunc(color, palette[i]);
        if (dist < minDist) {
            minDist = dist;
            nearestIndex = i;
        }
    }

    return nearestIndex;
}

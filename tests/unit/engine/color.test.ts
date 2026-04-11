import { describe, it, expect } from 'vitest';
import {
    clamp,
    rgbToLuminance,
    sRGBToLinear,
    linearToSRGB,
    rgbToXYZ,
    rgbToLAB,
    colorDistanceEuclidean,
    colorDistanceCIEDE2000,
    colorDistanceCIE94,
    colorDistanceCIE76,
    colorDistanceWeighted,
    colorDistanceLuminance,
    getColorDistanceFunction,
    findNearestColor,
    findNearestColorIndex,
} from '../../../src/engine/color.ts';
import type { Color } from '../../../src/types/index.ts';

const BLACK: Color = { r: 0, g: 0, b: 0 };
const WHITE: Color = { r: 255, g: 255, b: 255 };
const RED: Color = { r: 255, g: 0, b: 0 };
const GREEN: Color = { r: 0, g: 255, b: 0 };
const BLUE: Color = { r: 0, g: 0, b: 255 };
const GRAY: Color = { r: 128, g: 128, b: 128 };

describe('clamp', () => {
    it('passes through in-range values', () => {
        expect(clamp(100)).toBe(100);
        expect(clamp(0)).toBe(0);
        expect(clamp(255)).toBe(255);
    });

    it('clamps below minimum', () => {
        expect(clamp(-1)).toBe(0);
        expect(clamp(-100)).toBe(0);
    });

    it('clamps above maximum', () => {
        expect(clamp(256)).toBe(255);
        expect(clamp(1000)).toBe(255);
    });

    it('works with custom min/max', () => {
        expect(clamp(5, -10, 10)).toBe(5);
        expect(clamp(-20, -10, 10)).toBe(-10);
        expect(clamp(20, -10, 10)).toBe(10);
    });
});

describe('rgbToLuminance', () => {
    it('black → 0', () => {
        expect(rgbToLuminance(0, 0, 0)).toBe(0);
    });

    it('white → 255', () => {
        expect(rgbToLuminance(255, 255, 255)).toBeCloseTo(255, 0);
    });

    it('pure red uses BT.601 weight 0.299', () => {
        expect(rgbToLuminance(255, 0, 0)).toBeCloseTo(0.299 * 255, 1);
    });

    it('pure green uses BT.601 weight 0.587', () => {
        expect(rgbToLuminance(0, 255, 0)).toBeCloseTo(0.587 * 255, 1);
    });

    it('pure blue uses BT.601 weight 0.114', () => {
        expect(rgbToLuminance(0, 0, 255)).toBeCloseTo(0.114 * 255, 1);
    });
});

describe('sRGBToLinear / linearToSRGB round-trip', () => {
    it('0 maps to 0', () => {
        expect(sRGBToLinear(0)).toBeCloseTo(0);
        expect(linearToSRGB(0)).toBe(0);
    });

    it('255 maps to ~1 in linear, and back to 255', () => {
        expect(sRGBToLinear(255)).toBeCloseTo(1, 3);
        expect(linearToSRGB(1)).toBe(255);
    });

    it('round-trip is identity for sample values', () => {
        for (const v of [0, 64, 128, 192, 255]) {
            const linear = sRGBToLinear(v);
            const back = linearToSRGB(linear);
            expect(back).toBeCloseTo(v, 0);
        }
    });
});

describe('rgbToXYZ', () => {
    it('black → (0, 0, 0)', () => {
        const xyz = rgbToXYZ(0, 0, 0);
        expect(xyz.x).toBeCloseTo(0);
        expect(xyz.y).toBeCloseTo(0);
        expect(xyz.z).toBeCloseTo(0);
    });

    it('white → D65 reference white approximately', () => {
        const xyz = rgbToXYZ(255, 255, 255);
        expect(xyz.x).toBeCloseTo(0.9505, 2);
        expect(xyz.y).toBeCloseTo(1.0000, 2);
        expect(xyz.z).toBeCloseTo(1.0888, 2);
    });
});

describe('rgbToLAB', () => {
    it('black → L≈0', () => {
        const lab = rgbToLAB(0, 0, 0);
        expect(lab.l).toBeCloseTo(0, 1);
    });

    it('white → L≈100', () => {
        const lab = rgbToLAB(255, 255, 255);
        expect(lab.l).toBeCloseTo(100, 1);
    });

    it('pure red has known L,a,b values', () => {
        const lab = rgbToLAB(255, 0, 0);
        expect(lab.l).toBeCloseTo(53.23, 0);
        expect(lab.a).toBeCloseTo(80.11, 0);
        expect(lab.b).toBeCloseTo(67.22, 0);
    });
});

describe('colorDistanceEuclidean', () => {
    it('identical colors → 0', () => {
        expect(colorDistanceEuclidean(RED, RED)).toBe(0);
        expect(colorDistanceEuclidean(BLACK, BLACK)).toBe(0);
    });

    it('black vs white → sqrt(3 * 255²) ≈ 441.67', () => {
        expect(colorDistanceEuclidean(BLACK, WHITE)).toBeCloseTo(441.67, 1);
    });

    it('is symmetric', () => {
        expect(colorDistanceEuclidean(RED, BLUE)).toBeCloseTo(
            colorDistanceEuclidean(BLUE, RED), 10
        );
    });

    it('returns a non-negative value', () => {
        expect(colorDistanceEuclidean(GRAY, RED)).toBeGreaterThanOrEqual(0);
    });
});

describe('colorDistanceCIEDE2000', () => {
    it('identical colors → 0', () => {
        expect(colorDistanceCIEDE2000(WHITE, WHITE)).toBeCloseTo(0, 5);
    });

    it('is symmetric', () => {
        const d1 = colorDistanceCIEDE2000(RED, BLUE);
        const d2 = colorDistanceCIEDE2000(BLUE, RED);
        expect(d1).toBeCloseTo(d2, 5);
    });

    it('returns non-negative value', () => {
        expect(colorDistanceCIEDE2000(RED, GREEN)).toBeGreaterThan(0);
    });

    it('black vs white is a large distance', () => {
        expect(colorDistanceCIEDE2000(BLACK, WHITE)).toBeGreaterThan(50);
    });
});

describe('colorDistanceCIE94', () => {
    it('identical colors → 0', () => {
        expect(colorDistanceCIE94(GRAY, GRAY)).toBeCloseTo(0, 5);
    });

    it('returns non-negative value', () => {
        expect(colorDistanceCIE94(RED, GREEN)).toBeGreaterThan(0);
    });

    it('black vs white is a large distance', () => {
        // CIE94 is not symmetric by design (reference color affects chroma weighting)
        expect(colorDistanceCIE94(BLACK, WHITE)).toBeGreaterThan(10);
    });
});

describe('colorDistanceCIE76', () => {
    it('identical colors → 0', () => {
        expect(colorDistanceCIE76(BLACK, BLACK)).toBeCloseTo(0, 5);
    });

    it('black vs white is a large distance', () => {
        expect(colorDistanceCIE76(BLACK, WHITE)).toBeGreaterThan(50);
    });
});

describe('colorDistanceWeighted', () => {
    it('identical colors → 0', () => {
        expect(colorDistanceWeighted(RED, RED)).toBe(0);
    });

    it('is symmetric', () => {
        expect(colorDistanceWeighted(RED, BLUE)).toBeCloseTo(
            colorDistanceWeighted(BLUE, RED), 10
        );
    });
});

describe('colorDistanceLuminance', () => {
    it('identical luminance → 0', () => {
        expect(colorDistanceLuminance(BLACK, BLACK)).toBe(0);
    });

    it('black vs white → ~255', () => {
        expect(colorDistanceLuminance(BLACK, WHITE)).toBeCloseTo(255, 0);
    });
});

describe('getColorDistanceFunction', () => {
    const methods = ['euclidean', 'luminance', 'ciede2000', 'cie94', 'cie76', 'srgb-ccir', 'linear-ccir'] as const;

    for (const method of methods) {
        it(`returns a callable function for "${method}"`, () => {
            const fn = getColorDistanceFunction(method);
            expect(typeof fn).toBe('function');
            expect(fn(RED, BLUE)).toBeGreaterThanOrEqual(0);
        });
    }

    it('unknown method falls back to euclidean', () => {
        // @ts-expect-error testing unknown method
        const fn = getColorDistanceFunction('unknown-method');
        expect(fn(BLACK, WHITE)).toBeCloseTo(colorDistanceEuclidean(BLACK, WHITE), 5);
    });
});

describe('findNearestColor', () => {
    it('throws on empty palette', () => {
        expect(() => findNearestColor(RED, [])).toThrow('empty palette');
    });

    it('returns exact match when present', () => {
        const palette = [BLACK, RED, WHITE];
        expect(findNearestColor(RED, palette)).toEqual(RED);
    });

    it('returns closest color when no exact match', () => {
        const palette = [BLACK, WHITE];
        const almostBlack: Color = { r: 10, g: 10, b: 10 };
        expect(findNearestColor(almostBlack, palette)).toEqual(BLACK);
    });

    it('works with all distance methods', () => {
        const methods = [colorDistanceEuclidean, colorDistanceLuminance, colorDistanceCIE76];
        const palette = [BLACK, WHITE];
        for (const fn of methods) {
            const result = findNearestColor(GRAY, palette, fn);
            expect(result).toBeDefined();
            expect([BLACK, WHITE]).toContainEqual(result);
        }
    });
});

describe('findNearestColorIndex', () => {
    it('throws on empty palette', () => {
        expect(() => findNearestColorIndex(RED, [])).toThrow('empty palette');
    });

    it('returns index, not color object', () => {
        const palette = [BLACK, RED, WHITE];
        const idx = findNearestColorIndex(RED, palette);
        expect(typeof idx).toBe('number');
        expect(idx).toBe(1);
    });

    it('returns 0 for first color when it is the exact match', () => {
        const palette = [BLACK, WHITE];
        expect(findNearestColorIndex(BLACK, palette)).toBe(0);
    });

    it('returns correct index for last color', () => {
        const palette = [BLACK, GREEN, WHITE];
        expect(findNearestColorIndex(WHITE, palette)).toBe(2);
    });
});

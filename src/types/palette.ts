/**
 * RGB color representation
 */
export interface Color {
    r: number;  // 0-255
    g: number;  // 0-255
    b: number;  // 0-255
    a?: number; // Optional alpha, 0-255
}

/**
 * CIE LAB color representation
 */
export interface LABColor {
    l: number;  // Lightness: 0-100
    a: number;  // Green-Red: -128 to 127
    b: number;  // Blue-Yellow: -128 to 127
}

/**
 * Color matching/distance method
 */
export type ColorMatchMethod =
    | 'euclidean'
    | 'ciede2000'
    | 'cie94'
    | 'cie76'
    | 'luminance'
    | 'hsv'
    | 'linear'
    | 'srgb-ccir'
    | 'linear-ccir'
    | 'tetrapal';

/**
 * Color quantization algorithm
 */
export type QuantizationMethod =
    | 'median-cut'
    | 'wu'
    | 'neuquant'
    | 'kmeans';

/**
 * Standard CIE illuminants
 */
export type Illuminant =
    | 'D93' | 'D75' | 'D65' | 'D55' | 'D50'
    | 'A' | 'B' | 'C' | 'E'
    | 'F1' | 'F2' | 'F3' | 'F7' | 'F11';

/**
 * Named color palette
 */
export interface Palette {
    name: string;
    colors: Color[];
}

/**
 * Saved palette with metadata for persistence
 */
export interface SavedPalette {
    id: string;
    name: string;
    colors: Color[];
    createdAt: number;
    updatedAt: number;
    source?: 'imported' | 'generated' | 'custom';
}

/**
 * LAB color matching options
 */
export interface LABMatchOptions {
    hueWeight: number;      // Default: 0.91
    chromaWeight: number;   // Default: 0.84
    valueWeight: number;    // Default: 0.96
    illuminant: Illuminant; // Default: D65
}

/**
 * Quantization options
 */
export interface QuantizationOptions {
    paletteSize: number;           // 2-256
    includeBlackWhite?: boolean;
    includeRGBPrimaries?: boolean;
    includeCMY?: boolean;
    uniqueOnly?: boolean;
}

/**
 * Built-in palette identifier
 */
export type BuiltInPalette =
    | 'mono'
    | 'cga'
    | 'ega'
    | 'mac16'
    | 'windows16'
    | 'pico8'
    | 'c64'
    | 'nes'
    | 'gameboy'
    | 'gameboy-pocket'
    | 'grayscale4'
    | 'grayscale8'
    | 'grayscale16'
    | 'websafe';

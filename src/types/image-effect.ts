export type ImageEffect =
    | 'none'
    | 'halation'
    | 'glow'
    | 'bloom'
    | 'chroma-aberration';

export interface ImageEffectParams {
    intensity: number;  // 0–100, used by all effects
    radius: number;     // 2–60px, used by halation, glow, bloom
    color: string;      // '#rrggbb', used by halation tint
    amount: number;     // 1–20px, used by chroma-aberration
    threshold: number;  // 0–255 luminance cutoff; pixels above this emit light
}

export interface ImageEffectMeta {
    id: ImageEffect;
    label: string;
    hasRadius: boolean;    // shows Radius slider
    hasColor: boolean;     // shows Color picker
    hasAmount: boolean;    // shows Amount slider (chroma-aberration)
    hasThreshold: boolean; // shows Threshold slider (halation, glow, bloom)
}

export const IMAGE_EFFECTS: ImageEffectMeta[] = [
    { id: 'none',              label: 'None',                 hasRadius: false, hasColor: false, hasAmount: false, hasThreshold: false },
    { id: 'halation',          label: 'Halation',             hasRadius: true,  hasColor: true,  hasAmount: false, hasThreshold: true  },
    { id: 'glow',              label: 'Glow',                 hasRadius: true,  hasColor: false, hasAmount: false, hasThreshold: false },
    { id: 'bloom',             label: 'Bloom',                hasRadius: true,  hasColor: false, hasAmount: false, hasThreshold: true  },
    { id: 'chroma-aberration', label: 'Chromatic Aberration', hasRadius: false, hasColor: false, hasAmount: true,  hasThreshold: false },
];

export const DEFAULT_IMAGE_EFFECT_PARAMS: ImageEffectParams = {
    intensity: 50,
    radius: 10,
    color: '#ff4400',
    amount: 3,
    threshold: 100,
};

export function getImageEffectMeta(id: ImageEffect): ImageEffectMeta {
    return IMAGE_EFFECTS.find(e => e.id === id)!;
}

/**
 * Post-processing effect types
 */

export type PostEffect =
    | 'none'
    | 'luminous-pin-light'
    | 'classic-luma-dither'
    | 'punchy-pin-light'
    | 'duotone-pin-cutout'
    | 'chroma-pin-composite';

export interface PostEffectMeta {
    id: PostEffect;
    label: string;
    requiresColor: boolean;
    tooltip: string;        // summary + Photoshop recipe
}

export const POST_EFFECTS: PostEffectMeta[] = [
    {
        id: 'none',
        label: 'No Effect',
        requiresColor: false,
        tooltip: 'Raw dither output — no compositing applied.',
    },
    {
        id: 'classic-luma-dither',
        label: 'Cinegrain',
        requiresColor: false,
        tooltip: 'Maps the dither\'s luminance onto the source image\'s hue and saturation, preserving color while applying the dither pattern as a tonal mask.\n\nPhotoshop: Source image [Normal] → Dither [Luminosity]',
    },
    {
        id: 'punchy-pin-light',
        label: 'Twinkle',
        requiresColor: false,
        tooltip: 'Composites the dither over the source image using Pin Light, producing high-contrast cutouts where bright dither pixels push highlights and dark pixels cut shadows.\n\nPhotoshop: Source image [Normal] → Dither [Pin Light]',
    },
    {
        id: 'luminous-pin-light',
        label: 'Cinetwinkle',
        requiresColor: false,
        tooltip: 'Two independent dither passes: the first maps luminance onto the source colors (Luminosity), the second adds sparkle and edge contrast (Pin Light). Each pass has its own adjustment settings.\n\nPhotoshop: Source image [Normal] → Dither [Luminosity] → Layer 2 dither [Pin Light]',
    },
    {
        id: 'duotone-pin-cutout',
        label: 'Tint',
        requiresColor: true,
        tooltip: 'Cuts the dither pattern through a solid color fill using Pin Light. Dark dither pixels reveal the fill color; bright pixels push toward white. No source image involved.\n\nPhotoshop: Solid fill (chosen color) [Normal] → Dither [Pin Light]',
    },
    {
        id: 'chroma-pin-composite',
        label: 'Chroma',
        requiresColor: true,
        tooltip: 'Tints the source image with the chosen color via the Color blend mode, then overlays the dither using Pin Light for texture and contrast.\n\nPhotoshop: Source image [Normal] → Solid fill (chosen color) [Color] → Dither [Pin Light]',
    },
];

export function getPostEffectMeta(id: PostEffect): PostEffectMeta {
    return POST_EFFECTS.find(e => e.id === id)!;
}

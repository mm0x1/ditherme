/**
 * Blend mode utility functions for pixel compositing
 */

/**
 * Pin Light blend mode
 * blend = top layer channel, base = bottom layer channel, both normalized [0,1]
 */
export function pinLight(blend: number, base: number): number {
    return blend < 0.5
        ? Math.min(base, 2 * blend)
        : Math.max(base, 2 * blend - 1);
}

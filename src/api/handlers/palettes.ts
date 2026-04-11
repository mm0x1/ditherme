/**
 * GET /api/palettes and POST /api/palette Handlers
 * Palette management
 */

import type { APIRequest, APIResponse, APIContext, PalettesResponse, PaletteInfo, SetPaletteRequest } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';
import { BUILTIN_PALETTES } from '../../data/palettes/presets.ts';
import type { Color, BuiltInPalette, Palette } from '../../types/index.ts';

/**
 * Storage key for saved palettes
 */
const SAVED_PALETTES_KEY = 'ditherme_saved_palettes';

/**
 * Get saved palettes from localStorage
 */
function getSavedPalettes(): Array<{ id: string; name: string; colors: Color[] }> {
    try {
        const stored = localStorage.getItem(SAVED_PALETTES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.debug('[Palettes] Failed to parse saved palettes from localStorage:', e);
    }
    return [];
}

/**
 * Handle GET /api/palettes
 * Returns all available palettes (built-in + saved)
 */
export async function handleGetPalettes(
    _req: APIRequest,
    _context: APIContext
): Promise<APIResponse> {
    // Get built-in palettes
    const builtin: PaletteInfo[] = Object.entries(BUILTIN_PALETTES).map(([id, palette]) => ({
        id,
        name: palette.name,
        colorCount: palette.colors.length,
        colors: palette.colors
    }));

    // Get saved palettes
    const savedPalettes = getSavedPalettes();
    const saved: PaletteInfo[] = savedPalettes.map(p => ({
        id: p.id,
        name: p.name,
        colorCount: p.colors.length,
        colors: p.colors
    }));

    const response: PalettesResponse = {
        builtin,
        saved
    };

    return createResponse(response);
}

/**
 * Handle POST /api/palette
 * Sets the current palette
 */
export async function handleSetPalette(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = req.body as SetPaletteRequest;

    if (!body) {
        throw APIError.badRequest('Request body required');
    }

    let palette: Palette;

    if (body.preset) {
        // Use built-in preset
        const builtinPalette = BUILTIN_PALETTES[body.preset as BuiltInPalette];
        if (!builtinPalette) {
            // Check saved palettes
            const savedPalettes = getSavedPalettes();
            const savedPalette = savedPalettes.find(p => p.id === body.preset);

            if (!savedPalette) {
                throw APIError.invalidPalette(`Unknown palette: ${body.preset}`);
            }

            palette = {
                name: savedPalette.name,
                colors: savedPalette.colors
            };
        } else {
            palette = builtinPalette;
        }
    } else if (body.colors) {
        // Use custom colors
        if (!Array.isArray(body.colors)) {
            throw APIError.invalidPalette('colors must be an array');
        }

        if (body.colors.length < 2) {
            throw APIError.invalidPalette('Palette must have at least 2 colors');
        }

        if (body.colors.length > 256) {
            throw APIError.invalidPalette('Palette cannot have more than 256 colors');
        }

        // Validate colors
        for (let i = 0; i < body.colors.length; i++) {
            const color = body.colors[i];
            if (!isValidColor(color)) {
                throw APIError.invalidPalette(
                    `Invalid color at index ${i}. Each color must have r, g, b values (0-255)`
                );
            }
        }

        palette = {
            name: body.name || 'Custom',
            colors: body.colors
        };
    } else {
        throw APIError.badRequest('Either "preset" or "colors" is required');
    }

    // Apply the palette
    context.setAppState({ palette });

    return createResponse({
        success: true,
        palette: {
            name: palette.name,
            colorCount: palette.colors.length,
            colors: palette.colors
        }
    });
}

/**
 * Validate a color object
 */
function isValidColor(color: unknown): color is Color {
    if (!color || typeof color !== 'object') return false;

    const c = color as Record<string, unknown>;

    return (
        typeof c.r === 'number' && c.r >= 0 && c.r <= 255 &&
        typeof c.g === 'number' && c.g >= 0 && c.g <= 255 &&
        typeof c.b === 'number' && c.b >= 0 && c.b <= 255
    );
}

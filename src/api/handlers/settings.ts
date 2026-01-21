/**
 * GET/POST /api/settings Handlers
 * Get and update dithering settings
 */

import type { APIRequest, APIResponse, APIContext, SettingsResponse, SettingsUpdateRequest } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';
import { ALGORITHMS } from '../../algorithms/index.ts';
import { BUILTIN_PALETTES } from '../../data/palettes/presets.ts';
import type { Algorithm, Palette, Color, ColorMatchMethod, AlgorithmOptions } from '../../types/index.ts';
import type { ImageAdjustments } from '../types.ts';

/**
 * Handle GET /api/settings
 * Returns current dithering settings
 */
export async function handleGetSettings(
    _req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const state = context.getAppState();

    const response: SettingsResponse = {
        mode: state.mode,
        algorithm: state.algorithm,
        options: state.options,
        palette: {
            name: state.palette.name,
            colors: state.palette.colors
        },
        colorMatch: state.colorMatch,
        pixelScale: state.pixelScale,
        levels: state.levels,
        adjustments: state.adjustments
    };

    return createResponse(response);
}

/**
 * Handle POST /api/settings
 * Updates dithering settings
 */
export async function handleUpdateSettings(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = req.body as SettingsUpdateRequest;

    if (!body || typeof body !== 'object') {
        throw APIError.badRequest('Request body must be a JSON object');
    }

    const updates: Partial<{
        mode: 'mono' | 'color';
        algorithm: Algorithm;
        options: AlgorithmOptions;
        palette: Palette;
        colorMatch: ColorMatchMethod;
        pixelScale: number;
        levels: number;
        adjustments: ImageAdjustments;
    }> = {};

    // Validate and apply mode
    if (body.mode !== undefined) {
        if (body.mode !== 'mono' && body.mode !== 'color') {
            throw APIError.badRequest('Invalid mode. Must be "mono" or "color"');
        }
        updates.mode = body.mode;
    }

    // Validate and apply algorithm
    if (body.algorithm !== undefined) {
        if (!ALGORITHMS[body.algorithm as Algorithm]) {
            throw APIError.invalidAlgorithm(body.algorithm);
        }
        updates.algorithm = body.algorithm as Algorithm;
    }

    // Apply algorithm options
    if (body.options !== undefined) {
        updates.options = body.options;
    }

    // Validate and apply palette
    if (body.palette !== undefined) {
        if (typeof body.palette === 'string') {
            // Look up built-in palette
            const builtinPalette = BUILTIN_PALETTES[body.palette as keyof typeof BUILTIN_PALETTES];
            if (!builtinPalette) {
                throw APIError.invalidPalette(`Unknown palette: ${body.palette}`);
            }
            updates.palette = builtinPalette;
        } else if (Array.isArray(body.palette)) {
            // Custom palette colors
            if (body.palette.length < 2) {
                throw APIError.invalidPalette('Palette must have at least 2 colors');
            }
            if (body.palette.length > 256) {
                throw APIError.invalidPalette('Palette cannot have more than 256 colors');
            }

            // Validate each color
            for (const color of body.palette) {
                if (!isValidColor(color)) {
                    throw APIError.invalidPalette('Invalid color format. Each color must have r, g, b values (0-255)');
                }
            }

            updates.palette = {
                name: 'Custom',
                colors: body.palette as Color[]
            };
        } else {
            throw APIError.invalidPalette('Palette must be a string (preset name) or array of colors');
        }
    }

    // Validate and apply color match method
    if (body.colorMatch !== undefined) {
        const validMethods: ColorMatchMethod[] = [
            'euclidean', 'ciede2000', 'cie94', 'cie76', 'luminance',
            'hsv', 'linear', 'srgb-ccir', 'linear-ccir', 'tetrapal'
        ];
        if (!validMethods.includes(body.colorMatch)) {
            throw APIError.badRequest(`Invalid colorMatch method. Valid values: ${validMethods.join(', ')}`);
        }
        updates.colorMatch = body.colorMatch;
    }

    // Validate and apply pixel scale
    if (body.pixelScale !== undefined) {
        const scale = Number(body.pixelScale);
        if (isNaN(scale) || scale < 1 || scale > 16 || !Number.isInteger(scale)) {
            throw APIError.badRequest('pixelScale must be an integer between 1 and 16');
        }
        updates.pixelScale = scale;
    }

    // Validate and apply levels
    if (body.levels !== undefined) {
        const levels = Number(body.levels);
        if (isNaN(levels) || levels < 0 || levels > 256 || !Number.isInteger(levels)) {
            throw APIError.badRequest('levels must be an integer between 0 and 256 (0 = disabled)');
        }
        updates.levels = levels;
    }

    // Validate and apply adjustments
    if (body.adjustments !== undefined) {
        const currentState = context.getAppState();
        const adjustments = { ...currentState.adjustments };

        if (body.adjustments.brightness !== undefined) {
            const v = Number(body.adjustments.brightness);
            if (isNaN(v) || v < -100 || v > 100) {
                throw APIError.badRequest('brightness must be between -100 and 100');
            }
            adjustments.brightness = v;
        }

        if (body.adjustments.contrast !== undefined) {
            const v = Number(body.adjustments.contrast);
            if (isNaN(v) || v < -100 || v > 100) {
                throw APIError.badRequest('contrast must be between -100 and 100');
            }
            adjustments.contrast = v;
        }

        if (body.adjustments.gamma !== undefined) {
            const v = Number(body.adjustments.gamma);
            if (isNaN(v) || v < 0.1 || v > 3.0) {
                throw APIError.badRequest('gamma must be between 0.1 and 3.0');
            }
            adjustments.gamma = v;
        }

        if (body.adjustments.saturation !== undefined) {
            const v = Number(body.adjustments.saturation);
            if (isNaN(v) || v < -100 || v > 100) {
                throw APIError.badRequest('saturation must be between -100 and 100');
            }
            adjustments.saturation = v;
        }

        if (body.adjustments.blackPoint !== undefined) {
            const v = Number(body.adjustments.blackPoint);
            if (isNaN(v) || v < 0 || v > 128) {
                throw APIError.badRequest('blackPoint must be between 0 and 128');
            }
            adjustments.blackPoint = v;
        }

        if (body.adjustments.whitePoint !== undefined) {
            const v = Number(body.adjustments.whitePoint);
            if (isNaN(v) || v < 128 || v > 255) {
                throw APIError.badRequest('whitePoint must be between 128 and 255');
            }
            adjustments.whitePoint = v;
        }

        updates.adjustments = adjustments;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
        context.setAppState(updates);
    }

    // Return updated settings
    const newState = context.getAppState();

    return createResponse({
        success: true,
        settings: {
            mode: newState.mode,
            algorithm: newState.algorithm,
            options: newState.options,
            palette: {
                name: newState.palette.name,
                colors: newState.palette.colors
            },
            colorMatch: newState.colorMatch,
            pixelScale: newState.pixelScale,
            levels: newState.levels,
            adjustments: newState.adjustments
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

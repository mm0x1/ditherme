/**
 * POST /api/dither Handler
 * Trigger dithering operation
 */

import type { APIRequest, APIResponse, APIContext, DitherRequest, DitherResponse } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';
import { handleUpdateSettings } from './settings.ts';

/**
 * Handle POST /api/dither
 * Triggers dithering with optional settings override
 */
export async function handleDither(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = (req.body || {}) as DitherRequest;

    // Check if image is loaded
    const sourceImage = context.getSourceImage();
    if (!sourceImage) {
        throw APIError.noImage();
    }

    // Check if already processing
    const state = context.getAppState();
    if (state.isProcessing) {
        throw APIError.processing();
    }

    // Apply settings if provided
    if (body.settings && Object.keys(body.settings).length > 0) {
        await handleUpdateSettings(
            { ...req, body: body.settings },
            context
        );
    }

    // Trigger dithering
    const startTime = performance.now();

    try {
        await context.triggerDither();
    } catch (error) {
        throw APIError.internal(
            `Dithering failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    const duration = performance.now() - startTime;

    const response: DitherResponse = {
        success: true,
        duration: Math.round(duration)
    };

    return createResponse(response);
}

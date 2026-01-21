/**
 * POST /api/load Handler
 * Load image/video from various sources
 */

import type { APIRequest, APIResponse, APIContext, LoadRequest, LoadResponse, ImageSource } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';

/**
 * Handle POST /api/load
 * Loads an image from base64, URL, or file path
 */
export async function handleLoad(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = req.body as LoadRequest;

    if (!body || !body.source) {
        throw APIError.badRequest('Request body must include a "source" object');
    }

    const source = body.source;

    // Validate source type
    if (!source.type || !['base64', 'url', 'file'].includes(source.type)) {
        throw APIError.badRequest('source.type must be "base64", "url", or "file"');
    }

    // Validate source data based on type
    if (source.type === 'base64') {
        if (!source.data || typeof source.data !== 'string') {
            throw APIError.badRequest('source.data is required for base64 source');
        }
        if (!source.mimeType || typeof source.mimeType !== 'string') {
            throw APIError.badRequest('source.mimeType is required for base64 source (e.g., "image/png")');
        }
    } else if (source.type === 'url') {
        if (!source.url || typeof source.url !== 'string') {
            throw APIError.badRequest('source.url is required for url source');
        }
        // Basic URL validation
        try {
            new URL(source.url);
        } catch {
            throw APIError.badRequest('Invalid URL format');
        }
    } else if (source.type === 'file') {
        if (!source.path || typeof source.path !== 'string') {
            throw APIError.badRequest('source.path is required for file source');
        }
        // Basic path validation (prevent directory traversal)
        if (source.path.includes('..')) {
            throw APIError.badRequest('Invalid file path: directory traversal not allowed');
        }
    }

    // Load the image
    try {
        await context.loadImage(source as ImageSource);
    } catch (error) {
        throw APIError.badRequest(
            `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    // Get the loaded image info
    const sourceImage = context.getSourceImage();
    const state = context.getAppState();

    if (!sourceImage) {
        throw APIError.internal('Image loaded but not available');
    }

    const response: LoadResponse = {
        success: true,
        width: sourceImage.width,
        height: sourceImage.height,
        fileName: state.originalFileName || 'image'
    };

    return createResponse(response);
}

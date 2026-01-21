/**
 * POST /api/export Handler
 * Export image with format/quality settings
 */

import type { APIRequest, APIResponse, APIContext, ExportRequest } from '../types.ts';
import { APIError } from '../middleware/error.ts';
import { handleResult } from './result.ts';

/**
 * Handle POST /api/export
 * Exports the dithered image with specified settings
 */
export async function handleExport(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = req.body as ExportRequest;

    if (!body || !body.format) {
        throw APIError.badRequest('Request body must include "format" (png, jpeg, or webp)');
    }

    // Validate format
    const format = body.format.toLowerCase();
    if (!['png', 'jpeg', 'webp'].includes(format)) {
        throw APIError.invalidFormat(body.format);
    }

    // Build query params for result handler
    const query: Record<string, string> = {
        format,
        encoding: 'base64'
    };

    if (body.quality !== undefined) {
        query.quality = String(body.quality);
    }

    if (body.scale !== undefined) {
        query.scale = String(body.scale);
    }

    // Delegate to result handler
    return handleResult(
        { ...req, query },
        context
    );
}

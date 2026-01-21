/**
 * GET /api/result Handler
 * Get dithered result image
 */

import type { APIRequest, APIResponse, APIContext, ResultResponse } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';

/**
 * Handle GET /api/result
 * Returns the dithered image in requested format
 */
export async function handleResult(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const query = req.query;

    // Get format (default: png)
    const format = (query.format || 'png').toLowerCase();
    if (!['png', 'jpeg', 'webp'].includes(format)) {
        throw APIError.invalidFormat(format);
    }

    // Get quality (default: 92 for jpeg/webp)
    const quality = query.quality ? parseInt(query.quality, 10) : 92;
    if (isNaN(quality) || quality < 1 || quality > 100) {
        throw APIError.badRequest('quality must be between 1 and 100');
    }

    // Get scale (default: 1)
    const scale = query.scale ? parseFloat(query.scale) : 1;
    if (isNaN(scale) || scale <= 0 || scale > 10) {
        throw APIError.badRequest('scale must be between 0 and 10');
    }

    // Get encoding (default: base64)
    const encoding = (query.encoding || 'base64').toLowerCase();
    if (!['base64', 'binary'].includes(encoding)) {
        throw APIError.badRequest('encoding must be "base64" or "binary"');
    }

    // Get the dithered image
    const ditheredImage = context.getDitheredImage();
    if (!ditheredImage) {
        // Try to get source image if no dithered result
        const sourceImage = context.getSourceImage();
        if (!sourceImage) {
            throw APIError.noImage();
        }
        throw APIError.badRequest('No dithered result available. Call /api/dither first.');
    }

    // Create canvas and render the image
    const canvas = new OffscreenCanvas(
        Math.round(ditheredImage.width * scale),
        Math.round(ditheredImage.height * scale)
    );
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw APIError.internal('Failed to create canvas context');
    }

    // Create temporary canvas for the source image data
    const tempCanvas = new OffscreenCanvas(ditheredImage.width, ditheredImage.height);
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
        throw APIError.internal('Failed to create temporary canvas context');
    }

    tempCtx.putImageData(ditheredImage, 0, 0);

    // Scale if needed
    if (scale !== 1) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // Convert to blob
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: format === 'png' ? undefined : quality / 100
    });

    if (encoding === 'binary') {
        // Return binary data
        const arrayBuffer = await blob.arrayBuffer();

        return {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Length': String(arrayBuffer.byteLength),
                'Content-Disposition': `attachment; filename="result.${format}"`
            },
            body: arrayBuffer
        };
    }

    // Return base64 encoded
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const response: ResultResponse = {
        format: mimeType,
        width: canvas.width,
        height: canvas.height,
        data: base64
    };

    return createResponse(response);
}

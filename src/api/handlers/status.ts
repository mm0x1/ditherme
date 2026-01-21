/**
 * GET /api/status Handler
 * App status, loaded image/video info, processing state
 */

import type { APIRequest, APIResponse, APIContext, StatusResponse } from '../types.ts';
import { createResponse } from '../types.ts';

/**
 * Handle GET /api/status
 * Returns current application status
 */
export async function handleStatus(
    _req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const state = context.getAppState();
    const sourceImage = context.getSourceImage();

    const response: StatusResponse = {
        status: state.isProcessing ? 'processing' : 'ready',
        hasImage: state.hasImage,
        image: state.hasImage && sourceImage ? {
            width: sourceImage.width,
            height: sourceImage.height,
            fileName: state.originalFileName
        } : null,
        isVideoMode: state.isVideoMode,
        currentSettings: {
            mode: state.mode,
            algorithm: state.algorithm,
            palette: state.palette.name,
            pixelScale: state.pixelScale,
            levels: state.levels
        }
    };

    return createResponse(response);
}

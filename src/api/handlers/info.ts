/**
 * GET /api/info Handler
 * API discovery - version, capabilities, endpoints
 */

import type { APIRequest, APIResponse, APIContext, InfoResponse } from '../types.ts';
import { createResponse } from '../types.ts';
import { getRouteInfo } from '../routes.ts';
import { API_VERSION } from '../index.ts';

/**
 * Handle GET /api/info
 * Returns API metadata for discovery
 */
export async function handleInfo(
    _req: APIRequest,
    _context: APIContext
): Promise<APIResponse> {
    const response: InfoResponse = {
        name: 'dithertoy',
        version: '1.0.0', // App version
        apiVersion: API_VERSION,
        capabilities: [
            'dithering',
            'palettes',
            'adjustments',
            'batch-processing',
            'video-mode'
        ],
        endpoints: getRouteInfo()
    };

    return createResponse(response);
}

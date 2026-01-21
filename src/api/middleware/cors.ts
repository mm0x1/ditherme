/**
 * CORS Middleware
 * Adds Cross-Origin Resource Sharing headers to responses
 */

import type { APIResponse } from '../types.ts';

/**
 * Default CORS configuration
 */
const CORS_CONFIG = {
    // Allow all origins for localhost API (can be restricted in settings)
    allowOrigin: '*',

    // Allowed methods
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Allowed headers
    allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],

    // Exposed headers (headers the client can read)
    exposeHeaders: [
        'Content-Length',
        'Content-Type',
        'X-Request-Id'
    ],

    // Max age for preflight cache (24 hours)
    maxAge: 86400,

    // Allow credentials (cookies, auth headers)
    credentials: false
};

/**
 * Apply CORS headers to a response
 */
export function applyCors(response: APIResponse): APIResponse {
    const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': CORS_CONFIG.allowOrigin,
        'Access-Control-Allow-Methods': CORS_CONFIG.allowMethods.join(', '),
        'Access-Control-Allow-Headers': CORS_CONFIG.allowHeaders.join(', '),
        'Access-Control-Expose-Headers': CORS_CONFIG.exposeHeaders.join(', '),
        'Access-Control-Max-Age': String(CORS_CONFIG.maxAge)
    };

    if (CORS_CONFIG.credentials) {
        corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    return {
        ...response,
        headers: {
            ...corsHeaders,
            ...response.headers
        }
    };
}

/**
 * Create CORS preflight response
 */
export function createPreflightResponse(): APIResponse {
    return applyCors({
        status: 204,
        headers: {},
        body: null
    });
}

/**
 * Authentication Middleware
 * Bearer token validation for API requests
 */

import type { APIRequest, APIResponse, APIContext } from '../types.ts';
import { createErrorResponse, ErrorCodes } from '../types.ts';

/**
 * Check authentication if enabled
 * Returns null if auth passes, error response if auth fails
 */
export function checkAuth(req: APIRequest, context: APIContext): APIResponse | null {
    // Skip auth check if not enabled
    if (!context.isAuthEnabled()) {
        return null;
    }

    const expectedToken = context.getAuthToken();

    // If auth is enabled but no token configured, deny all
    if (!expectedToken) {
        return createErrorResponse(
            'API authentication is enabled but no token is configured',
            ErrorCodes.INTERNAL_ERROR,
            500
        );
    }

    // Get authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return createErrorResponse(
            'Authorization header required',
            ErrorCodes.UNAUTHORIZED,
            401
        );
    }

    // Expect "Bearer <token>" format
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return createErrorResponse(
            'Invalid authorization format. Use: Bearer <token>',
            ErrorCodes.UNAUTHORIZED,
            401
        );
    }

    const providedToken = parts[1];

    // Constant-time comparison to prevent timing attacks
    if (!secureCompare(providedToken, expectedToken)) {
        return createErrorResponse(
            'Invalid API token',
            ErrorCodes.UNAUTHORIZED,
            401
        );
    }

    // Auth passed
    return null;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Generate a random API token
 */
export function generateToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    return Array.from(array)
        .map(byte => chars[byte % chars.length])
        .join('');
}

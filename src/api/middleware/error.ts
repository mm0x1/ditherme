/**
 * Error Handling Middleware
 * Formats error responses consistently
 */

import type { APIResponse } from '../types.ts';
import { createErrorResponse, ErrorCodes } from '../types.ts';

/**
 * Handle errors and convert to API response
 */
export function handleError(error: unknown): APIResponse {
    console.error('[API Error]', error);

    // Handle known error types
    if (error instanceof APIError) {
        return createErrorResponse(error.message, error.code, error.status, error.details);
    }

    if (error instanceof SyntaxError) {
        // JSON parse error
        return createErrorResponse(
            'Invalid JSON in request body',
            ErrorCodes.BAD_REQUEST,
            400
        );
    }

    if (error instanceof TypeError) {
        // Type error (often from accessing properties on null/undefined)
        return createErrorResponse(
            error.message,
            ErrorCodes.BAD_REQUEST,
            400
        );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return createErrorResponse(
        message,
        ErrorCodes.INTERNAL_ERROR,
        500
    );
}

/**
 * Custom API error class for throwing structured errors
 */
export class APIError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status: number = 400,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'APIError';
    }

    /**
     * Create a bad request error
     */
    static badRequest(message: string, details?: unknown): APIError {
        return new APIError(message, ErrorCodes.BAD_REQUEST, 400, details);
    }

    /**
     * Create a not found error
     */
    static notFound(message: string): APIError {
        return new APIError(message, ErrorCodes.NOT_FOUND, 404);
    }

    /**
     * Create an unauthorized error
     */
    static unauthorized(message: string): APIError {
        return new APIError(message, ErrorCodes.UNAUTHORIZED, 401);
    }

    /**
     * Create an internal error
     */
    static internal(message: string): APIError {
        return new APIError(message, ErrorCodes.INTERNAL_ERROR, 500);
    }

    /**
     * Create a no image error
     */
    static noImage(): APIError {
        return new APIError('No image loaded', ErrorCodes.NO_IMAGE, 400);
    }

    /**
     * Create an invalid algorithm error
     */
    static invalidAlgorithm(algorithm: string): APIError {
        return new APIError(
            `Invalid algorithm: ${algorithm}`,
            ErrorCodes.INVALID_ALGORITHM,
            400
        );
    }

    /**
     * Create an invalid palette error
     */
    static invalidPalette(reason: string): APIError {
        return new APIError(
            `Invalid palette: ${reason}`,
            ErrorCodes.INVALID_PALETTE,
            400
        );
    }

    /**
     * Create an invalid format error
     */
    static invalidFormat(format: string): APIError {
        return new APIError(
            `Invalid format: ${format}`,
            ErrorCodes.INVALID_FORMAT,
            400
        );
    }

    /**
     * Create a batch not found error
     */
    static batchNotFound(id: string): APIError {
        return new APIError(
            `Batch job not found: ${id}`,
            ErrorCodes.BATCH_NOT_FOUND,
            404
        );
    }

    /**
     * Create a processing error
     */
    static processing(): APIError {
        return new APIError(
            'Another operation is in progress',
            ErrorCodes.PROCESSING,
            409
        );
    }
}

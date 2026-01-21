/**
 * API Route Definitions
 * Defines all available API endpoints
 */

import type { Route, HttpMethod } from './types.ts';

// Handler imports (will be implemented in Phase 2)
import { handleInfo } from './handlers/info.ts';
import { handleStatus } from './handlers/status.ts';
import { handleAlgorithms } from './handlers/algorithms.ts';
import { handleGetSettings, handleUpdateSettings } from './handlers/settings.ts';
import { handleLoad } from './handlers/load.ts';
import { handleDither } from './handlers/dither.ts';
import { handleResult } from './handlers/result.ts';
import { handleExport } from './handlers/export.ts';
import { handleGetPalettes, handleSetPalette } from './handlers/palettes.ts';
import { handleCreateBatch, handleGetBatch, handleStartBatch, handleCancelBatch } from './handlers/batch.ts';

/**
 * All API routes
 */
export const routes: Route[] = [
    // Discovery & Status
    {
        method: 'GET',
        path: '/api/info',
        handler: handleInfo,
        description: 'API discovery - version, capabilities, endpoints'
    },
    {
        method: 'GET',
        path: '/api/status',
        handler: handleStatus,
        description: 'App status, loaded image/video info, processing state'
    },

    // Algorithms
    {
        method: 'GET',
        path: '/api/algorithms',
        handler: handleAlgorithms,
        description: 'List all algorithms with parameters'
    },

    // Settings
    {
        method: 'GET',
        path: '/api/settings',
        handler: handleGetSettings,
        description: 'Get current dithering settings'
    },
    {
        method: 'POST',
        path: '/api/settings',
        handler: handleUpdateSettings,
        description: 'Update dithering settings'
    },

    // Image Operations
    {
        method: 'POST',
        path: '/api/load',
        handler: handleLoad,
        description: 'Load image/video (base64, file path, or URL)'
    },
    {
        method: 'POST',
        path: '/api/dither',
        handler: handleDither,
        description: 'Trigger dithering (optional settings override)'
    },
    {
        method: 'GET',
        path: '/api/result',
        handler: handleResult,
        description: 'Get dithered result (png/jpeg/webp, base64 or binary)'
    },
    {
        method: 'POST',
        path: '/api/export',
        handler: handleExport,
        description: 'Export with format/quality settings'
    },

    // Palettes
    {
        method: 'GET',
        path: '/api/palettes',
        handler: handleGetPalettes,
        description: 'List available palettes (built-in + saved)'
    },
    {
        method: 'POST',
        path: '/api/palette',
        handler: handleSetPalette,
        description: 'Set custom palette'
    },

    // Batch Processing
    {
        method: 'POST',
        path: '/api/batch',
        handler: handleCreateBatch,
        description: 'Queue batch processing job'
    },
    {
        method: 'GET',
        path: '/api/batch/:id',
        handler: handleGetBatch,
        description: 'Get batch job status/results'
    },
    {
        method: 'POST',
        path: '/api/batch/:id/start',
        handler: handleStartBatch,
        description: 'Start a pending batch job'
    },
    {
        method: 'POST',
        path: '/api/batch/:id/cancel',
        handler: handleCancelBatch,
        description: 'Cancel a batch job'
    }
];

/**
 * Get route info for API discovery
 */
export function getRouteInfo(): Array<{ method: HttpMethod; path: string; description: string }> {
    return routes.map(({ method, path, description }) => ({
        method,
        path,
        description: description || ''
    }));
}

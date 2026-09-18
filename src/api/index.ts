/**
 * Scripting API Module
 * HTTP-based REST API for external control of ditherme
 */

// Type exports
export type {
    APIRequest,
    APIResponse,
    APIContext,
    RouteHandler,
    Route,
    HttpMethod,
    AppStateSnapshot,
    ImageSource,
    ImageAdjustments,
    BatchJob,
    BatchJobItem,
    BatchJobSettings,
    BatchJobResult,
    BatchQueue,
    // Endpoint types
    InfoResponse,
    StatusResponse,
    AlgorithmsResponse,
    SettingsResponse,
    SettingsUpdateRequest,
    LoadRequest,
    LoadResponse,
    DitherRequest,
    DitherResponse,
    ResultQuery,
    ResultResponse,
    ExportRequest,
    PalettesResponse,
    PaletteInfo,
    SetPaletteRequest,
    BatchRequest,
    BatchResponse,
    BatchStatusResponse,
    ErrorResponse
} from './types.ts';

// Response helpers
export {
    createResponse,
    createErrorResponse,
    ErrorCodes
} from './types.ts';

// Router
export { handleRequest, createAPIRequest } from './router.ts';

// Routes
export { routes, getRouteInfo } from './routes.ts';

// Middleware
export { applyCors, createPreflightResponse } from './middleware/cors.ts';
export { checkAuth, generateToken } from './middleware/auth.ts';
export { handleError, APIError } from './middleware/error.ts';

// Batch queue
export { BatchQueueManager } from './batch-queue.ts';

// Default API port
export const DEFAULT_API_PORT = 7842;

// API version
export const API_VERSION = '1.0.0';

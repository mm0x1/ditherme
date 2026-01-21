/**
 * API Types
 * Request/response types for the scripting API
 */

import type { Algorithm, AlgorithmOptions, Palette, ColorMatchMethod, Color } from '../types/index.ts';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

/**
 * API Request abstraction (works with both Node.js http and Service Worker)
 */
export interface APIRequest {
    method: HttpMethod;
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
}

/**
 * API Response abstraction
 */
export interface APIResponse {
    status: number;
    headers: Record<string, string>;
    body: unknown;
}

/**
 * Route handler function type
 */
export type RouteHandler = (req: APIRequest, context: APIContext) => Promise<APIResponse>;

/**
 * Route definition
 */
export interface Route {
    method: HttpMethod;
    path: string;
    handler: RouteHandler;
    description?: string;
}

/**
 * API context passed to handlers
 */
export interface APIContext {
    /** Get current app state */
    getAppState: () => AppStateSnapshot;
    /** Update app state */
    setAppState: (updates: Partial<AppStateSnapshot>) => void;
    /** Trigger dithering */
    triggerDither: () => Promise<void>;
    /** Get source image as ImageData */
    getSourceImage: () => ImageData | null;
    /** Get dithered image as ImageData */
    getDitheredImage: () => ImageData | null;
    /** Load image from various sources */
    loadImage: (source: ImageSource) => Promise<void>;
    /** Get batch queue */
    getBatchQueue: () => BatchQueue;
    /** Check if API auth is enabled */
    isAuthEnabled: () => boolean;
    /** Get auth token */
    getAuthToken: () => string | null;
}

/**
 * Snapshot of app state for API responses
 */
export interface AppStateSnapshot {
    // Algorithm
    mode: 'mono' | 'color';
    algorithm: Algorithm;
    options: AlgorithmOptions;

    // Palette
    palette: Palette;
    colorMatch: ColorMatchMethod;

    // Dither Settings
    pixelScale: number;
    levels: number;

    // Adjustments
    adjustments: ImageAdjustments;

    // Image info
    hasImage: boolean;
    imageWidth: number | null;
    imageHeight: number | null;
    originalFileName: string | null;

    // Processing state
    isProcessing: boolean;

    // Video state
    isVideoMode: boolean;
}

/**
 * Image adjustments
 */
export interface ImageAdjustments {
    brightness: number;
    contrast: number;
    gamma: number;
    saturation: number;
    blackPoint: number;
    whitePoint: number;
}

/**
 * Image source for loading
 */
export type ImageSource =
    | { type: 'base64'; data: string; mimeType: string }
    | { type: 'url'; url: string }
    | { type: 'file'; path: string };

/**
 * Batch job definition
 */
export interface BatchJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    completed: number;
    failed: number;
    createdAt: number;
    startedAt: number | null;
    completedAt: number | null;
    items: BatchJobItem[];
    settings: BatchJobSettings;
    results: BatchJobResult[];
    error?: string;
}

/**
 * Batch job item
 */
export interface BatchJobItem {
    source: ImageSource;
    outputName?: string;
}

/**
 * Batch job settings
 */
export interface BatchJobSettings {
    algorithm: Algorithm;
    options?: AlgorithmOptions;
    palette?: Palette;
    colorMatch?: ColorMatchMethod;
    pixelScale?: number;
    levels?: number;
    adjustments?: Partial<ImageAdjustments>;
    export: {
        format: 'png' | 'jpeg' | 'webp';
        quality?: number;
        scale?: number;
    };
}

/**
 * Batch job result
 */
export interface BatchJobResult {
    index: number;
    success: boolean;
    outputName: string;
    data?: string; // Base64 encoded result
    error?: string;
}

/**
 * Batch queue interface
 */
export interface BatchQueue {
    createJob(items: BatchJobItem[], settings: BatchJobSettings): BatchJob;
    getJob(id: string): BatchJob | undefined;
    startJob(id: string): Promise<void>;
    cancelJob(id: string): void;
    getAllJobs(): BatchJob[];
}

// --- Endpoint-specific types ---

/**
 * GET /api/info response
 */
export interface InfoResponse {
    name: string;
    version: string;
    apiVersion: string;
    capabilities: string[];
    endpoints: EndpointInfo[];
}

/**
 * Endpoint info for discovery
 */
export interface EndpointInfo {
    method: HttpMethod;
    path: string;
    description: string;
}

/**
 * GET /api/status response
 */
export interface StatusResponse {
    status: 'ready' | 'processing' | 'error';
    hasImage: boolean;
    image: {
        width: number;
        height: number;
        fileName: string | null;
    } | null;
    isVideoMode: boolean;
    currentSettings: {
        mode: 'mono' | 'color';
        algorithm: Algorithm;
        palette: string;
        pixelScale: number;
        levels: number;
    };
}

/**
 * GET /api/algorithms response
 */
export interface AlgorithmsResponse {
    mono: AlgorithmCategoryGroup[];
    color: AlgorithmCategoryGroup[];
}

/**
 * Algorithm category group
 */
export interface AlgorithmCategoryGroup {
    category: string;
    algorithms: AlgorithmDetail[];
}

/**
 * Algorithm detail for API
 */
export interface AlgorithmDetail {
    id: string;
    name: string;
    description?: string;
    warning?: string;
    hasWasm?: boolean;
    options?: AlgorithmOptionDefinition[];
}

/**
 * Algorithm option definition
 */
export interface AlgorithmOptionDefinition {
    name: string;
    type: 'boolean' | 'number' | 'string' | 'select';
    default: unknown;
    description?: string;
    min?: number;
    max?: number;
    options?: string[];
}

/**
 * GET /api/settings response
 */
export interface SettingsResponse {
    mode: 'mono' | 'color';
    algorithm: Algorithm;
    options: AlgorithmOptions;
    palette: {
        name: string;
        colors: Color[];
    };
    colorMatch: ColorMatchMethod;
    pixelScale: number;
    levels: number;
    adjustments: ImageAdjustments;
}

/**
 * POST /api/settings request
 */
export interface SettingsUpdateRequest {
    mode?: 'mono' | 'color';
    algorithm?: Algorithm;
    options?: AlgorithmOptions;
    palette?: string | Color[];
    colorMatch?: ColorMatchMethod;
    pixelScale?: number;
    levels?: number;
    adjustments?: Partial<ImageAdjustments>;
}

/**
 * POST /api/load request
 */
export interface LoadRequest {
    source: ImageSource;
}

/**
 * POST /api/load response
 */
export interface LoadResponse {
    success: boolean;
    width: number;
    height: number;
    fileName: string;
}

/**
 * POST /api/dither request
 */
export interface DitherRequest {
    settings?: SettingsUpdateRequest;
    waitForResult?: boolean;
}

/**
 * POST /api/dither response
 */
export interface DitherResponse {
    success: boolean;
    duration?: number;
}

/**
 * GET /api/result query params
 */
export interface ResultQuery {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    scale?: number;
    encoding?: 'base64' | 'binary';
}

/**
 * GET /api/result response (when encoding=base64)
 */
export interface ResultResponse {
    format: string;
    width: number;
    height: number;
    data: string; // Base64 encoded
}

/**
 * POST /api/export request
 */
export interface ExportRequest {
    format: 'png' | 'jpeg' | 'webp';
    quality?: number;
    scale?: number;
}

/**
 * GET /api/palettes response
 */
export interface PalettesResponse {
    builtin: PaletteInfo[];
    saved: PaletteInfo[];
}

/**
 * Palette info for API
 */
export interface PaletteInfo {
    id: string;
    name: string;
    colorCount: number;
    colors: Color[];
}

/**
 * POST /api/palette request
 */
export interface SetPaletteRequest {
    preset?: string;
    colors?: Color[];
    name?: string;
}

/**
 * POST /api/batch request
 */
export interface BatchRequest {
    items: BatchJobItem[];
    settings: BatchJobSettings;
    autoStart?: boolean;
}

/**
 * POST /api/batch response
 */
export interface BatchResponse {
    id: string;
    status: string;
    total: number;
}

/**
 * GET /api/batch/:id response
 */
export interface BatchStatusResponse extends BatchJob {}

/**
 * Standard error response
 */
export interface ErrorResponse {
    error: string;
    code: string;
    details?: unknown;
}

/**
 * Create a success response
 */
export function createResponse(body: unknown, status = 200, headers: Record<string, string> = {}): APIResponse {
    return {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body
    };
}

/**
 * Create an error response
 */
export function createErrorResponse(
    error: string,
    code: string,
    status = 400,
    details?: unknown
): APIResponse {
    return createResponse({ error, code, details }, status);
}

/**
 * Common error codes
 */
export const ErrorCodes = {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NO_IMAGE: 'NO_IMAGE',
    INVALID_ALGORITHM: 'INVALID_ALGORITHM',
    INVALID_PALETTE: 'INVALID_PALETTE',
    INVALID_FORMAT: 'INVALID_FORMAT',
    BATCH_NOT_FOUND: 'BATCH_NOT_FOUND',
    PROCESSING: 'PROCESSING'
} as const;

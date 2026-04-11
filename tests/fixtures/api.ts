import { vi } from 'vitest';
import type { APIContext, APIRequest, AppStateSnapshot } from '../../src/api/types.ts';
import type { HttpMethod } from '../../src/api/types.ts';

export function createMockStateSnapshot(overrides: Partial<AppStateSnapshot> = {}): AppStateSnapshot {
    return {
        mode: 'mono',
        algorithm: 'floyd-steinberg',
        options: {},
        palette: { name: 'Black & White', colors: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }] },
        colorMatch: 'euclidean',
        pixelScale: 1,
        levels: 0,
        adjustments: { brightness: 0, contrast: 0, gamma: 1, saturation: 0, blackPoint: 0, whitePoint: 255 },
        hasImage: false,
        imageWidth: null,
        imageHeight: null,
        originalFileName: null,
        isProcessing: false,
        isVideoMode: false,
        ...overrides,
    };
}

export function createMockAPIContext(overrides: Partial<APIContext> = {}): APIContext {
    return {
        getAppState: vi.fn(() => createMockStateSnapshot()),
        setAppState: vi.fn(),
        triggerDither: vi.fn().mockResolvedValue(undefined),
        getSourceImage: vi.fn().mockReturnValue(null),
        getDitheredImage: vi.fn().mockReturnValue(null),
        loadImage: vi.fn().mockResolvedValue(undefined),
        getBatchQueue: vi.fn().mockReturnValue({
            createJob: vi.fn(),
            getJob: vi.fn(),
            cancelJob: vi.fn(),
            getAllJobs: vi.fn().mockReturnValue([]),
        }),
        isAuthEnabled: vi.fn().mockReturnValue(false),
        getAuthToken: vi.fn().mockReturnValue(null),
        ...overrides,
    };
}

export function createMockRequest(
    method: HttpMethod,
    path: string,
    body: unknown = null,
    headers: Record<string, string> = {}
): APIRequest {
    return {
        method,
        path,
        params: {},
        query: {},
        headers: { 'content-type': 'application/json', ...headers },
        body,
    };
}

/**
 * API Bridge
 * Platform abstraction for API handling in both Electron and Web modes
 */

import { app } from '../app.ts';
import { settings } from './settings.ts';
import { isElectron } from './electron-bridge.ts';
import { handleRequest, createAPIRequest } from '../api/router.ts';
import { createBatchQueue } from '../api/batch-queue.ts';
import type { APIContext, AppStateSnapshot, ImageSource, BatchQueue, BatchJobSettings } from '../api/types.ts';
import { ditherAsync } from '../algorithms/index.ts';
import { BUILTIN_PALETTES } from '../data/palettes/presets.ts';
import type { Algorithm, Palette } from '../types/index.ts';

// Batch queue instance
let batchQueue: BatchQueue | null = null;

/**
 * Create the API context that provides access to app state and operations
 */
export function createAPIContext(): APIContext {
    return {
        getAppState: (): AppStateSnapshot => {
            const state = app.getState();
            return {
                mode: state.mode,
                algorithm: state.algorithm as Algorithm,
                options: state.options,
                palette: state.palette,
                colorMatch: state.colorMatch,
                pixelScale: state.pixelScale,
                levels: state.levels,
                adjustments: {
                    brightness: state.adjustments.brightness,
                    contrast: state.adjustments.contrast,
                    gamma: state.adjustments.gamma,
                    saturation: state.adjustments.saturation ?? 0,
                    blackPoint: state.adjustments.blackPoint,
                    whitePoint: state.adjustments.whitePoint
                },
                hasImage: state.sourceImage !== null,
                imageWidth: state.sourceImage?.width ?? null,
                imageHeight: state.sourceImage?.height ?? null,
                originalFileName: state.originalFileName,
                isProcessing: state.isProcessing,
                isVideoMode: state.isVideoMode
            };
        },

        setAppState: (updates) => {
            const stateUpdates: Record<string, unknown> = {};

            if (updates.mode !== undefined) stateUpdates.mode = updates.mode;
            if (updates.algorithm !== undefined) stateUpdates.algorithm = updates.algorithm;
            if (updates.options !== undefined) stateUpdates.options = updates.options;
            if (updates.palette !== undefined) stateUpdates.palette = updates.palette;
            if (updates.colorMatch !== undefined) stateUpdates.colorMatch = updates.colorMatch;
            if (updates.pixelScale !== undefined) stateUpdates.pixelScale = updates.pixelScale;
            if (updates.levels !== undefined) stateUpdates.levels = updates.levels;
            if (updates.adjustments !== undefined) stateUpdates.adjustments = updates.adjustments;

            if (Object.keys(stateUpdates).length > 0) {
                app.setState(stateUpdates);
            }
        },

        triggerDither: async () => {
            const state = app.getState();
            if (!state.sourceImage) {
                throw new Error('No image loaded');
            }

            // Trigger dithering through the app event system
            // The dither engine will pick this up
            return new Promise<void>((resolve, reject) => {
                const onComplete = () => {
                    app.off('dithercomplete', onComplete);
                    app.off('dithererror', onError);
                    resolve();
                };

                const onError = (e: CustomEvent) => {
                    app.off('dithercomplete', onComplete);
                    app.off('dithererror', onError);
                    reject(e.detail.error);
                };

                app.on('dithercomplete', onComplete);
                app.on('dithererror', onError);

                // Trigger state change to cause re-dither
                app.setState({ isProcessing: false });
            });
        },

        getSourceImage: () => {
            return app.getState().sourceImage;
        },

        getDitheredImage: () => {
            return app.getState().ditheredImage;
        },

        loadImage: async (source: ImageSource) => {
            const imageData = await loadImageFromSource(source);
            const fileName = getFileNameFromSource(source);

            app.setState({
                sourceImage: imageData,
                originalFileName: fileName,
                isVideoMode: false
            });

            app.emit('imageloaded', { fileName, imageData });
        },

        getBatchQueue: () => {
            if (!batchQueue) {
                batchQueue = createBatchQueue(processImageForBatch);
            }
            return batchQueue;
        },

        isAuthEnabled: () => {
            return settings.get('apiAuthEnabled');
        },

        getAuthToken: () => {
            return settings.get('apiAuthToken');
        }
    };
}

/**
 * Load an image from various sources
 */
async function loadImageFromSource(source: ImageSource): Promise<ImageData> {
    if (source.type === 'base64') {
        return loadImageFromBase64(source.data, source.mimeType);
    } else if (source.type === 'url') {
        return loadImageFromURL(source.url);
    } else if (source.type === 'file') {
        // File loading is only available in Electron
        if (!isElectron()) {
            throw new Error('File path loading is only available in Electron mode');
        }
        return loadImageFromFile(source.path);
    }

    throw new Error('Invalid image source type');
}

/**
 * Load image from base64 data
 */
async function loadImageFromBase64(data: string, mimeType: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            resolve(imageData);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image from base64'));
        };

        img.src = `data:${mimeType};base64,${data}`;
    });
}

/**
 * Load image from URL
 */
async function loadImageFromURL(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            resolve(imageData);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image from URL'));
        };

        img.src = url;
    });
}

/**
 * Load image from file path (Electron only)
 */
async function loadImageFromFile(path: string): Promise<ImageData> {
    if (!window.electronAPI) {
        throw new Error('Electron API not available');
    }

    const data = await window.electronAPI.readFile(path);
    const blob = new Blob([data as BlobPart]);
    const url = URL.createObjectURL(blob);

    try {
        return await loadImageFromURL(url);
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Get filename from image source
 */
function getFileNameFromSource(source: ImageSource): string {
    if (source.type === 'file') {
        const parts = source.path.split(/[/\\]/);
        return parts[parts.length - 1] || 'image';
    } else if (source.type === 'url') {
        try {
            const url = new URL(source.url);
            const parts = url.pathname.split('/');
            return parts[parts.length - 1] || 'image';
        } catch {
            return 'image';
        }
    }
    return 'image';
}

/**
 * Process a single image for batch processing
 */
async function processImageForBatch(source: ImageSource, jobSettings: BatchJobSettings): Promise<string> {
    // Load the image
    const imageData = await loadImageFromSource(source);

    // Get palette
    let palette: Palette;
    if (jobSettings.palette) {
        palette = jobSettings.palette;
    } else {
        palette = BUILTIN_PALETTES.mono;
    }

    // Apply dithering
    const result = await ditherAsync(
        imageData,
        jobSettings.algorithm,
        palette,
        jobSettings.options || {},
        jobSettings.colorMatch || 'euclidean'
    );

    // Convert to output format
    const canvas = new OffscreenCanvas(result.width, result.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }

    ctx.putImageData(result, 0, 0);

    // Scale if needed
    const scale = jobSettings.export.scale || 1;
    let outputCanvas = canvas;

    if (scale !== 1) {
        outputCanvas = new OffscreenCanvas(
            Math.round(result.width * scale),
            Math.round(result.height * scale)
        );
        const outputCtx = outputCanvas.getContext('2d');
        if (!outputCtx) {
            throw new Error('Failed to create output canvas context');
        }
        outputCtx.imageSmoothingEnabled = false;
        outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Convert to blob
    const mimeType = jobSettings.export.format === 'jpeg' ? 'image/jpeg' :
        jobSettings.export.format === 'webp' ? 'image/webp' : 'image/png';
    const quality = jobSettings.export.format === 'png' ? undefined :
        (jobSettings.export.quality || 92) / 100;

    const blob = await outputCanvas.convertToBlob({ type: mimeType, quality });
    const arrayBuffer = await blob.arrayBuffer();

    // Convert to base64
    const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return base64;
}

/**
 * Initialize API handling for the current platform
 */
export function initAPIBridge(): void {
    if (isElectron()) {
        initElectronAPIBridge();
    } else {
        initWebAPIBridge();
    }
}

/**
 * Initialize API bridge for Electron mode
 */
function initElectronAPIBridge(): void {
    if (!window.electronAPI) {
        console.warn('[API Bridge] Electron API not available');
        return;
    }

    const context = createAPIContext();

    // Handle API requests from main process
    window.electronAPI.onAPIRequest(async ({ id, request }) => {
        try {
            const apiRequest = createAPIRequest(
                (request as { method: string }).method,
                (request as { path: string }).path,
                (request as { headers: Record<string, string> }).headers,
                (request as { body: unknown }).body
            );

            // Add auth info from request
            const reqWithAuth = request as { authEnabled?: boolean; authToken?: string | null };

            const response = await handleRequest(apiRequest, {
                ...context,
                isAuthEnabled: () => reqWithAuth.authEnabled ?? false,
                getAuthToken: () => reqWithAuth.authToken ?? null
            });

            window.electronAPI!.sendAPIResponse(id, response);
        } catch (error) {
            window.electronAPI!.sendAPIResponse(
                id,
                undefined,
                error instanceof Error ? error.message : 'Request handling failed'
            );
        }
    });

    console.log('[API Bridge] Electron API bridge initialized');
}

/**
 * Initialize API bridge for Web mode (Service Worker)
 */
function initWebAPIBridge(): void {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/api-service.worker.js', { scope: '/api/' })
            .then(registration => {
                console.log('[API Bridge] Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.error('[API Bridge] Service Worker registration failed:', error);
            });

        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', async (event) => {
            const data = event.data;

            if (data.type !== 'api-request') {
                return;
            }

            const context = createAPIContext();

            try {
                const apiRequest = createAPIRequest(
                    data.request.method,
                    data.request.path,
                    data.request.headers,
                    data.request.body
                );

                const response = await handleRequest(apiRequest, context);

                // Send response back to service worker
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'api-response',
                        id: data.id,
                        response
                    });
                }
            } catch (error) {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'api-response',
                        id: data.id,
                        error: error instanceof Error ? error.message : 'Request handling failed'
                    });
                }
            }
        });

        console.log('[API Bridge] Web API bridge initialized');
    } else {
        console.warn('[API Bridge] Service Workers not supported - API not available in web mode');
    }
}

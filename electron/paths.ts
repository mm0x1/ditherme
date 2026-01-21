/**
 * Electron Path Utilities
 * Handles path resolution for WASM and other resources
 */

import { app } from 'electron';
import { join } from 'path';

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
    return !!process.env.VITE_DEV_SERVER_URL;
}

/**
 * Get the base path for WASM files
 * In development: public/wasm/
 * In production: resources/wasm/
 */
export function getWasmPath(): string {
    if (isDev()) {
        // Development: relative to project root
        return join(process.cwd(), 'public', 'wasm');
    } else {
        // Production: packaged in resources
        return join(process.resourcesPath, 'wasm');
    }
}

/**
 * Get the base path for the app resources
 */
export function getResourcesPath(): string {
    if (isDev()) {
        return process.cwd();
    } else {
        return process.resourcesPath;
    }
}

/**
 * Get the user data path (for storing settings, cache, etc.)
 */
export function getUserDataPath(): string {
    return app.getPath('userData');
}

/**
 * Get the app path
 */
export function getAppPath(): string {
    return app.getAppPath();
}

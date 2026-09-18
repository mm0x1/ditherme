/**
 * Electron resource path utilities.
 */

import { app } from 'electron';
import { join, sep } from 'path';
import { pathToFileURL } from 'url';

function isDev(): boolean {
    return !!process.env.VITE_DEV_SERVER_URL;
}

export function getWasmURL(): string {
    const wasmPath = isDev()
        ? join(process.cwd(), 'public', 'wasm')
        : join(process.resourcesPath, 'wasm');

    return pathToFileURL(`${wasmPath}${sep}`).href;
}

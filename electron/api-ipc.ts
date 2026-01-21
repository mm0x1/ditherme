/**
 * API IPC Handlers
 * Bridge between Electron main process API server and renderer
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getAPIServer } from './api-server.ts';

/**
 * Setup additional API-related IPC handlers
 */
export function setupAPIIPC(): void {
    // Already set up in api-server.ts via setupAPIServerIPC
    // This file is for any additional IPC handlers that might be needed
}

/**
 * Send API request to renderer and wait for response
 * This is an alternative method for synchronous-style communication
 */
export async function sendAPIRequestToRenderer(
    window: BrowserWindow,
    request: unknown
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const channel = `api-request-${Date.now()}`;
        const responseChannel = `${channel}-response`;

        const timeout = setTimeout(() => {
            ipcMain.removeHandler(responseChannel);
            reject(new Error('Request timeout'));
        }, 30000);

        ipcMain.handleOnce(responseChannel, (_event, response, error) => {
            clearTimeout(timeout);
            if (error) {
                reject(new Error(error));
            } else {
                resolve(response);
            }
        });

        window.webContents.send(channel, request);
    });
}

/**
 * Notify renderer that API server status changed
 */
export function notifyAPIServerStatus(window: BrowserWindow, status: { running: boolean; port: number }): void {
    if (!window.isDestroyed()) {
        window.webContents.send('api-server-status-changed', status);
    }
}

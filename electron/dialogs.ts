/**
 * Electron File Dialog Handlers
 * Native file open/save dialogs via IPC
 */

import { dialog, ipcMain, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path';

interface OpenFileOptions {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
}

interface SaveFileOptions {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
}

interface FileResult {
    path: string;
    name: string;
    data: Uint8Array;
}

// Default filters for images and videos
const IMAGE_FILTERS = [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
];

const VIDEO_FILTERS = [
    { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi'] }
];

const ALL_MEDIA_FILTERS = [
    { name: 'All Supported', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'mp4', 'webm', 'mov', 'avi'] },
    ...IMAGE_FILTERS,
    ...VIDEO_FILTERS
];

const EXPORT_FILTERS = [
    { name: 'PNG Image', extensions: ['png'] },
    { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
    { name: 'WebP Image', extensions: ['webp'] }
];

/**
 * Setup IPC handlers for file dialogs
 */
export function setupDialogHandlers(): void {
    // Open file dialog
    ipcMain.handle('dialog:openFile', async (_event, options?: OpenFileOptions) => {
        const win = BrowserWindow.getFocusedWindow();

        const result = await dialog.showOpenDialog(win!, {
            properties: [
                'openFile',
                ...(options?.multiple ? ['multiSelections' as const] : [])
            ],
            filters: options?.filters || ALL_MEDIA_FILTERS
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        // Read file contents
        const files: FileResult[] = await Promise.all(
            result.filePaths.map(async (filePath): Promise<FileResult> => {
                const data = await readFile(filePath);
                return {
                    path: filePath,
                    name: basename(filePath),
                    data: new Uint8Array(data)
                };
            })
        );

        return files;
    });

    // Save file dialog
    ipcMain.handle('dialog:saveFile', async (_event, options?: SaveFileOptions) => {
        const win = BrowserWindow.getFocusedWindow();

        const result = await dialog.showSaveDialog(win!, {
            defaultPath: options?.defaultPath,
            filters: options?.filters || EXPORT_FILTERS
        });

        if (result.canceled || !result.filePath) {
            return null;
        }

        return result.filePath;
    });

    // Read file
    ipcMain.handle('file:read', async (_event, path: string) => {
        const data = await readFile(path);
        return new Uint8Array(data);
    });

    // Write file
    ipcMain.handle('file:write', async (_event, path: string, data: Uint8Array) => {
        await writeFile(path, Buffer.from(data));
    });
}

/**
 * Show open dialog for images
 */
export async function showOpenImageDialog(): Promise<FileResult[] | null> {
    const win = BrowserWindow.getFocusedWindow();

    const result = await dialog.showOpenDialog(win!, {
        properties: ['openFile'],
        filters: IMAGE_FILTERS
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const files: FileResult[] = await Promise.all(
        result.filePaths.map(async (filePath): Promise<FileResult> => {
            const data = await readFile(filePath);
            return {
                path: filePath,
                name: basename(filePath),
                data: new Uint8Array(data)
            };
        })
    );

    return files;
}

/**
 * Show open dialog for videos
 */
export async function showOpenVideoDialog(): Promise<FileResult[] | null> {
    const win = BrowserWindow.getFocusedWindow();

    const result = await dialog.showOpenDialog(win!, {
        properties: ['openFile'],
        filters: VIDEO_FILTERS
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const files: FileResult[] = await Promise.all(
        result.filePaths.map(async (filePath): Promise<FileResult> => {
            const data = await readFile(filePath);
            return {
                path: filePath,
                name: basename(filePath),
                data: new Uint8Array(data)
            };
        })
    );

    return files;
}

/**
 * Show save dialog
 */
export async function showSaveDialog(defaultName: string): Promise<string | null> {
    const win = BrowserWindow.getFocusedWindow();

    const result = await dialog.showSaveDialog(win!, {
        defaultPath: defaultName,
        filters: EXPORT_FILTERS
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    return result.filePath;
}

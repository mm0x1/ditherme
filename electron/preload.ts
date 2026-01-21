/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for file dialog options
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

// Expose protected methods that allow the renderer to interact with main process
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform detection
    isElectron: true,
    platform: process.platform,

    // App info
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getWasmPath: () => ipcRenderer.invoke('get-wasm-path'),

    // File dialogs
    openFileDialog: (options?: OpenFileOptions): Promise<FileResult[] | null> =>
        ipcRenderer.invoke('dialog:openFile', options),

    saveFileDialog: (options?: SaveFileOptions): Promise<string | null> =>
        ipcRenderer.invoke('dialog:saveFile', options),

    // File operations
    readFile: (path: string): Promise<Uint8Array> =>
        ipcRenderer.invoke('file:read', path),

    writeFile: (path: string, data: Uint8Array): Promise<void> =>
        ipcRenderer.invoke('file:write', path, data),

    // Menu actions
    onMenuAction: (callback: (action: string) => void) => {
        const listener = (_event: IpcRendererEvent, action: string) => callback(action);
        ipcRenderer.on('menu-action', listener);
        return () => ipcRenderer.removeListener('menu-action', listener);
    },

    // Window control
    focusWindow: () => ipcRenderer.send('focus-window'),

    // Auto-updater events
    onUpdateAvailable: (callback: (info: { version: string }) => void) => {
        const listener = (_event: IpcRendererEvent, info: { version: string }) => callback(info);
        ipcRenderer.on('update-available', listener);
        return () => ipcRenderer.removeListener('update-available', listener);
    },

    onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
        const listener = (_event: IpcRendererEvent, info: { version: string }) => callback(info);
        ipcRenderer.on('update-downloaded', listener);
        return () => ipcRenderer.removeListener('update-downloaded', listener);
    },

    installUpdate: () => ipcRenderer.send('install-update'),

    // DevTools
    toggleDevTools: () => ipcRenderer.send('toggle-devtools')
});

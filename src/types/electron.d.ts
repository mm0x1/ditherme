/**
 * Electron API Type Definitions
 * Defines the window.electronAPI interface exposed by preload script
 */

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

interface UpdateInfo {
    version: string;
}

/**
 * Electron API exposed to renderer via contextBridge
 */
interface ElectronAPI {
    // Platform detection
    isElectron: boolean;
    platform: NodeJS.Platform;

    // App info
    getVersion: () => Promise<string>;
    getWasmURL: () => Promise<string>;

    // File dialogs
    openFileDialog: (options?: OpenFileOptions) => Promise<FileResult[] | null>;
    saveFile: (data: Uint8Array, options?: SaveFileOptions) => Promise<boolean>;

    // Menu actions
    onMenuAction: (callback: (action: string) => void) => () => void;

    // Window control
    focusWindow: () => void;

    // Auto-updater events
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
    installUpdate: () => void;

    // DevTools
    toggleDevTools: () => void;

}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export type {
    ElectronAPI,
    OpenFileOptions,
    SaveFileOptions,
    FileResult,
    UpdateInfo
};

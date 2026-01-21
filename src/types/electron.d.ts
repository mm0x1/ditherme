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

interface APIServerConfig {
    port: number;
    bindAddress: string;
    authEnabled: boolean;
    authToken: string | null;
}

interface APIServerStatus {
    running: boolean;
    port: number;
}

interface APIRequestData {
    id: number;
    request: unknown;
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
    getWasmPath: () => Promise<string>;

    // File dialogs
    openFileDialog: (options?: OpenFileOptions) => Promise<FileResult[] | null>;
    saveFileDialog: (options?: SaveFileOptions) => Promise<string | null>;

    // File operations
    readFile: (path: string) => Promise<Uint8Array>;
    writeFile: (path: string, data: Uint8Array) => Promise<void>;

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

    // API Server
    getAPIServerStatus: () => Promise<APIServerStatus>;
    startAPIServer: (config: APIServerConfig) => Promise<{ success: boolean; error?: string }>;
    stopAPIServer: () => Promise<{ success: boolean }>;
    onAPIRequest: (callback: (data: APIRequestData) => void) => () => void;
    sendAPIResponse: (id: number, response: unknown, error?: string) => void;
    onAPIServerStatusChanged: (callback: (status: APIServerStatus) => void) => () => void;
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
    UpdateInfo,
    APIServerConfig,
    APIServerStatus,
    APIRequestData
};

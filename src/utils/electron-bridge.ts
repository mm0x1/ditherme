/**
 * Electron Bridge
 * Platform abstraction layer for browser and Electron environments
 */

import type { FileResult, OpenFileOptions, SaveFileOptions } from '../types/electron';

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
    return window.electronAPI?.isElectron ?? false;
}

/**
 * Get the current platform
 */
export function getPlatform(): string {
    if (isElectron()) {
        return window.electronAPI!.platform;
    }
    // Detect platform from user agent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'darwin';
    if (ua.includes('win')) return 'win32';
    return 'linux';
}

/**
 * Check if running on macOS
 */
export function isMac(): boolean {
    return getPlatform() === 'darwin';
}

/**
 * Get app version
 */
export async function getAppVersion(): Promise<string> {
    if (isElectron()) {
        return window.electronAPI!.getVersion();
    }
    return '1.0.0'; // Default for web
}

/**
 * Open file using native dialog (Electron) or browser picker
 * Returns File objects that work in both environments
 */
export async function openFile(options?: {
    accept?: string;
    multiple?: boolean;
}): Promise<File[] | null> {
    if (isElectron()) {
        // Convert accept to Electron filter format
        const filters = options?.accept
            ? parseAcceptToFilters(options.accept)
            : undefined;

        const result = await window.electronAPI!.openFileDialog({
            filters,
            multiple: options?.multiple
        });

        if (!result) return null;

        // Convert FileResult to File objects
        return result.map((fr: FileResult) => {
            // Create a new Uint8Array copy to ensure ArrayBuffer compatibility
            const dataCopy = new Uint8Array(fr.data);
            return new File([dataCopy], fr.name, {
                type: getMimeType(fr.name)
            });
        });
    }

    // Browser fallback: use file input
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (options?.accept) input.accept = options.accept;
        if (options?.multiple) input.multiple = true;

        input.onchange = () => {
            const files = input.files;
            if (files && files.length > 0) {
                resolve(Array.from(files));
            } else {
                resolve(null);
            }
        };

        input.oncancel = () => resolve(null);
        input.click();
    });
}

/**
 * Save file using native dialog (Electron) or browser download
 */
export async function saveFile(
    blob: Blob,
    defaultName: string,
    options?: {
        filters?: { name: string; extensions: string[] }[];
    }
): Promise<boolean> {
    if (isElectron()) {
        const path = await window.electronAPI!.saveFileDialog({
            defaultPath: defaultName,
            filters: options?.filters
        });

        if (!path) return false;

        const buffer = await blob.arrayBuffer();
        await window.electronAPI!.writeFile(path, new Uint8Array(buffer));
        return true;
    }

    // Browser fallback: use download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
}

/**
 * Register menu action handler (Electron only)
 */
export function onMenuAction(callback: (action: string) => void): () => void {
    if (isElectron()) {
        return window.electronAPI!.onMenuAction(callback);
    }
    // No-op cleanup function for browser
    return () => {};
}

/**
 * Register update available handler (Electron only)
 */
export function onUpdateAvailable(callback: (info: { version: string }) => void): () => void {
    if (isElectron()) {
        return window.electronAPI!.onUpdateAvailable(callback);
    }
    return () => {};
}

/**
 * Register update downloaded handler (Electron only)
 */
export function onUpdateDownloaded(callback: (info: { version: string }) => void): () => void {
    if (isElectron()) {
        return window.electronAPI!.onUpdateDownloaded(callback);
    }
    return () => {};
}

/**
 * Install downloaded update (Electron only)
 */
export function installUpdate(): void {
    if (isElectron()) {
        window.electronAPI!.installUpdate();
    }
}

/**
 * Parse HTML accept attribute to Electron filter format
 */
function parseAcceptToFilters(accept: string): { name: string; extensions: string[] }[] {
    const types = accept.split(',').map(t => t.trim());
    const extensions: string[] = [];

    for (const type of types) {
        if (type.startsWith('.')) {
            extensions.push(type.slice(1));
        } else if (type.includes('/')) {
            // MIME type - map common ones
            const ext = mimeToExtension(type);
            if (ext) extensions.push(ext);
        }
    }

    if (extensions.length === 0) {
        return [];
    }

    return [{ name: 'Supported Files', extensions }];
}

/**
 * Map MIME types to extensions
 */
function mimeToExtension(mime: string): string | null {
    const map: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi'
    };
    return map[mime] || null;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo'
    };
    return map[ext || ''] || 'application/octet-stream';
}

/**
 * Add CSS class to body when running in Electron
 */
export function setupElectronBodyClass(): void {
    if (isElectron()) {
        document.body.classList.add('is-electron');
        document.body.classList.add(`platform-${getPlatform()}`);
    }
}

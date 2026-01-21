/**
 * Electron Main Process
 * Entry point for the Electron application
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { createMenu } from './menu';
import { setupDialogHandlers } from './dialogs';
import { setupAutoUpdater } from './updater';
import { getWasmPath } from './paths';
import { initAPIServer, setupAPIServerIPC, getAPIServer } from './api-server';

// Prevent garbage collection of window
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            preload: join(__dirname, '../preload/index.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        },
        show: false // Show when ready
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Load the app
    if (process.env.VITE_DEV_SERVER_URL) {
        // Development: load from Vite dev server
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // Production: load from built files
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create native menu
    createMenu(mainWindow);
}

// Handle app ready
app.whenReady().then(async () => {
    // Setup dialog handlers once (before creating windows)
    setupDialogHandlers();

    // Setup API server IPC handlers
    setupAPIServerIPC();

    createWindow();

    // macOS: recreate window when dock icon clicked and no windows open
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Initialize and start API server with default settings
    // Settings will be synced from renderer when it connects
    const apiServer = initAPIServer({
        port: 7842,
        bindAddress: '127.0.0.1',
        authEnabled: false,
        authToken: null
    });

    if (mainWindow) {
        apiServer.setMainWindow(mainWindow);
    }

    try {
        await apiServer.start();
        console.log('[Main] API server started');
    } catch (error) {
        console.error('[Main] Failed to start API server:', error);
    }

    // Setup auto-updater (production only)
    if (!process.env.VITE_DEV_SERVER_URL) {
        setupAutoUpdater(mainWindow);
    }
});

// Handle all windows closed
app.on('window-all-closed', () => {
    // macOS: keep app in dock unless explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Stop API server before quitting
app.on('before-quit', async () => {
    const apiServer = getAPIServer();
    if (apiServer) {
        await apiServer.stop();
    }
});

// Security: prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        // Allow navigation within app in development
        if (process.env.VITE_DEV_SERVER_URL) {
            const devUrl = new URL(process.env.VITE_DEV_SERVER_URL);
            if (parsedUrl.origin === devUrl.origin) {
                return;
            }
        }

        // Block all other navigation
        event.preventDefault();
    });
});

// IPC handlers for app info
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-wasm-path', () => getWasmPath());

// Handle renderer requesting focus
ipcMain.on('focus-window', () => {
    mainWindow?.focus();
});

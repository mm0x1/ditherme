/**
 * Electron Auto-Updater
 * Handles automatic updates via GitHub releases
 */

import electronUpdater from 'electron-updater';
import { BrowserWindow, dialog, ipcMain } from 'electron';

const { autoUpdater } = electronUpdater;
type UpdateInfo = electronUpdater.UpdateInfo;

let mainWindow: BrowserWindow | null = null;

/**
 * Setup auto-updater with event handlers
 */
export function setupAutoUpdater(win: BrowserWindow | null): void {
    mainWindow = win;

    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (with delay to not slow down startup)
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.log('Update check failed:', err.message);
        });
    }, 3000);

    // Event: Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
        console.log('Update available:', info.version);

        // Notify renderer
        mainWindow?.webContents.send('update-available', {
            version: info.version
        });

        // Show dialog
        dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available.`,
            detail: 'Would you like to download it now?',
            buttons: ['Download', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // Event: Update not available
    autoUpdater.on('update-not-available', () => {
        console.log('No updates available');
    });

    // Event: Download progress
    autoUpdater.on('download-progress', (progress) => {
        console.log(`Download progress: ${progress.percent.toFixed(1)}%`);
    });

    // Event: Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
        console.log('Update downloaded:', info.version);

        // Notify renderer
        mainWindow?.webContents.send('update-downloaded', {
            version: info.version
        });

        // Show dialog
        dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded.`,
            detail: 'The update will be installed when you quit the app. Would you like to restart now?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // Event: Error
    autoUpdater.on('error', (error) => {
        console.error('Auto-updater error:', error.message);
    });

    // IPC: Install update manually
    ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall();
    });

    // IPC: Check for updates manually
    ipcMain.handle('check-for-updates', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return result?.updateInfo.version || null;
        } catch (error) {
            console.error('Manual update check failed:', error);
            return null;
        }
    });
}

/**
 * Manually trigger update check
 */
export function checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch((err) => {
        console.log('Update check failed:', err.message);
    });
}

/**
 * Electron Native Menu
 * Creates the application menu that mirrors the web HTML menu structure
 */

import { Menu, BrowserWindow, app, MenuItemConstructorOptions, shell } from 'electron';

const isMac = process.platform === 'darwin';

/**
 * Send menu action to renderer process
 */
function sendMenuAction(win: BrowserWindow | null, action: string): void {
    win?.webContents.send('menu-action', action);
}

/**
 * Create the application menu
 */
export function createMenu(mainWindow: BrowserWindow): void {
    const template: MenuItemConstructorOptions[] = [
        // macOS App Menu
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' as const },
                { type: 'separator' as const },
                {
                    label: 'Settings...',
                    accelerator: 'Cmd+,',
                    click: () => sendMenuAction(mainWindow, 'settings')
                },
                { type: 'separator' as const },
                { role: 'services' as const },
                { type: 'separator' as const },
                { role: 'hide' as const },
                { role: 'hideOthers' as const },
                { role: 'unhide' as const },
                { type: 'separator' as const },
                { role: 'quit' as const }
            ]
        }] : []),

        // File Menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Image...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => sendMenuAction(mainWindow, 'open')
                },
                {
                    label: 'Open Video...',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: () => sendMenuAction(mainWindow, 'open-video')
                },
                { type: 'separator' },
                {
                    label: 'Save Image',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => sendMenuAction(mainWindow, 'save')
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => sendMenuAction(mainWindow, 'save-as')
                },
                { type: 'separator' },
                {
                    label: 'Quick Export',
                    submenu: [
                        {
                            label: 'Web (PNG)',
                            click: () => sendMenuAction(mainWindow, 'export-preset:web-png')
                        },
                        {
                            label: 'Web (JPEG 80%)',
                            click: () => sendMenuAction(mainWindow, 'export-preset:web-jpg')
                        },
                        {
                            label: 'High Quality (PNG 2x)',
                            click: () => sendMenuAction(mainWindow, 'export-preset:hq-png')
                        },
                        {
                            label: 'Social Media (JPEG)',
                            click: () => sendMenuAction(mainWindow, 'export-preset:social')
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Export Video...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => sendMenuAction(mainWindow, 'export-video')
                },
                {
                    label: 'Batch Dither...',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => sendMenuAction(mainWindow, 'batch')
                },
                { type: 'separator' },
                ...(isMac ? [] : [{ role: 'quit' as const }])
            ]
        },

        // Edit Menu
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => sendMenuAction(mainWindow, 'undo')
                },
                {
                    label: 'Redo',
                    accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
                    click: () => sendMenuAction(mainWindow, 'redo')
                },
                { type: 'separator' },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    click: () => sendMenuAction(mainWindow, 'copy')
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    click: () => sendMenuAction(mainWindow, 'paste')
                },
                { type: 'separator' },
                {
                    label: 'Reset Adjustments',
                    click: () => sendMenuAction(mainWindow, 'reset-adjustments')
                },
                ...(!isMac ? [
                    { type: 'separator' as const },
                    {
                        label: 'Settings...',
                        click: () => sendMenuAction(mainWindow, 'settings')
                    }
                ] : [])
            ]
        },

        // View Menu
        {
            label: 'View',
            submenu: [
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+=',
                    click: () => sendMenuAction(mainWindow, 'zoom-in')
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => sendMenuAction(mainWindow, 'zoom-out')
                },
                {
                    label: 'Fit to View',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => sendMenuAction(mainWindow, 'fit-to-view')
                },
                {
                    label: 'Actual Size (100%)',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => sendMenuAction(mainWindow, 'actual-size')
                },
                { type: 'separator' },
                {
                    label: 'Toggle Original',
                    accelerator: 'Space',
                    click: () => sendMenuAction(mainWindow, 'toggle-original')
                },
                { type: 'separator' },
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },

        // Window Menu (macOS specific)
        ...(isMac ? [{
            label: 'Window',
            submenu: [
                { role: 'minimize' as const },
                { role: 'zoom' as const },
                { type: 'separator' as const },
                { role: 'front' as const },
                { type: 'separator' as const },
                { role: 'window' as const }
            ]
        }] : []),

        // Help Menu
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Keyboard Shortcuts',
                    accelerator: '?',
                    click: () => sendMenuAction(mainWindow, 'help')
                },
                { type: 'separator' },
                {
                    label: 'About ditherme',
                    click: () => sendMenuAction(mainWindow, 'about')
                },
                { type: 'separator' },
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://github.com/mm0x1/ditherme');
                    }
                },
                {
                    label: 'Report an Issue',
                    click: async () => {
                        await shell.openExternal('https://github.com/mm0x1/ditherme/issues');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

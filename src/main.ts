/**
 * ditherme - Professional Dithering Application
 * Main entry point
 */

import { app } from './app.ts';
import { initViewport, initViewControls } from './ui/viewport.ts';
import { initSidebar } from './ui/sidebar.ts';
import { initAdjustments, initDitherSettings } from './ui/adjustments.ts';
import { initPostEffect } from './ui/post-effect.ts';
import { initImageEffect } from './ui/image-effect.ts';
import { initPalette } from './ui/palette.ts';
import { initDragAndDrop, initFileInput, initClipboard, initSaveHandlers, downloadImageWithPreset } from './engine/image.ts';
import { settings } from './utils/settings.ts';
import { DEFAULT_EXPORT_PRESETS } from './types/settings.ts';
import { showHelpDialog, showAboutDialog } from './ui/help-dialog.ts';
import { showAPIDocsDialog } from './ui/api-docs-dialog.ts';
import { showBatchDialog } from './ui/batch-dialog.ts';
import { showSettingsDialog } from './ui/settings-dialog.ts';
import { initDitherEngine } from './engine/dither.ts';
import { initVideoEngine, getVideoManager } from './engine/video/index.ts';
import { initTimeline, setTimeline } from './ui/video/timeline.ts';
import { getProgressModal } from './ui/video/progress-modal.ts';
import { showExportDialog } from './ui/video/export-dialog.ts';
import { isElectron, onMenuAction, setupElectronBodyClass } from './utils/electron-bridge.ts';
import { initAPIBridge } from './utils/api-bridge.ts';

// Coloris color picker
import '@melloware/coloris/dist/coloris.css';
import Coloris from '@melloware/coloris';

/**
 * Get DOM element by ID with null check
 */
function getElement(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Element #${id} not found`);
    }
    return el;
}

/**
 * Set status message
 */
function setStatus(message: string): void {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

/**
 * Update performance indicator with dither time
 */
function updatePerfIndicator(ms: number): void {
    const perfEl = document.getElementById('status-perf');
    const timeEl = document.getElementById('dither-time');

    if (perfEl && timeEl) {
        perfEl.classList.remove('hidden');
        // Format: show ms if under 1s, otherwise show seconds
        timeEl.textContent = ms < 1000
            ? `${ms.toFixed(0)}ms`
            : `${(ms / 1000).toFixed(2)}s`;
    }
}

/**
 * Initialize the application
 */
function init(): void {
    console.log('ditherme initializing...');
    console.time('total-init');

    try {
        console.time('coloris-init');
        // Initialize Coloris color picker
        Coloris.init();
        Coloris({
            el: '[data-coloris]',
            themeMode: 'dark',
            alpha: false,
            format: 'hex',
            swatches: [],
            focusInput: true,
            selectInput: false
        });
        console.timeEnd('coloris-init');

        // Initialize UI components
        const sidebar = getElement('sidebar');
        const viewport = getElement('viewport');
        const adjustments = getElement('adjustments');
        const palette = getElement('palette');

        console.time('viewport-init');
        // Initialize viewport (canvas with zoom/pan)
        const viewportControls = initViewport(viewport);
        console.timeEnd('viewport-init');

        console.time('sidebar-init');
        // Initialize sidebar (algorithm selection)
        initSidebar(sidebar);
        console.timeEnd('sidebar-init');

        console.time('adjustments-init');
        // Initialize adjustments panel
        initAdjustments(adjustments);

        // Initialize dither settings (Pixel Scale, Levels)
        initDitherSettings();

        // Initialize post-processing effect controls
        initPostEffect(document.body);

        // Initialize image effect controls
        initImageEffect(document.body);

        // Initialize palette panel
        initPalette(palette);

        // Initialize view controls
        initViewControls(viewportControls);
        console.timeEnd('adjustments-init');

        console.time('handlers-init');
        // Initialize image loading
        initDragAndDrop(viewport);
        initFileInput();
        initClipboard();
        initSaveHandlers();

        // Initialize dithering engine
        initDitherEngine();

        // Initialize video engine (async, non-blocking)
        initVideoEngine().then(() => {
            console.log('Video engine initialized');
        });

        // Initialize video timeline
        const timelineContainer = document.getElementById('timeline-container');
        if (timelineContainer) {
            const timeline = initTimeline(timelineContainer);
            setTimeline(timeline);
        }

        // Initialize video export button
        initVideoExport();

        // Initialize menu actions
        initMenus();

        // Initialize keyboard shortcuts
        initKeyboardShortcuts();

        // Setup Electron-specific features
        setupElectronBodyClass();
        initElectronMenuHandler();

        // Initialize API bridge
        initAPIBridge();
        console.timeEnd('handlers-init');

        // Listen for dither events
        app.on('ditherstart', (e) => {
            setStatus(`Dithering with ${e.detail.algorithm}...`);
        });

        app.on('dithercomplete', (e) => {
            const ms = e.detail.duration;
            setStatus('Done');
            updatePerfIndicator(ms);
        });

        app.on('dithererror', (e) => {
            setStatus(`Error: ${e.detail.error.message}`);
            console.error('Dither error:', e.detail.error);
        });

        // Ready
        setStatus('Ready - Drop an image or use File > Open');
        console.log('ditherme ready');
        console.timeEnd('total-init');

    } catch (error) {
        console.error('Failed to initialize ditherme:', error);
        setStatus('Initialization failed');
    }
}

/**
 * Initialize menu actions
 */
function initMenus(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-item')) {
            document.querySelectorAll('.menu-dropdown').forEach(dd => {
                (dd as HTMLElement).style.display = '';
            });
        }
    });

    // Undo menu action
    document.querySelectorAll('[data-action="undo"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (app.canUndo()) {
                app.undo();
                setStatus('Undone');
            }
        });
    });

    // Redo menu action
    document.querySelectorAll('[data-action="redo"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (app.canRedo()) {
                app.redo();
                setStatus('Redone');
            }
        });
    });

    // Batch dither action
    document.querySelectorAll('[data-action="batch"]').forEach(btn => {
        btn.addEventListener('click', () => {
            showBatchDialog();
        });
    });

    // Settings action
    document.querySelectorAll('[data-action="settings"]').forEach(btn => {
        btn.addEventListener('click', () => {
            showSettingsDialog();
        });
    });

    // About action
    document.querySelectorAll('[data-action="about"]').forEach(btn => {
        btn.addEventListener('click', () => {
            showAboutDialog();
        });
    });

    // API Documentation action
    document.querySelectorAll('[data-action="api-docs"]').forEach(btn => {
        btn.addEventListener('click', () => {
            showAPIDocsDialog();
        });
    });

    // Copy action
    document.querySelectorAll('[data-action="copy"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const state = app.getState();
            const image = state.ditheredImage || state.sourceImage;

            if (!image) {
                setStatus('No image to copy');
                return;
            }

            if (!navigator.clipboard?.write) {
                setStatus('Clipboard not available in this context');
                return;
            }

            try {
                // Convert ImageData to blob
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d')!;
                ctx.putImageData(image, 0, 0);

                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png');
                });

                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);

                setStatus('Copied to clipboard');
            } catch (error) {
                setStatus(`Copy failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    });

    // Paste action
    document.querySelectorAll('[data-action="paste"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!navigator.clipboard?.read) {
                setStatus('Clipboard not available in this context');
                return;
            }
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d')!;
                                ctx.drawImage(img, 0, 0);
                                const imageData = ctx.getImageData(0, 0, img.width, img.height);

                                app.setState({
                                    sourceImage: imageData,
                                    originalFileName: 'clipboard-image'
                                });
                                app.emit('imageloaded', { fileName: 'clipboard-image', imageData });
                                setStatus('Pasted from clipboard');
                            };
                            img.src = URL.createObjectURL(blob);
                            return;
                        }
                    }
                }
                setStatus('No image in clipboard');
            } catch (error) {
                setStatus(`Paste failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    });

    // Export preset actions
    document.querySelectorAll('[data-action="export-preset"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const presetId = (btn as HTMLElement).dataset.preset;
            if (!presetId) return;

            const state = app.getState();
            const image = state.ditheredImage || state.sourceImage;

            if (!image) {
                setStatus('No image to export');
                return;
            }

            // Find preset in defaults or user presets
            const allPresets = [...DEFAULT_EXPORT_PRESETS, ...settings.get('exportPresets')];
            const preset = allPresets.find(p => p.id === presetId);

            if (!preset) {
                setStatus('Export preset not found');
                return;
            }

            const fileName = state.originalFileName || 'image';
            setStatus(`Exporting as ${preset.name}...`);

            try {
                await downloadImageWithPreset(image, fileName, preset);
                setStatus(`Exported: ${preset.name}`);
            } catch (error) {
                setStatus(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    });
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Ignore if typing in input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl/Cmd + O: Open file
        if (cmdOrCtrl && e.key === 'o') {
            e.preventDefault();
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            fileInput?.click();
        }

        // Ctrl/Cmd + S: Save
        if (cmdOrCtrl && e.key === 's') {
            e.preventDefault();
            document.querySelector<HTMLButtonElement>('[data-action="save"]')?.click();
        }

        // Ctrl/Cmd + C: Copy
        if (cmdOrCtrl && e.key === 'c') {
            document.querySelector<HTMLButtonElement>('[data-action="copy"]')?.click();
        }

        // Ctrl/Cmd + V: Paste (handled by browser, but we can override)
        // Already handled by initClipboard

        // Ctrl/Cmd + E: Export video
        if (cmdOrCtrl && e.key === 'e') {
            e.preventDefault();
            const state = app.getState();
            if (state.isVideoMode && state.videoMetadata) {
                handleVideoExport();
            }
        }

        // Ctrl/Cmd + Z: Undo
        if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (app.canUndo()) {
                app.undo();
                setStatus('Undone');
            }
        }

        // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
        if (cmdOrCtrl && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
            e.preventDefault();
            if (app.canRedo()) {
                app.redo();
                setStatus('Redone');
            }
        }

        // ?: Show help dialog
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
            e.preventDefault();
            showHelpDialog();
        }

        // Escape: Deselect / close dialogs
        if (e.key === 'Escape') {
            // Future: close any open dialogs
        }
    });
}


/**
 * Initialize video export button and handlers
 */
function initVideoExport(): void {
    // Export video button
    document.querySelectorAll('[data-action="export-video"]').forEach(btn => {
        btn.addEventListener('click', handleVideoExport);
    });

    // Also handle save action for video mode
    document.querySelectorAll('[data-action="save"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const state = app.getState();

            // If in video mode, show export dialog
            if (state.isVideoMode && state.videoMetadata) {
                handleVideoExport();
                return;
            }

            // Otherwise, save image as usual (handled by initSaveHandlers)
        });
    });
}

/**
 * Handle video export
 */
async function handleVideoExport(): Promise<void> {
    const state = app.getState();

    if (!state.isVideoMode || !state.videoMetadata) {
        setStatus('No video loaded');
        return;
    }

    // Show export dialog
    const result = await showExportDialog(state.videoMetadata);

    if (!result.confirmed || !result.options) {
        return;
    }

    const progressModal = getProgressModal();
    const videoManager = getVideoManager();

    progressModal.onCancel = () => {
        videoManager.cancelExport();
    };

    progressModal.show('Exporting Video...');

    try {
        const blob = await videoManager.exportVideo(
            result.options,
            state,
            (progress) => {
                progressModal.updateProgress(progress);
            }
        );

        progressModal.hide();

        // Generate filename
        const baseName = state.originalFileName?.replace(/\.[^/.]+$/, '') || 'video';
        const extension = result.options.format === 'gif' ? 'gif' : result.options.format;
        const fileName = `${baseName}_dithered.${extension}`;

        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatus(`Exported: ${fileName}`);
    } catch (error) {
        if ((error as Error).message === 'Export cancelled') {
            progressModal.hide();
            setStatus('Export cancelled');
        } else {
            progressModal.setError((error as Error).message);
            console.error('Export failed:', error);
        }
    }
}

/**
 * Initialize Electron native menu handler
 */
function initElectronMenuHandler(): void {
    if (!isElectron()) return;

    onMenuAction((action: string) => {
        console.log('Menu action:', action);

        switch (action) {
            // File menu
            case 'open':
            case 'open-video':
                document.getElementById('file-input')?.click();
                break;
            case 'save':
                document.querySelector<HTMLButtonElement>('[data-action="save"]')?.click();
                break;
            case 'save-as':
                document.querySelector<HTMLButtonElement>('[data-action="save-as"]')?.click();
                break;
            case 'export-preset:web-png':
            case 'export-preset:web-jpg':
            case 'export-preset:hq-png':
            case 'export-preset:social':
                const presetId = action.replace('export-preset:', '');
                const presetBtn = document.querySelector<HTMLButtonElement>(`[data-action="export-preset"][data-preset="${presetId}"]`);
                presetBtn?.click();
                break;
            case 'export-video':
                handleVideoExport();
                break;
            case 'batch':
                showBatchDialog();
                break;

            // Edit menu
            case 'undo':
                if (app.canUndo()) {
                    app.undo();
                    setStatus('Undone');
                }
                break;
            case 'redo':
                if (app.canRedo()) {
                    app.redo();
                    setStatus('Redone');
                }
                break;
            case 'copy':
                document.querySelector<HTMLButtonElement>('[data-action="copy"]')?.click();
                break;
            case 'paste':
                document.querySelector<HTMLButtonElement>('[data-action="paste"]')?.click();
                break;
            case 'reset-adjustments':
                document.querySelector<HTMLButtonElement>('[data-action="reset-adjustments"]')?.click();
                break;
            case 'settings':
                showSettingsDialog();
                break;

            // View menu
            case 'zoom-in':
                document.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')?.click();
                break;
            case 'zoom-out':
                document.querySelector<HTMLButtonElement>('[data-action="zoom-out"]')?.click();
                break;
            case 'fit-to-view':
                document.querySelector<HTMLButtonElement>('[data-action="fit-to-view"]')?.click();
                break;
            case 'actual-size':
                document.querySelector<HTMLButtonElement>('[data-action="actual-size"]')?.click();
                break;
            case 'toggle-original':
                const showOriginal = document.getElementById('show-original') as HTMLInputElement;
                if (showOriginal) {
                    showOriginal.checked = !showOriginal.checked;
                    showOriginal.dispatchEvent(new Event('change'));
                }
                break;

            // Help menu
            case 'help':
                showHelpDialog();
                break;
            case 'api-docs':
                showAPIDocsDialog();
                break;
            case 'about':
                showAboutDialog();
                break;
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

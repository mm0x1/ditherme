/**
 * Ditherista - Professional Dithering Application
 * Main entry point
 */

import { app } from './app.ts';
import { initViewport, initViewControls } from './ui/viewport.ts';
import { initSidebar } from './ui/sidebar.ts';
import { initAdjustments, initDitherSettings } from './ui/adjustments.ts';
import { initPalette } from './ui/palette.ts';
import { initDragAndDrop, initFileInput, initClipboard, initSaveHandlers } from './engine/image.ts';
import { initDitherEngine } from './engine/dither.ts';

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
 * Initialize the application
 */
function init(): void {
    console.log('Ditherista initializing...');

    try {
        // Initialize UI components
        const sidebar = getElement('sidebar');
        const viewport = getElement('viewport');
        const adjustments = getElement('adjustments');
        const palette = getElement('palette');

        // Initialize viewport (canvas with zoom/pan)
        const viewportControls = initViewport(viewport);

        // Initialize sidebar (algorithm selection)
        initSidebar(sidebar);

        // Initialize adjustments panel
        initAdjustments(adjustments);

        // Initialize dither settings (Pixel Scale, Levels)
        initDitherSettings();

        // Initialize palette panel
        initPalette(palette);

        // Initialize view controls
        initViewControls(viewportControls);

        // Initialize image loading
        initDragAndDrop(viewport);
        initFileInput();
        initClipboard();
        initSaveHandlers();

        // Initialize dithering engine
        initDitherEngine();

        // Initialize menu actions
        initMenus();

        // Initialize keyboard shortcuts
        initKeyboardShortcuts();

        // Listen for dither events
        app.on('ditherstart', (e) => {
            setStatus(`Dithering with ${e.detail.algorithm}...`);
        });

        app.on('dithercomplete', (e) => {
            setStatus(`Done (${e.detail.duration.toFixed(0)}ms)`);
        });

        app.on('dithererror', (e) => {
            setStatus(`Error: ${e.detail.error.message}`);
            console.error('Dither error:', e.detail.error);
        });

        // Ready
        setStatus('Ready - Drop an image or use File > Open');
        console.log('Ditherista ready');

    } catch (error) {
        console.error('Failed to initialize Ditherista:', error);
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

        // Escape: Deselect / close dialogs
        if (e.key === 'Escape') {
            // Future: close any open dialogs
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

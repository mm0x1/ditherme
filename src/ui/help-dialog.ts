/**
 * Help dialog - displays keyboard shortcuts and app info
 */

interface Shortcut {
    keys: string;
    description: string;
    category: string;
}

const KEYBOARD_SHORTCUTS: Shortcut[] = [
    // File
    { keys: 'Ctrl/Cmd + O', description: 'Open image or video', category: 'File' },
    { keys: 'Ctrl/Cmd + S', description: 'Save image', category: 'File' },
    { keys: 'Ctrl/Cmd + C', description: 'Copy to clipboard', category: 'File' },
    { keys: 'Ctrl/Cmd + V', description: 'Paste from clipboard', category: 'File' },
    { keys: 'Ctrl/Cmd + E', description: 'Export video', category: 'File' },

    // Edit
    { keys: 'Ctrl/Cmd + Z', description: 'Undo', category: 'Edit' },
    { keys: 'Ctrl/Cmd + Shift + Z', description: 'Redo', category: 'Edit' },
    { keys: 'Ctrl/Cmd + Y', description: 'Redo (alternate)', category: 'Edit' },

    // View
    { keys: '+ / =', description: 'Zoom in', category: 'View' },
    { keys: '-', description: 'Zoom out', category: 'View' },
    { keys: '0', description: 'Reset view (100%)', category: 'View' },
    { keys: '.', description: 'Fit to view', category: 'View' },
    { keys: 'Space (hold)', description: 'Show original image', category: 'View' },

    // Navigation
    { keys: '\u2191 / \u2193', description: 'Navigate algorithms', category: 'Navigation' },
    { keys: '?', description: 'Show this help', category: 'Navigation' },
];

/**
 * Show the help dialog
 */
export function showHelpDialog(): void {
    // Remove existing dialog if present
    const existing = document.querySelector('.help-dialog');
    if (existing) {
        existing.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal help-dialog';

    // Group shortcuts by category
    const byCategory = new Map<string, Shortcut[]>();
    for (const shortcut of KEYBOARD_SHORTCUTS) {
        const list = byCategory.get(shortcut.category) || [];
        list.push(shortcut);
        byCategory.set(shortcut.category, list);
    }

    let shortcutsHtml = '';
    for (const [category, shortcuts] of byCategory) {
        shortcutsHtml += `
            <div class="shortcut-category">
                <h4>${category}</h4>
                <div class="shortcut-list">
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <kbd>${s.keys}</kbd>
                            <span>${s.description}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content help-content">
            <div class="help-header">
                <h3>Keyboard Shortcuts</h3>
                <button class="close-btn" title="Close">&times;</button>
            </div>
            <div class="shortcuts-grid">
                ${shortcutsHtml}
            </div>
            <div class="help-footer">
                <p><strong>dithertoy</strong> - Professional Dithering Application</p>
                <p class="help-tips">
                    Drag and drop images to load them. Star your favorite algorithms for quick access.
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Hide the help dialog if open
 */
export function hideHelpDialog(): void {
    const dialog = document.querySelector('.help-dialog');
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Show the about dialog
 */
export function showAboutDialog(): void {
    // Remove existing dialog if present
    const existing = document.querySelector('.about-dialog');
    if (existing) {
        existing.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal about-dialog';

    modal.innerHTML = `
        <div class="modal-content about-content">
            <div class="help-header">
                <button class="close-btn" title="Close">&times;</button>
            </div>
            <div class="about-body">
                <div class="about-logo">
                    <span class="logo-icon">◐</span>
                    <span class="logo-text">dithertoy</span>
                </div>
                <p class="about-version">Version 1.0.0</p>
                <p class="about-description">
                    A professional dithering application for creating retro-style
                    graphics, pixel art, and artistic image effects.
                </p>
                <div class="about-features">
                    <h4>Features</h4>
                    <ul>
                        <li>100+ dithering algorithms</li>
                        <li>WASM-accelerated processing</li>
                        <li>Video dithering support</li>
                        <li>Custom color palettes</li>
                        <li>Batch processing</li>
                        <li>Real-time preview</li>
                    </ul>
                </div>
                <p class="about-copyright">
                    &copy; 2024 dithertoy
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

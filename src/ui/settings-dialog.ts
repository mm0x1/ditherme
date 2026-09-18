/**
 * Settings dialog - allows users to configure preferences
 */

import { settings } from '../utils/settings.ts';

/**
 * Show the settings dialog
 */
export function showSettingsDialog(): void {
    // Remove existing dialog if present
    const existing = document.querySelector('.settings-dialog');
    if (existing) {
        existing.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal settings-dialog';

    const currentSettings = settings.getAll();

    modal.innerHTML = `
        <div class="modal-content settings-content">
            <div class="help-header">
                <h3>Settings</h3>
                <button class="close-btn" title="Close">&times;</button>
            </div>
            <div class="settings-body">
                <div class="settings-section">
                    <h4>Display</h4>
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="setting-wasm-badges" ${currentSettings.showWasmBadges ? 'checked' : ''}>
                            <span>Show WASM badges</span>
                        </label>
                        <p class="setting-description">Display badges on WASM-accelerated algorithms</p>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="setting-auto-fit" ${currentSettings.autoFitOnLoad ? 'checked' : ''}>
                            <span>Auto-fit on load</span>
                        </label>
                        <p class="setting-description">Automatically fit image to viewport when loaded</p>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>Performance</h4>
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="setting-caching" ${currentSettings.enableCaching ? 'checked' : ''}>
                            <span>Enable caching</span>
                        </label>
                        <p class="setting-description">Cache dithered results for faster switching</p>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <span>Cache size (MB)</span>
                            <input type="number" id="setting-cache-size" value="${currentSettings.cacheMaxMemoryMB}" min="64" max="1024" step="64">
                        </label>
                        <p class="setting-description">Maximum memory for image cache</p>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>Defaults</h4>
                    <div class="setting-item">
                        <label class="setting-label">
                            <span>Default mode</span>
                            <select id="setting-default-mode">
                                <option value="mono" ${currentSettings.defaultMode === 'mono' ? 'selected' : ''}>Monochrome</option>
                                <option value="color" ${currentSettings.defaultMode === 'color' ? 'selected' : ''}>Color</option>
                            </select>
                        </label>
                    </div>
                </div>

            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="settings-reset">Reset to Defaults</button>
                <button class="btn btn-primary" id="settings-save">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Get form elements
    const wasmBadgesCheckbox = modal.querySelector('#setting-wasm-badges') as HTMLInputElement;
    const autoFitCheckbox = modal.querySelector('#setting-auto-fit') as HTMLInputElement;
    const cachingCheckbox = modal.querySelector('#setting-caching') as HTMLInputElement;
    const cacheSizeInput = modal.querySelector('#setting-cache-size') as HTMLInputElement;
    const defaultModeSelect = modal.querySelector('#setting-default-mode') as HTMLSelectElement;
    const saveBtn = modal.querySelector('#settings-save') as HTMLButtonElement;
    const resetBtn = modal.querySelector('#settings-reset') as HTMLButtonElement;
    const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement;

    // Save handler
    saveBtn.addEventListener('click', () => {
        settings.update({
            showWasmBadges: wasmBadgesCheckbox.checked,
            autoFitOnLoad: autoFitCheckbox.checked,
            enableCaching: cachingCheckbox.checked,
            cacheMaxMemoryMB: parseInt(cacheSizeInput.value, 10),
            defaultMode: defaultModeSelect.value as 'mono' | 'color'
        });

        modal.remove();
    });

    // Reset handler
    resetBtn.addEventListener('click', () => {
        if (confirm('Reset all settings to defaults?')) {
            settings.reset();
            modal.remove();
        }
    });

    // Close handlers
    closeBtn.addEventListener('click', () => modal.remove());

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

/**
 * Settings dialog - allows users to configure preferences
 */

import { settings } from '../utils/settings.ts';
import { generateToken } from '../api/middleware/auth.ts';
import { isElectron } from '../utils/electron-bridge.ts';

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

                <div class="settings-section">
                    <h4>Scripting API</h4>
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="setting-api-enabled" ${currentSettings.apiEnabled ? 'checked' : ''}>
                            <span>Enable API</span>
                        </label>
                        <p class="setting-description">Allow external scripts to control dithertoy via HTTP API</p>
                    </div>
                    <div class="setting-item" id="api-port-group">
                        <label class="setting-label">
                            <span>Port</span>
                            <input type="number" id="setting-api-port" value="${currentSettings.apiPort}" min="1024" max="65535" step="1">
                        </label>
                        <p class="setting-description">API server port (default: 7842)</p>
                    </div>
                    <div class="setting-item" id="api-auth-group">
                        <label class="setting-label">
                            <input type="checkbox" id="setting-api-auth-enabled" ${currentSettings.apiAuthEnabled ? 'checked' : ''}>
                            <span>Require authentication</span>
                        </label>
                        <p class="setting-description">Require Bearer token for API requests</p>
                    </div>
                    <div class="setting-item" id="api-token-group" style="${currentSettings.apiAuthEnabled ? '' : 'display: none;'}">
                        <label class="setting-label">
                            <span>API Token</span>
                            <div class="token-input-group">
                                <input type="text" id="setting-api-token" value="${currentSettings.apiAuthToken || ''}" placeholder="Enter or generate token" style="flex: 1;">
                                <button type="button" class="btn btn-small" id="generate-token-btn">Generate</button>
                            </div>
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

    // API settings elements
    const apiEnabledCheckbox = modal.querySelector('#setting-api-enabled') as HTMLInputElement;
    const apiPortInput = modal.querySelector('#setting-api-port') as HTMLInputElement;
    const apiAuthEnabledCheckbox = modal.querySelector('#setting-api-auth-enabled') as HTMLInputElement;
    const apiTokenInput = modal.querySelector('#setting-api-token') as HTMLInputElement;
    const generateTokenBtn = modal.querySelector('#generate-token-btn') as HTMLButtonElement;
    const apiTokenGroup = modal.querySelector('#api-token-group') as HTMLElement;

    // Toggle token visibility based on auth enabled
    apiAuthEnabledCheckbox.addEventListener('change', () => {
        apiTokenGroup.style.display = apiAuthEnabledCheckbox.checked ? '' : 'none';
    });

    // Generate token button
    generateTokenBtn.addEventListener('click', () => {
        apiTokenInput.value = generateToken(32);
    });

    // Save handler
    saveBtn.addEventListener('click', async () => {
        const apiPort = parseInt(apiPortInput.value, 10);
        const apiAuthToken = apiTokenInput.value.trim() || null;

        settings.update({
            showWasmBadges: wasmBadgesCheckbox.checked,
            autoFitOnLoad: autoFitCheckbox.checked,
            enableCaching: cachingCheckbox.checked,
            cacheMaxMemoryMB: parseInt(cacheSizeInput.value, 10),
            defaultMode: defaultModeSelect.value as 'mono' | 'color',
            apiEnabled: apiEnabledCheckbox.checked,
            apiPort: Math.max(1024, Math.min(65535, isNaN(apiPort) ? 7842 : apiPort)),
            apiAuthEnabled: apiAuthEnabledCheckbox.checked,
            apiAuthToken
        });

        // Update API server in Electron mode
        if (isElectron() && window.electronAPI) {
            if (apiEnabledCheckbox.checked) {
                const result = await window.electronAPI.startAPIServer({
                    port: apiPort,
                    bindAddress: '127.0.0.1',
                    authEnabled: apiAuthEnabledCheckbox.checked,
                    authToken: apiAuthToken
                });
                if (!result.success) {
                    console.error('Failed to update API server:', result.error);
                }
            } else {
                await window.electronAPI.stopAPIServer();
            }
        }

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

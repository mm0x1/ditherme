/**
 * Save palette dialog - prompt for palette name
 */

import { paletteStorage } from '../utils/palette-storage.ts';

/**
 * Result from the save dialog
 */
export interface SavePaletteDialogResult {
    confirmed: boolean;
    name?: string;
}

/**
 * Show the save palette dialog
 */
export function showSavePaletteDialog(currentName?: string): Promise<SavePaletteDialogResult> {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal save-palette-dialog';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Save Palette</h3>

                <div class="form-group">
                    <label for="palette-name-input">Palette Name</label>
                    <input type="text" id="palette-name-input" class="form-input"
                           maxlength="50" placeholder="Enter palette name..."
                           value="${currentName || ''}">
                </div>

                <div class="save-palette-warning hidden" id="save-palette-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>A palette with this name already exists and will be overwritten.</span>
                </div>

                <div class="save-palette-info" id="save-palette-info">
                    <span id="palette-count">${paletteStorage.getCount()}</span> / 50 palettes saved
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="save-palette-cancel">Cancel</button>
                    <button class="btn btn-primary" id="save-palette-confirm">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = modal.querySelector('#palette-name-input') as HTMLInputElement;
        const warningEl = modal.querySelector('#save-palette-warning') as HTMLElement;
        const cancelBtn = modal.querySelector('#save-palette-cancel') as HTMLButtonElement;
        const confirmBtn = modal.querySelector('#save-palette-confirm') as HTMLButtonElement;

        // Focus input and select text
        nameInput.focus();
        nameInput.select();

        /**
         * Update warning visibility
         */
        function updateWarning(): void {
            const name = nameInput.value.trim();
            if (name && paletteStorage.nameExists(name)) {
                warningEl.classList.remove('hidden');
            } else {
                warningEl.classList.add('hidden');
            }
        }

        /**
         * Validate input
         */
        function validate(): boolean {
            const name = nameInput.value.trim();
            return name.length > 0 && name.length <= 50;
        }

        /**
         * Close dialog
         */
        function close(): void {
            modal.remove();
            document.removeEventListener('keydown', handleKeydown);
        }

        // Event listeners
        nameInput.addEventListener('input', () => {
            updateWarning();
            confirmBtn.disabled = !validate();
        });

        cancelBtn.addEventListener('click', () => {
            close();
            resolve({ confirmed: false });
        });

        confirmBtn.addEventListener('click', () => {
            if (!validate()) return;
            const name = nameInput.value.trim();
            close();
            resolve({ confirmed: true, name });
        });

        // Handle keyboard
        function handleKeydown(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                close();
                resolve({ confirmed: false });
            } else if (e.key === 'Enter' && validate()) {
                const name = nameInput.value.trim();
                close();
                resolve({ confirmed: true, name });
            }
        }
        document.addEventListener('keydown', handleKeydown);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                close();
                resolve({ confirmed: false });
            }
        });

        // Initial state
        updateWarning();
        confirmBtn.disabled = !validate();
    });
}

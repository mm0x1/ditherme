/**
 * Export palette dialog - select export format
 */

import type { Palette } from '../types/palette.ts';
import { downloadPalette, type ExportFormat } from '../utils/palette-export.ts';
import { escapeHtml } from '../utils/html.ts';

/**
 * Result from the export dialog
 */
export interface ExportPaletteDialogResult {
    confirmed: boolean;
    format?: ExportFormat;
}

/**
 * Show the export palette dialog
 */
export function showExportPaletteDialog(palette: Palette): Promise<ExportPaletteDialogResult> {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal export-palette-dialog';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Export Palette</h3>

                <div class="export-palette-preview">
                    <div class="export-palette-name">${escapeHtml(palette.name)}</div>
                    <div class="export-palette-swatches">
                        ${palette.colors.slice(0, 16).map(c =>
                            `<div class="export-swatch" style="background-color: rgb(${c.r},${c.g},${c.b})"></div>`
                        ).join('')}
                        ${palette.colors.length > 16 ? `<div class="export-swatch-more">+${palette.colors.length - 16}</div>` : ''}
                    </div>
                    <div class="export-palette-count">${palette.colors.length} colors</div>
                </div>

                <div class="form-group">
                    <label for="export-format-select">Format</label>
                    <select id="export-format-select" class="form-select">
                        <option value="json">JSON - Recommended for re-import</option>
                        <option value="gpl">GPL - GIMP Palette</option>
                        <option value="hex">HEX - Simple hex list</option>
                        <option value="pal">PAL - JASC-PAL format</option>
                    </select>
                </div>

                <div class="export-format-info" id="export-format-info">
                    JSON format preserves the palette name and can be easily re-imported.
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="export-palette-cancel">Cancel</button>
                    <button class="btn btn-primary" id="export-palette-confirm">Export</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const formatSelect = modal.querySelector('#export-format-select') as HTMLSelectElement;
        const formatInfo = modal.querySelector('#export-format-info') as HTMLElement;
        const cancelBtn = modal.querySelector('#export-palette-cancel') as HTMLButtonElement;
        const confirmBtn = modal.querySelector('#export-palette-confirm') as HTMLButtonElement;

        const formatDescriptions: Record<ExportFormat, string> = {
            json: 'JSON format preserves the palette name and can be easily re-imported.',
            gpl: 'GIMP Palette format, compatible with GIMP and other image editors.',
            hex: 'Simple list of hex colors, one per line. Easy to read and edit.',
            pal: 'JASC-PAL format, compatible with Paint Shop Pro and other applications.'
        };

        /**
         * Update format description
         */
        function updateFormatInfo(): void {
            const format = formatSelect.value as ExportFormat;
            formatInfo.textContent = formatDescriptions[format];
        }

        /**
         * Close dialog
         */
        function close(): void {
            modal.remove();
            document.removeEventListener('keydown', handleKeydown);
        }

        // Event listeners
        formatSelect.addEventListener('change', updateFormatInfo);

        cancelBtn.addEventListener('click', () => {
            close();
            resolve({ confirmed: false });
        });

        confirmBtn.addEventListener('click', async () => {
            const format = formatSelect.value as ExportFormat;
            close();
            try {
                const saved = await downloadPalette(palette, format);
                resolve(saved ? { confirmed: true, format } : { confirmed: false });
            } catch (error) {
                console.error('Palette export failed:', error);
                resolve({ confirmed: false });
            }
        });

        // Handle keyboard
        function handleKeydown(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                close();
                resolve({ confirmed: false });
            } else if (e.key === 'Enter') {
                const format = formatSelect.value as ExportFormat;
                close();
                void downloadPalette(palette, format)
                    .then(saved => {
                        resolve(saved ? { confirmed: true, format } : { confirmed: false });
                    })
                    .catch(error => {
                        console.error('Palette export failed:', error);
                        resolve({ confirmed: false });
                    });
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
    });
}

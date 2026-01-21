/**
 * Batch processing dialog - select files and process with current settings
 */

import { app } from '../app.ts';
import { settings } from '../utils/settings.ts';
import { DEFAULT_EXPORT_PRESETS } from '../types/settings.ts';
import { processBatch, downloadBatchResults } from '../engine/batch-processor.ts';
import { ALGORITHMS } from '../algorithms/index.ts';
import type { Algorithm, ImageAdjustments } from '../types/index.ts';

/**
 * Check if any adjustments are non-default
 */
function hasAdjustments(adj: ImageAdjustments): boolean {
    return adj.brightness !== 0 || adj.contrast !== 0 ||
           adj.gamma !== 1.0 || (adj.saturation ?? 0) !== 0 ||
           adj.blackPoint !== 0 || adj.whitePoint !== 255;
}

/**
 * Show the batch processing dialog
 */
export function showBatchDialog(): void {
    // Remove existing dialog if present
    const existing = document.querySelector('.batch-dialog');
    if (existing) {
        existing.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal batch-dialog';

    const state = app.getState();
    const algorithmInfo = ALGORITHMS[state.algorithm as Algorithm];
    const allPresets = [...DEFAULT_EXPORT_PRESETS, ...settings.get('exportPresets')];

    modal.innerHTML = `
        <div class="modal-content">
            <div class="help-header">
                <h3>Batch Dither</h3>
                <button class="close-btn" title="Close">&times;</button>
            </div>

            <div class="batch-dropzone" id="batch-dropzone">
                <p>Drop images here or click to select</p>
                <p class="batch-hint">Supports PNG, JPEG, GIF, BMP, WebP</p>
                <input type="file" id="batch-files" multiple
                       accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
                       style="display: none;">
            </div>

            <div class="batch-file-list" id="batch-file-list">
                <div class="batch-empty">No files selected</div>
            </div>

            <div class="form-group">
                <label for="batch-preset">Export Preset</label>
                <select id="batch-preset" class="form-select">
                    ${allPresets.map(p => `
                        <option value="${p.id}">${p.name}</option>
                    `).join('')}
                </select>
            </div>

            <div class="batch-info">
                <p>Current settings will be applied to all images:</p>
                <ul>
                    <li>Algorithm: <strong>${algorithmInfo?.name || state.algorithm}</strong></li>
                    <li>Palette: <strong>${state.palette.name}</strong> (${state.palette.colors.length} colors)</li>
                    <li>Color Match: <strong>${state.colorMatch}</strong></li>
                    ${state.pixelScale > 1 ? `<li>Pixel Scale: <strong>${state.pixelScale}x</strong></li>` : ''}
                    ${state.levels > 0 ? `<li>Levels: <strong>${state.levels}</strong></li>` : ''}
                    ${hasAdjustments(state.adjustments) ? `<li>Adjustments: <strong>Applied</strong></li>` : ''}
                </ul>
            </div>

            <div class="batch-progress hidden" id="batch-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="batch-progress-fill" style="width: 0%"></div>
                </div>
                <p id="batch-progress-text">Processing...</p>
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" id="batch-cancel">Cancel</button>
                <button class="btn btn-primary" id="batch-start" disabled>
                    Start Processing
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // State
    let selectedFiles: File[] = [];
    let isProcessing = false;

    // Elements
    const dropzone = modal.querySelector('#batch-dropzone') as HTMLElement;
    const fileInput = modal.querySelector('#batch-files') as HTMLInputElement;
    const fileList = modal.querySelector('#batch-file-list') as HTMLElement;
    const presetSelect = modal.querySelector('#batch-preset') as HTMLSelectElement;
    const progressContainer = modal.querySelector('#batch-progress') as HTMLElement;
    const progressFill = modal.querySelector('#batch-progress-fill') as HTMLElement;
    const progressText = modal.querySelector('#batch-progress-text') as HTMLElement;
    const startBtn = modal.querySelector('#batch-start') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#batch-cancel') as HTMLButtonElement;
    const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement;

    /**
     * Update file list display
     */
    function updateFileList(): void {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '<div class="batch-empty">No files selected</div>';
            startBtn.disabled = true;
            return;
        }

        fileList.innerHTML = selectedFiles.map((file, index) => `
            <div class="batch-file-item" data-index="${index}">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button class="remove-file" data-index="${index}" title="Remove">&times;</button>
            </div>
        `).join('');

        startBtn.disabled = false;

        // Attach remove handlers
        fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt((btn as HTMLElement).dataset.index || '0');
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Add files to selection
     */
    function addFiles(files: FileList | File[]): void {
        const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp'];
        const newFiles = Array.from(files).filter(f => imageTypes.includes(f.type));
        selectedFiles = [...selectedFiles, ...newFiles];
        updateFileList();
    }

    // Dropzone click
    dropzone.addEventListener('click', () => {
        if (!isProcessing) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', () => {
        if (fileInput.files) {
            addFiles(fileInput.files);
            fileInput.value = '';
        }
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer?.files && !isProcessing) {
            addFiles(e.dataTransfer.files);
        }
    });

    // Start processing
    startBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0 || isProcessing) return;

        isProcessing = true;
        startBtn.disabled = true;
        dropzone.style.pointerEvents = 'none';
        progressContainer.classList.remove('hidden');

        const presetId = presetSelect.value;
        const preset = allPresets.find(p => p.id === presetId) || allPresets[0];

        try {
            const jobs = await processBatch(
                selectedFiles,
                { exportPreset: preset },
                (current, total, fileName, status) => {
                    const percent = (current / total) * 100;
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `${current}/${total}: ${fileName} - ${status}`;
                }
            );

            // Show results
            const completed = jobs.filter(j => j.status === 'complete').length;
            const errors = jobs.filter(j => j.status === 'error').length;

            progressText.textContent = `Complete! ${completed} succeeded, ${errors} failed`;

            if (completed > 0) {
                // Download all completed files
                await downloadBatchResults(jobs, preset);
            }

        } catch (error) {
            progressText.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
        }

        isProcessing = false;
        startBtn.disabled = false;
        startBtn.textContent = 'Process More';
        dropzone.style.pointerEvents = '';
        selectedFiles = [];
        updateFileList();
    });

    // Close handlers
    function closeDialog(): void {
        if (!isProcessing) {
            modal.remove();
        }
    }

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDialog();
    });

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isProcessing) {
            closeDialog();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

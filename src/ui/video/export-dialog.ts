/**
 * Export dialog for video export settings
 */

import type { VideoMetadata, VideoExportOptions, VideoExportFormat } from '../../types/video.ts';

/**
 * Result from the export dialog
 */
export interface ExportDialogResult {
    confirmed: boolean;
    options?: VideoExportOptions;
}

/**
 * Create and show the export dialog
 */
export function showExportDialog(metadata: VideoMetadata): Promise<ExportDialogResult> {
    return new Promise((resolve) => {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'modal export-dialog';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Export Video</h3>

                <div class="form-group">
                    <label for="export-format">Format</label>
                    <select id="export-format" class="form-select">
                        <option value="mp4">MP4 (H.264) - Best compatibility</option>
                        <option value="webm">WebM (VP9) - Better compression</option>
                        <option value="gif">GIF - Animated image</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="export-quality">Quality: <span id="quality-value">80</span>%</label>
                    <input type="range" id="export-quality" class="form-range" min="10" max="100" value="80">
                </div>

                <div class="form-group">
                    <label for="export-resolution">Resolution</label>
                    <select id="export-resolution" class="form-select">
                        <option value="original">Original (${metadata.width}x${metadata.height})</option>
                        ${metadata.width > 1280 ? `<option value="1280">1280px wide</option>` : ''}
                        ${metadata.width > 854 ? `<option value="854">854px wide (480p)</option>` : ''}
                        ${metadata.width > 640 ? `<option value="640">640px wide</option>` : ''}
                        <option value="480">480px wide</option>
                        <option value="320">320px wide</option>
                    </select>
                </div>

                <div class="export-info">
                    <p id="export-estimate">Estimated file size: calculating...</p>
                </div>

                <div class="export-warning hidden" id="gif-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>GIF files can be very large. Consider using lower resolution and frame rate.</span>
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" id="export-cancel">Cancel</button>
                    <button class="btn btn-primary" id="export-confirm">Export</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Get element references
        const formatSelect = modal.querySelector('#export-format') as HTMLSelectElement;
        const qualitySlider = modal.querySelector('#export-quality') as HTMLInputElement;
        const qualityValue = modal.querySelector('#quality-value') as HTMLElement;
        const resolutionSelect = modal.querySelector('#export-resolution') as HTMLSelectElement;
        const estimateEl = modal.querySelector('#export-estimate') as HTMLElement;
        const gifWarning = modal.querySelector('#gif-warning') as HTMLElement;
        const cancelBtn = modal.querySelector('#export-cancel') as HTMLButtonElement;
        const confirmBtn = modal.querySelector('#export-confirm') as HTMLButtonElement;

        /**
         * Calculate output dimensions
         */
        function getOutputDimensions(): { width: number; height: number } {
            const resolution = resolutionSelect.value;
            if (resolution === 'original') {
                return { width: metadata.width, height: metadata.height };
            }

            const targetWidth = parseInt(resolution, 10);
            const aspectRatio = metadata.height / metadata.width;
            const targetHeight = Math.round(targetWidth * aspectRatio);

            // Ensure even dimensions for video encoding
            return {
                width: targetWidth % 2 === 0 ? targetWidth : targetWidth - 1,
                height: targetHeight % 2 === 0 ? targetHeight : targetHeight - 1,
            };
        }

        /**
         * Estimate file size
         */
        function updateEstimate(): void {
            const format = formatSelect.value as VideoExportFormat;
            const quality = parseInt(qualitySlider.value, 10);
            const fps = metadata.frameRate;
            const { width, height } = getOutputDimensions();
            const duration = metadata.duration;
            const frameCount = Math.round(duration * fps);

            // Very rough estimates
            let sizeBytes: number;

            if (format === 'gif') {
                // GIF: ~0.5-2 bytes per pixel per frame (highly variable)
                const bytesPerPixel = 0.3 + (quality / 100) * 1.2;
                sizeBytes = width * height * frameCount * bytesPerPixel;
            } else if (format === 'webm') {
                // WebM VP9: ~0.02-0.1 bits per pixel per frame
                const bitsPerPixel = 0.02 + (quality / 100) * 0.08;
                sizeBytes = (width * height * frameCount * bitsPerPixel) / 8;
            } else {
                // MP4 H.264: ~0.05-0.2 bits per pixel per frame
                const bitsPerPixel = 0.05 + (quality / 100) * 0.15;
                sizeBytes = (width * height * frameCount * bitsPerPixel) / 8;
            }

            // Format size
            let sizeStr: string;
            if (sizeBytes > 1024 * 1024 * 1024) {
                sizeStr = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
            } else if (sizeBytes > 1024 * 1024) {
                sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
            } else if (sizeBytes > 1024) {
                sizeStr = `${(sizeBytes / 1024).toFixed(0)} KB`;
            } else {
                sizeStr = `${sizeBytes.toFixed(0)} bytes`;
            }

            estimateEl.textContent = `Estimated file size: ~${sizeStr}`;

            // Show/hide GIF warning
            if (format === 'gif') {
                gifWarning.classList.remove('hidden');
            } else {
                gifWarning.classList.add('hidden');
            }
        }

        // Event listeners
        formatSelect.addEventListener('change', updateEstimate);
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
            updateEstimate();
        });
        resolutionSelect.addEventListener('change', updateEstimate);

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve({ confirmed: false });
        });

        confirmBtn.addEventListener('click', () => {
            const { width, height } = getOutputDimensions();
            const options: VideoExportOptions = {
                format: formatSelect.value as VideoExportFormat,
                quality: parseInt(qualitySlider.value, 10),
                frameRate: metadata.frameRate,
                width,
                height,
            };

            modal.remove();
            resolve({ confirmed: true, options });
        });

        // Close on escape
        function handleEscape(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve({ confirmed: false });
            }
        }
        document.addEventListener('keydown', handleEscape);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve({ confirmed: false });
            }
        });

        // Initial estimate
        updateEstimate();
    });
}

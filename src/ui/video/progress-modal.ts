/**
 * Progress modal for video export operations
 */

import type { VideoProcessingProgress } from '../../types/video.ts';

/**
 * Progress modal controls
 */
export interface ProgressModalControls {
    show(title: string): void;
    updateProgress(progress: VideoProcessingProgress): void;
    setError(message: string): void;
    hide(): void;
    onCancel?: () => void;
}

/**
 * Format stage name for display
 */
function formatStage(stage: string): string {
    switch (stage) {
        case 'loading': return 'Loading video...';
        case 'extracting': return 'Extracting frames...';
        case 'dithering': return 'Applying dither...';
        case 'encoding': return 'Encoding video...';
        case 'finalizing': return 'Finalizing...';
        default: return stage;
    }
}

/**
 * Format estimated time remaining
 */
function formatTimeRemaining(ms: number | undefined): string {
    if (ms === undefined || ms <= 0) return '';

    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
        return `~${seconds}s remaining`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m remaining`;
}

/**
 * Create a progress modal
 */
export function createProgressModal(): ProgressModalControls {
    let onCancelCallback: (() => void) | undefined;
    let startTime: number | null = null;

    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal progress-modal hidden';
    modal.id = 'progress-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 id="progress-title">Processing...</h3>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <p id="progress-status" class="progress-status">Initializing...</p>
            <div class="progress-details">
                <span id="progress-frames"></span>
                <span id="progress-time"></span>
            </div>
            <div class="progress-error hidden" id="progress-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span id="progress-error-text"></span>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="progress-cancel">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Get element references
    const titleEl = modal.querySelector('#progress-title') as HTMLElement;
    const progressFill = modal.querySelector('#progress-fill') as HTMLElement;
    const statusEl = modal.querySelector('#progress-status') as HTMLElement;
    const framesEl = modal.querySelector('#progress-frames') as HTMLElement;
    const timeEl = modal.querySelector('#progress-time') as HTMLElement;
    const errorContainer = modal.querySelector('#progress-error') as HTMLElement;
    const errorText = modal.querySelector('#progress-error-text') as HTMLElement;
    const cancelBtn = modal.querySelector('#progress-cancel') as HTMLButtonElement;

    // Cancel button handler
    cancelBtn.addEventListener('click', () => {
        onCancelCallback?.();
    });

    // Close on escape
    function handleEscape(e: KeyboardEvent): void {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            onCancelCallback?.();
        }
    }

    document.addEventListener('keydown', handleEscape);

    const controls: ProgressModalControls = {
        show(title: string): void {
            titleEl.textContent = title;
            progressFill.style.width = '0%';
            statusEl.textContent = 'Initializing...';
            framesEl.textContent = '';
            timeEl.textContent = '';
            errorContainer.classList.add('hidden');
            cancelBtn.disabled = false;
            startTime = Date.now();
            modal.classList.remove('hidden');
        },

        updateProgress(progress: VideoProcessingProgress): void {
            progressFill.style.width = `${progress.percentage}%`;
            statusEl.textContent = formatStage(progress.stage);
            framesEl.textContent = `Frame ${progress.currentFrame + 1} of ${progress.totalFrames}`;

            // Calculate estimated time remaining
            if (startTime && progress.percentage > 0 && progress.percentage < 100) {
                const elapsed = Date.now() - startTime;
                const estimated = (elapsed / progress.percentage) * (100 - progress.percentage);
                timeEl.textContent = formatTimeRemaining(estimated);
            } else {
                timeEl.textContent = '';
            }
        },

        setError(message: string): void {
            errorText.textContent = message;
            errorContainer.classList.remove('hidden');
            statusEl.textContent = 'Export failed';
            cancelBtn.textContent = 'Close';
        },

        hide(): void {
            modal.classList.add('hidden');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.disabled = false;
            startTime = null;
        },

        set onCancel(callback: (() => void) | undefined) {
            onCancelCallback = callback;
        },
    };

    return controls;
}

// Singleton instance
let progressModal: ProgressModalControls | null = null;

/**
 * Get or create the progress modal
 */
export function getProgressModal(): ProgressModalControls {
    if (!progressModal) {
        progressModal = createProgressModal();
    }
    return progressModal;
}

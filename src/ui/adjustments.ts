import { app } from '../app.ts';
import type { ImageAdjustments } from '../types/index.ts';

/**
 * Initialize adjustment controls
 */
export function initAdjustments(container: HTMLElement): void {
    // Get slider elements
    const brightnessSlider = container.querySelector<HTMLInputElement>('#brightness');
    const contrastSlider = container.querySelector<HTMLInputElement>('#contrast');
    const gammaSlider = container.querySelector<HTMLInputElement>('#gamma');
    const saturationSlider = container.querySelector<HTMLInputElement>('#saturation');
    const saturationGroup = container.querySelector<HTMLElement>('#saturation-group');

    // Get value display elements
    const brightnessValue = container.querySelector<HTMLElement>('#brightness-value');
    const contrastValue = container.querySelector<HTMLElement>('#contrast-value');
    const gammaValue = container.querySelector<HTMLElement>('#gamma-value');
    const saturationValue = container.querySelector<HTMLElement>('#saturation-value');

    /**
     * Update slider values from state
     */
    function updateFromState(): void {
        const state = app.getState();
        const { brightness, contrast, gamma, saturation } = state.adjustments;

        if (brightnessSlider) {
            brightnessSlider.value = String(brightness);
            if (brightnessValue) brightnessValue.textContent = String(brightness);
        }

        if (contrastSlider) {
            contrastSlider.value = String(contrast);
            if (contrastValue) contrastValue.textContent = String(contrast);
        }

        if (gammaSlider) {
            gammaSlider.value = String(gamma);
            if (gammaValue) gammaValue.textContent = gamma.toFixed(1);
        }

        if (saturationSlider && saturation !== undefined) {
            saturationSlider.value = String(saturation);
            if (saturationValue) saturationValue.textContent = String(saturation);
        }

        // Show/hide saturation based on mode
        if (saturationGroup) {
            saturationGroup.style.display = state.mode === 'color' ? '' : 'none';
        }
    }

    /**
     * Create adjustment update handler
     */
    function createAdjustmentHandler(
        slider: HTMLInputElement,
        valueElement: HTMLElement | null,
        key: keyof ImageAdjustments,
        formatter: (v: number) => string = String
    ): void {
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            if (valueElement) {
                valueElement.textContent = formatter(value);
            }
            app.setState({
                adjustments: {
                    ...app.getState().adjustments,
                    [key]: value
                }
            });
        });
    }

    // Attach handlers
    if (brightnessSlider) {
        createAdjustmentHandler(brightnessSlider, brightnessValue, 'brightness');
    }

    if (contrastSlider) {
        createAdjustmentHandler(contrastSlider, contrastValue, 'contrast');
    }

    if (gammaSlider) {
        createAdjustmentHandler(gammaSlider, gammaValue, 'gamma', v => v.toFixed(1));
    }

    if (saturationSlider) {
        createAdjustmentHandler(saturationSlider, saturationValue, 'saturation');
    }

    // Reset button
    const resetButtons = document.querySelectorAll('[data-action="reset-adjustments"]');
    resetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            app.resetAdjustments();
        });
    });

    // Listen for state changes
    app.on('statechange', (e) => {
        if ('adjustments' in e.detail.changes || 'mode' in e.detail.changes) {
            updateFromState();
        }
    });

    // Initial update
    updateFromState();
}

/**
 * Initialize dither settings controls (Pixel Scale, Levels)
 */
export function initDitherSettings(): void {
    // Get slider elements
    const pixelScaleSlider = document.querySelector<HTMLInputElement>('#pixel-scale');
    const levelsSlider = document.querySelector<HTMLInputElement>('#levels');

    // Get value display elements
    const pixelScaleValue = document.querySelector<HTMLElement>('#pixel-scale-value');
    const levelsValue = document.querySelector<HTMLElement>('#levels-value');

    /**
     * Format levels value for display
     */
    function formatLevels(value: number): string {
        if (value === 0) return 'Off';
        if (value === 1) return '2'; // Minimum usable is 2
        return String(value);
    }

    /**
     * Update slider values from state
     */
    function updateFromState(): void {
        const state = app.getState();

        if (pixelScaleSlider) {
            pixelScaleSlider.value = String(state.pixelScale);
            if (pixelScaleValue) pixelScaleValue.textContent = `${state.pixelScale}x`;
        }

        if (levelsSlider) {
            levelsSlider.value = String(state.levels);
            if (levelsValue) levelsValue.textContent = formatLevels(state.levels);
        }
    }

    // Pixel Scale handler
    if (pixelScaleSlider) {
        pixelScaleSlider.addEventListener('input', () => {
            const value = parseInt(pixelScaleSlider.value, 10);
            if (pixelScaleValue) {
                pixelScaleValue.textContent = `${value}x`;
            }
            app.setState({ pixelScale: value });
        });
    }

    // Levels handler
    if (levelsSlider) {
        levelsSlider.addEventListener('input', () => {
            let value = parseInt(levelsSlider.value, 10);
            // Levels of 1 doesn't make sense (need at least 2 colors)
            // So treat 1 as 2
            if (value === 1) value = 2;
            if (levelsValue) {
                levelsValue.textContent = formatLevels(value);
            }
            app.setState({ levels: value });
        });
    }

    // Listen for state changes
    app.on('statechange', (e) => {
        if ('pixelScale' in e.detail.changes || 'levels' in e.detail.changes) {
            updateFromState();
        }
    });

    // Initial update
    updateFromState();
}

import { app } from '../app.ts';
import { settings } from '../utils/settings.ts';
import { IMAGE_EFFECTS, getImageEffectMeta } from '../types/image-effect.ts';
import type { ImageEffect, ImageEffectParams } from '../types/image-effect.ts';

export function initImageEffect(container: HTMLElement): void {
    const select = container.querySelector<HTMLSelectElement>('#image-effect-select');
    const intensityRow = container.querySelector<HTMLElement>('#ie-intensity-row');
    const intensitySlider = container.querySelector<HTMLInputElement>('#ie-intensity');
    const intensityValue = container.querySelector<HTMLElement>('#ie-intensity-value');
    const thresholdRow = container.querySelector<HTMLElement>('#ie-threshold-row');
    const thresholdSlider = container.querySelector<HTMLInputElement>('#ie-threshold');
    const thresholdValue = container.querySelector<HTMLElement>('#ie-threshold-value');
    const radiusRow = container.querySelector<HTMLElement>('#ie-radius-row');
    const radiusSlider = container.querySelector<HTMLInputElement>('#ie-radius');
    const radiusValue = container.querySelector<HTMLElement>('#ie-radius-value');
    const colorRow = container.querySelector<HTMLElement>('#ie-color-row');
    const colorInput = container.querySelector<HTMLInputElement>('#ie-color-input');
    const amountRow = container.querySelector<HTMLElement>('#ie-amount-row');
    const amountSlider = container.querySelector<HTMLInputElement>('#ie-amount');
    const amountValue = container.querySelector<HTMLElement>('#ie-amount-value');

    if (!select) return;

    const effectSelect = select;

    // Populate select from IMAGE_EFFECTS registry
    for (const meta of IMAGE_EFFECTS) {
        const option = document.createElement('option');
        option.value = meta.id;
        option.textContent = meta.label;
        effectSelect.appendChild(option);
    }

    // Restore persisted values into app state on init
    const persistedEffect = settings.get('imageEffect');
    const persistedParams = settings.get('imageEffectParams');
    app.setState({ imageEffect: persistedEffect, imageEffectParams: persistedParams });

    function updateFromState(): void {
        const state = app.getState();
        const effect = state.imageEffect;
        const params = state.imageEffectParams;
        const meta = getImageEffectMeta(effect);
        const isNone = effect === 'none';

        effectSelect.value = effect;

        // Show/hide intensity row for all non-none effects
        if (intensityRow) intensityRow.style.display = isNone ? 'none' : '';
        if (intensitySlider) intensitySlider.value = String(params.intensity);
        if (intensityValue) intensityValue.textContent = String(params.intensity);

        if (thresholdRow) thresholdRow.style.display = meta.hasThreshold ? '' : 'none';
        if (thresholdSlider) thresholdSlider.value = String(params.threshold);
        if (thresholdValue) thresholdValue.textContent = String(params.threshold);

        if (radiusRow) radiusRow.style.display = meta.hasRadius ? '' : 'none';
        if (radiusSlider) radiusSlider.value = String(params.radius);
        if (radiusValue) radiusValue.textContent = String(params.radius);

        if (colorRow) colorRow.style.display = meta.hasColor ? '' : 'none';
        if (colorInput) colorInput.value = params.color;

        if (amountRow) amountRow.style.display = meta.hasAmount ? '' : 'none';
        if (amountSlider) amountSlider.value = String(params.amount);
        if (amountValue) amountValue.textContent = String(params.amount);
    }

    function updateParam(partial: Partial<ImageEffectParams>): void {
        const current = app.getState().imageEffectParams;
        const updated: ImageEffectParams = { ...current, ...partial };
        app.setState({ imageEffectParams: updated });
        settings.set('imageEffectParams', updated);
    }

    effectSelect.addEventListener('change', () => {
        const value = effectSelect.value as ImageEffect;
        app.setState({ imageEffect: value }, true);
        settings.set('imageEffect', value);
    });

    if (intensitySlider) {
        intensitySlider.addEventListener('mousedown', () => { app.saveToHistory(); });
        intensitySlider.addEventListener('input', () => {
            const v = parseInt(intensitySlider.value);
            if (intensityValue) intensityValue.textContent = String(v);
            updateParam({ intensity: v });
        });
    }

    if (thresholdSlider) {
        thresholdSlider.addEventListener('mousedown', () => { app.saveToHistory(); });
        thresholdSlider.addEventListener('input', () => {
            const v = parseInt(thresholdSlider.value);
            if (thresholdValue) thresholdValue.textContent = String(v);
            updateParam({ threshold: v });
        });
    }

    if (radiusSlider) {
        radiusSlider.addEventListener('mousedown', () => { app.saveToHistory(); });
        radiusSlider.addEventListener('input', () => {
            const v = parseInt(radiusSlider.value);
            if (radiusValue) radiusValue.textContent = String(v);
            updateParam({ radius: v });
        });
    }

    if (colorInput) {
        colorInput.addEventListener('input', () => {
            const hex = colorInput.value;
            if (/^#[0-9a-f]{6}$/i.test(hex)) {
                updateParam({ color: hex });
            }
        });
    }

    if (amountSlider) {
        amountSlider.addEventListener('mousedown', () => { app.saveToHistory(); });
        amountSlider.addEventListener('input', () => {
            const v = parseInt(amountSlider.value);
            if (amountValue) amountValue.textContent = String(v);
            updateParam({ amount: v });
        });
    }

    app.on('statechange', (e) => {
        if ('imageEffect' in e.detail.changes || 'imageEffectParams' in e.detail.changes) {
            updateFromState();
        }
    });

    updateFromState();
}

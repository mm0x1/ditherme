import { app } from '../app.ts';
import { settings } from '../utils/settings.ts';
import { POST_EFFECTS, getPostEffectMeta } from '../types/post-effect.ts';
import type { PostEffect } from '../types/post-effect.ts';
import type { ImageAdjustments } from '../types/state.ts';

/**
 * Initialize post-processing effect controls
 */
export function initPostEffect(container: HTMLElement): void {
    const select = container.querySelector<HTMLSelectElement>('#post-effect-select');
    const colorRow = container.querySelector<HTMLElement>('#effect-color-row');
    const colorInput = container.querySelector<HTMLInputElement>('#effect-color-input');
    const layer2Section = container.querySelector<HTMLElement>('#layer2-adjustments');
    const infoBtn = container.querySelector<HTMLElement>('#post-effect-info');
    const tooltip = container.querySelector<HTMLElement>('#post-effect-tooltip');

    if (!select || !colorRow || !colorInput) return;

    // Narrow types after null check
    const effectSelect = select;
    const colorRowEl = colorRow;
    const colorInputEl = colorInput;

    // Populate select from POST_EFFECTS registry
    for (const meta of POST_EFFECTS) {
        const option = document.createElement('option');
        option.value = meta.id;
        option.textContent = meta.label;
        effectSelect.appendChild(option);
    }

    // Layer 2 slider elements
    const l2Brightness = container.querySelector<HTMLInputElement>('#layer2-brightness');
    const l2BrightnessVal = container.querySelector<HTMLElement>('#layer2-brightness-value');
    const l2Contrast = container.querySelector<HTMLInputElement>('#layer2-contrast');
    const l2ContrastVal = container.querySelector<HTMLElement>('#layer2-contrast-value');
    const l2Gamma = container.querySelector<HTMLInputElement>('#layer2-gamma');
    const l2GammaVal = container.querySelector<HTMLElement>('#layer2-gamma-value');
    const l2BlackPoint = container.querySelector<HTMLInputElement>('#layer2-black-point');
    const l2BlackPointVal = container.querySelector<HTMLElement>('#layer2-black-point-value');
    const l2WhitePoint = container.querySelector<HTMLInputElement>('#layer2-white-point');
    const l2WhitePointVal = container.querySelector<HTMLElement>('#layer2-white-point-value');

    // Restore persisted values into app state on init
    const persistedEffect = settings.get('postEffect');
    const persistedColor = settings.get('effectColor');
    const persistedLayer2 = settings.get('layer2Adjustments');
    app.setState({ postEffect: persistedEffect, effectColor: persistedColor, layer2Adjustments: persistedLayer2 });

    // Tooltip: update text content from POST_EFFECTS meta
    function updateTooltip(effect: PostEffect): void {
        if (!tooltip) return;
        const meta = getPostEffectMeta(effect);
        if (effect === 'none') {
            tooltip.style.display = 'none';
            return;
        }
        // Split on \n\n to separate description from Photoshop recipe
        const [desc, ps] = meta.tooltip.split('\n\n');
        tooltip.innerHTML = `<span class="effect-tooltip-desc">${desc ?? ''}</span>${ps ? `<span class="effect-tooltip-ps">${ps}</span>` : ''}`;
    }

    // Show/hide tooltip on info button hover
    if (infoBtn && tooltip) {
        infoBtn.addEventListener('mouseenter', () => {
            const effect = app.getState().postEffect;
            if (effect !== 'none') {
                updateTooltip(effect);
                tooltip.style.display = '';
            }
        });
        infoBtn.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        // Keep tooltip open while hovering over it
        tooltip.addEventListener('mouseenter', () => {
            tooltip.style.display = '';
        });
        tooltip.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }

    function updateLayer2Sliders(): void {
        const adj = app.getState().layer2Adjustments;
        if (l2Brightness)    { l2Brightness.value = String(adj.brightness); }
        if (l2BrightnessVal) { l2BrightnessVal.textContent = String(adj.brightness); }
        if (l2Contrast)      { l2Contrast.value = String(adj.contrast); }
        if (l2ContrastVal)   { l2ContrastVal.textContent = String(adj.contrast); }
        if (l2Gamma)         { l2Gamma.value = String(adj.gamma); }
        if (l2GammaVal)      { l2GammaVal.textContent = adj.gamma.toFixed(1); }
        if (l2BlackPoint)    { l2BlackPoint.value = String(adj.blackPoint); }
        if (l2BlackPointVal) { l2BlackPointVal.textContent = adj.blackPoint === 0 ? 'Off' : String(adj.blackPoint); }
        if (l2WhitePoint)    { l2WhitePoint.value = String(adj.whitePoint); }
        if (l2WhitePointVal) { l2WhitePointVal.textContent = adj.whitePoint === 255 ? 'Off' : String(adj.whitePoint); }
    }

    function updateFromState(): void {
        const state = app.getState();
        effectSelect.value = state.postEffect;
        colorInputEl.value = state.effectColor;
        colorRowEl.style.display = getPostEffectMeta(state.postEffect).requiresColor ? '' : 'none';
        if (layer2Section) {
            layer2Section.style.display = state.postEffect === 'luminous-pin-light' ? '' : 'none';
        }
        // Hide info button for 'none' (no tooltip content)
        if (infoBtn) {
            (infoBtn as HTMLElement).style.visibility = state.postEffect === 'none' ? 'hidden' : '';
        }
        updateLayer2Sliders();
    }

    // Helper to create a layer2 slider handler
    function wireLayer2Slider(
        slider: HTMLInputElement | null,
        valueEl: HTMLElement | null,
        key: keyof ImageAdjustments,
        formatter: (v: number) => string = String
    ): void {
        if (!slider) return;
        slider.addEventListener('mousedown', () => { app.saveToHistory(); });
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            if (valueEl) valueEl.textContent = formatter(value);
            const current = app.getState().layer2Adjustments;
            const updated: ImageAdjustments = { ...current, [key]: value };
            app.setState({ layer2Adjustments: updated });
            settings.set('layer2Adjustments', updated);
        });
    }

    wireLayer2Slider(l2Brightness,  l2BrightnessVal,  'brightness');
    wireLayer2Slider(l2Contrast,    l2ContrastVal,    'contrast');
    wireLayer2Slider(l2Gamma,       l2GammaVal,       'gamma', v => v.toFixed(1));
    wireLayer2Slider(l2BlackPoint,  l2BlackPointVal,  'blackPoint', v => v === 0 ? 'Off' : String(v));
    wireLayer2Slider(l2WhitePoint,  l2WhitePointVal,  'whitePoint', v => v === 255 ? 'Off' : String(v));

    effectSelect.addEventListener('change', () => {
        const value = effectSelect.value as PostEffect;
        app.setState({ postEffect: value }, true);
        settings.set('postEffect', value);
    });

    colorInputEl.addEventListener('input', () => {
        const hex = colorInputEl.value;
        if (/^#[0-9a-f]{6}$/i.test(hex)) {
            app.setState({ effectColor: hex });
            settings.set('effectColor', hex);
        }
    });

    app.on('statechange', (e) => {
        if ('postEffect' in e.detail.changes || 'effectColor' in e.detail.changes || 'layer2Adjustments' in e.detail.changes) {
            updateFromState();
        }
    });

    updateFromState();
}

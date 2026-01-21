import { app } from '../app.ts';
import type { Algorithm, AlgorithmCategory, DitherMode } from '../types/index.ts';
import { ALGORITHMS, getAlgorithmsByCategory, shouldUseWasm, isWasmLoaded } from '../algorithms/index.ts';
import { settings } from '../utils/settings.ts';

/**
 * Category display order
 */
const CATEGORY_ORDER: AlgorithmCategory[] = [
    'Error Diffusion',
    'Ordered',
    'Riemersma',
    'Pattern',
    'Dot Diffusion',
    'Dot Lippens',
    'Variable Error Diffusion',
    'Other'
];

/**
 * Initialize the sidebar algorithm selection
 */
export function initSidebar(container: HTMLElement): void {
    const algorithmListEl = container.querySelector<HTMLElement>('#algorithm-list');
    const searchInput = container.querySelector<HTMLInputElement>('#algorithm-search');
    const modeTabButtons = container.querySelectorAll<HTMLButtonElement>('.mode-tab');
    const optionsPanel = container.querySelector<HTMLElement>('#algorithm-options');

    if (!algorithmListEl) {
        console.error('Algorithm list container not found');
        return;
    }

    // Capture as non-null after verification
    const algorithmList = algorithmListEl;

    /**
     * Render a single algorithm item
     */
    function renderAlgorithmItem(algo: { id: string; name: string }, currentAlgorithm: string): string {
        const isSelected = algo.id === currentAlgorithm;
        const isFavorite = settings.isFavorite(algo.id);
        const showWasmBadge = settings.get('showWasmBadges') &&
                              isWasmLoaded() &&
                              shouldUseWasm(algo.id as Algorithm);
        return `
            <div class="algorithm-item${isSelected ? ' selected' : ''}" data-id="${algo.id}">
                <button class="favorite-btn${isFavorite ? ' active' : ''}"
                        data-favorite-id="${algo.id}"
                        title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    ${isFavorite ? '★' : '☆'}
                </button>
                <span class="algorithm-name">${algo.name}</span>
                ${showWasmBadge ? '<span class="wasm-badge" title="WASM accelerated - runs faster via WebAssembly">WASM</span>' : ''}
            </div>
        `;
    }

    /**
     * Render algorithm list for current mode
     */
    function renderAlgorithmList(filter = ''): void {
        console.time('renderAlgorithmList');
        const state = app.getState();
        const mode = state.mode;
        const currentAlgorithm = state.algorithm;

        const grouped = getAlgorithmsByCategory(mode);
        const favorites = settings.get('favoriteAlgorithms');

        let html = '';

        // Render favorites section if there are any
        if (favorites.length > 0 && !filter) {
            // Get favorite algorithms that match current mode
            const favoriteAlgos = favorites
                .map(id => ALGORITHMS[id as Algorithm])
                .filter(algo => algo && (mode === 'mono' ? !algo.id.endsWith('-color') : algo.id.endsWith('-color')));

            if (favoriteAlgos.length > 0) {
                html += `<div class="algorithm-category favorites-category">
                    <span class="category-star">★</span> Favorites
                </div>`;

                for (const algo of favoriteAlgos) {
                    html += renderAlgorithmItem(algo, currentAlgorithm);
                }
            }
        }

        // Render regular categories
        for (const category of CATEGORY_ORDER) {
            const algorithms = grouped.get(category);
            if (!algorithms || algorithms.length === 0) continue;

            // Filter algorithms by search
            const filtered = filter
                ? algorithms.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()))
                : algorithms;

            if (filtered.length === 0) continue;

            // Render category header
            html += `<div class="algorithm-category">${category}</div>`;

            // Render algorithms
            for (const algo of filtered) {
                html += renderAlgorithmItem(algo, currentAlgorithm);
            }
        }

        if (html === '') {
            html = '<div class="algorithm-empty">No algorithms found</div>';
        }

        algorithmList.innerHTML = html;

        // Attach favorite button listeners
        attachFavoriteListeners();
        console.timeEnd('renderAlgorithmList');
    }

    /**
     * Attach click listeners to favorite buttons
     */
    function attachFavoriteListeners(): void {
        algorithmList.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e: Event) => {
                e.stopPropagation(); // Don't trigger algorithm selection
                const id = (btn as HTMLElement).dataset.favoriteId;
                if (id) {
                    settings.toggleFavorite(id);
                    renderAlgorithmList(searchInput?.value || '');
                }
            });
        });
    }

    /**
     * Render algorithm options panel
     */
    function renderOptions(): void {
        if (!optionsPanel) return;

        const state = app.getState();
        const algorithm = state.algorithm;
        const options = state.options;

        // Different algorithms have different options
        let html = '';

        // Serpentine option (for error diffusion)
        if (algorithm.startsWith('floyd') || algorithm.startsWith('jarvis') ||
            algorithm.startsWith('stucki') || algorithm.startsWith('burkes') ||
            algorithm.startsWith('sierra') || algorithm.startsWith('atkinson') ||
            algorithm.startsWith('stevenson') || algorithm.startsWith('fake-floyd') ||
            algorithm.startsWith('shiau')) {
            const checked = options.serpentine !== false;
            html += `
                <div class="toggle-group">
                    <label class="toggle">
                        <input type="checkbox" id="opt-serpentine" ${checked ? 'checked' : ''}>
                        <span>Serpentine</span>
                    </label>
                </div>
            `;
        }

        // Jitter option (for ordered dithering)
        if (algorithm.startsWith('ordered')) {
            const jitter = (options as { jitter?: number }).jitter ?? 0;
            html += `
                <div class="slider-group">
                    <label>
                        <span class="slider-label">Jitter</span>
                        <span class="slider-value" id="opt-jitter-value">${jitter.toFixed(2)}</span>
                    </label>
                    <input type="range" id="opt-jitter" min="0" max="1" step="0.05" value="${jitter}">
                </div>
            `;
        }

        // Threshold options
        if (algorithm === 'threshold' || algorithm === 'threshold-color') {
            const threshold = (options as { threshold?: number }).threshold ?? 0.5;
            const noise = (options as { noise?: number }).noise ?? 0;
            html += `
                <div class="slider-group">
                    <label>
                        <span class="slider-label">Threshold</span>
                        <span class="slider-value" id="opt-threshold-value">${threshold.toFixed(2)}</span>
                    </label>
                    <input type="range" id="opt-threshold" min="0" max="1" step="0.01" value="${threshold}">
                </div>
                <div class="slider-group">
                    <label>
                        <span class="slider-label">Noise</span>
                        <span class="slider-value" id="opt-noise-value">${noise.toFixed(2)}</span>
                    </label>
                    <input type="range" id="opt-noise" min="0" max="1" step="0.01" value="${noise}">
                </div>
                <div class="toggle-group">
                    <label class="toggle">
                        <input type="checkbox" id="opt-auto-threshold">
                        <span>Auto Threshold</span>
                    </label>
                </div>
            `;
        }

        optionsPanel.innerHTML = html;

        // Attach option event listeners
        attachOptionListeners();
    }

    /**
     * Attach event listeners to option controls
     */
    function attachOptionListeners(): void {
        // Serpentine toggle
        const serpentineCheckbox = document.getElementById('opt-serpentine') as HTMLInputElement;
        if (serpentineCheckbox) {
            serpentineCheckbox.addEventListener('change', () => {
                app.setState({
                    options: { ...app.getState().options, serpentine: serpentineCheckbox.checked }
                });
            });
        }

        // Jitter slider
        const jitterSlider = document.getElementById('opt-jitter') as HTMLInputElement;
        if (jitterSlider) {
            jitterSlider.addEventListener('input', () => {
                const value = parseFloat(jitterSlider.value);
                const valueEl = document.getElementById('opt-jitter-value');
                if (valueEl) valueEl.textContent = value.toFixed(2);
                app.setState({
                    options: { ...app.getState().options, jitter: value }
                });
            });
        }

        // Threshold slider
        const thresholdSlider = document.getElementById('opt-threshold') as HTMLInputElement;
        if (thresholdSlider) {
            thresholdSlider.addEventListener('input', () => {
                const value = parseFloat(thresholdSlider.value);
                const valueEl = document.getElementById('opt-threshold-value');
                if (valueEl) valueEl.textContent = value.toFixed(2);
                app.setState({
                    options: { ...app.getState().options, threshold: value }
                });
            });
        }

        // Noise slider
        const noiseSlider = document.getElementById('opt-noise') as HTMLInputElement;
        if (noiseSlider) {
            noiseSlider.addEventListener('input', () => {
                const value = parseFloat(noiseSlider.value);
                const valueEl = document.getElementById('opt-noise-value');
                if (valueEl) valueEl.textContent = value.toFixed(2);
                app.setState({
                    options: { ...app.getState().options, noise: value }
                });
            });
        }

        // Auto threshold toggle
        const autoThreshold = document.getElementById('opt-auto-threshold') as HTMLInputElement;
        if (autoThreshold) {
            autoThreshold.addEventListener('change', () => {
                app.setState({
                    options: { ...app.getState().options, auto: autoThreshold.checked }
                });
            });
        }
    }

    // ========== Event Handlers ==========

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderAlgorithmList(searchInput.value);
        });
    }

    // Mode tabs
    modeTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode as DitherMode;
            if (mode) {
                app.setState({ mode });

                // Update tab styling
                modeTabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Set default algorithm for mode
                if (mode === 'mono') {
                    app.setState({ algorithm: 'floyd-steinberg' });
                } else {
                    app.setState({ algorithm: 'floyd-steinberg-color' });
                }
            }
        });
    });

    // Algorithm selection (event delegation)
    algorithmList.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.algorithm-item');

        if (item?.dataset.id) {
            const algorithmId = item.dataset.id as Algorithm;
            app.setState({ algorithm: algorithmId });
        }
    });

    // Keyboard navigation
    algorithmList.addEventListener('keydown', (e: KeyboardEvent) => {
        const items = algorithmList.querySelectorAll<HTMLElement>('.algorithm-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < items.length - 1) {
                    const nextItem = items[currentIndex + 1];
                    const algorithmId = nextItem.dataset.id as Algorithm;
                    if (algorithmId) {
                        app.setState({ algorithm: algorithmId });
                        nextItem.scrollIntoView({ block: 'nearest' });
                    }
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    const prevItem = items[currentIndex - 1];
                    const algorithmId = prevItem.dataset.id as Algorithm;
                    if (algorithmId) {
                        app.setState({ algorithm: algorithmId });
                        prevItem.scrollIntoView({ block: 'nearest' });
                    }
                }
                break;
        }
    });

    // React to state changes
    app.on('statechange', (e) => {
        if ('algorithm' in e.detail.changes || 'mode' in e.detail.changes) {
            renderAlgorithmList(searchInput?.value || '');
            renderOptions();
        }
    });

    // Re-render when WASM loads to show badges
    app.on('wasmloaded', () => {
        renderAlgorithmList(searchInput?.value || '');
    });

    // Initial render
    renderAlgorithmList();
    renderOptions();
}

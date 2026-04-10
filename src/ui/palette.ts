import { app } from '../app.ts';
import type { Palette, Color, BuiltInPalette, ColorMatchMethod } from '../types/index.ts';
import { getPalette } from '../data/palettes/presets.ts';
import { paletteStorage } from '../utils/palette-storage.ts';
import { showSavePaletteDialog } from './save-palette-dialog.ts';
import { showExportPaletteDialog } from './export-palette-dialog.ts';

const MIN_CUSTOM_COLORS = 2;
const MAX_CUSTOM_COLORS = 16;

/**
 * Initialize palette controls
 */
export function initPalette(container: HTMLElement): void {
    const paletteSource = container.querySelector<HTMLSelectElement>('#palette-source');
    const builtinPaletteSelect = container.querySelector<HTMLSelectElement>('#builtin-palette');
    const builtinPaletteGroup = container.querySelector<HTMLElement>('#builtin-palette-group');
    const paletteSwatches = container.querySelector<HTMLElement>('#palette-swatches');
    const colorMatchSelect = container.querySelector<HTMLSelectElement>('#color-match');
    const customPaletteEditor = container.querySelector<HTMLElement>('#custom-palette-editor');
    const addColorBtn = container.querySelector<HTMLButtonElement>('#add-color-btn');
    const removeColorBtn = container.querySelector<HTMLButtonElement>('#remove-color-btn');
    const colorCountSpan = container.querySelector<HTMLElement>('#color-count');

    // Saved palettes elements
    const savedPaletteSelect = container.querySelector<HTMLSelectElement>('#saved-palette-select');
    const savePaletteBtn = container.querySelector<HTMLButtonElement>('#save-palette-btn');
    const exportPaletteBtn = container.querySelector<HTMLButtonElement>('#export-palette-btn');
    const deleteSavedPaletteBtn = container.querySelector<HTMLButtonElement>('#delete-saved-palette-btn');

    let _currentSource = 'builtin';
    let _dragFromIndex: number = -1;
    let _dragDidMove: boolean = false;
    let _dragOverIndex: number = -1;

    /**
     * Render color swatches
     */
    function renderSwatches(): void {
        if (!paletteSwatches) return;

        const state = app.getState();
        const { colors } = state.palette;
        const isCustom = _currentSource === 'custom';

        const html = colors.map((color, index) => {
            const hex = colorToHex(color);
            if (isCustom) {
                return `<div class="color-swatch editable" data-index="${index}" draggable="true" style="background-color: ${hex};" title="${hex}">` +
                       `<button class="swatch-delete-btn" data-index="${index}" title="Remove color" aria-label="Remove color ${hex}" tabindex="-1">\u00d7</button>` +
                       `</div>`;
            }
            return `<div class="color-swatch" data-index="${index}" style="background-color: ${hex};" title="${hex}"></div>`;
        }).join('');

        paletteSwatches.innerHTML = html;

        if (colorCountSpan) colorCountSpan.textContent = String(colors.length);
        if (addColorBtn) addColorBtn.disabled = colors.length >= MAX_CUSTOM_COLORS;
        if (removeColorBtn) removeColorBtn.disabled = colors.length <= MIN_CUSTOM_COLORS;
    }

    /**
     * Show/hide UI elements based on palette source
     */
    function updateSourceUI(source: string): void {
        _currentSource = source;

        if (builtinPaletteGroup) {
            builtinPaletteGroup.style.display = source === 'builtin' ? '' : 'none';
        }

        if (customPaletteEditor) {
            customPaletteEditor.style.display = source === 'custom' ? '' : 'none';
        }
    }

    /**
     * Render saved palettes dropdown
     */
    function renderSavedPalettes(): void {
        if (!savedPaletteSelect) return;

        const palettes = paletteStorage.getAll();
        const currentValue = savedPaletteSelect.value;

        // Clear existing options except the first one
        while (savedPaletteSelect.options.length > 1) {
            savedPaletteSelect.remove(1);
        }

        // Add saved palettes
        for (const palette of palettes) {
            const option = document.createElement('option');
            option.value = palette.id;
            option.textContent = `${palette.name} (${palette.colors.length})`;
            savedPaletteSelect.appendChild(option);
        }

        // Restore selection if still valid
        if (currentValue && palettes.some(p => p.id === currentValue)) {
            savedPaletteSelect.value = currentValue;
        }

        // Update delete button visibility
        updateDeleteButtonVisibility();
    }

    /**
     * Update delete button visibility
     */
    function updateDeleteButtonVisibility(): void {
        if (deleteSavedPaletteBtn && savedPaletteSelect) {
            deleteSavedPaletteBtn.style.display = savedPaletteSelect.value ? '' : 'none';
        }
    }

    /**
     * Handle save palette button click
     */
    async function handleSavePalette(): Promise<void> {
        const state = app.getState();
        const currentPalette = state.palette;

        const result = await showSavePaletteDialog(currentPalette.name);

        if (result.confirmed && result.name) {
            paletteStorage.savePalette(result.name, currentPalette.colors, 'custom');
            renderSavedPalettes();
        }
    }

    /**
     * Handle export palette button click
     */
    async function handleExportPalette(): Promise<void> {
        const state = app.getState();
        const currentPalette = state.palette;

        await showExportPaletteDialog(currentPalette);
    }

    /**
     * Handle saved palette selection
     */
    function handleSelectSavedPalette(): void {
        if (!savedPaletteSelect) return;

        const id = savedPaletteSelect.value;
        if (!id) {
            updateDeleteButtonVisibility();
            return;
        }

        const savedPalette = paletteStorage.getById(id);
        if (savedPalette) {
            const palette: Palette = {
                name: savedPalette.name,
                colors: [...savedPalette.colors]
            };
            app.setState({ palette }, true);
        }

        updateDeleteButtonVisibility();
    }

    /**
     * Handle delete saved palette
     */
    function handleDeleteSavedPalette(): void {
        if (!savedPaletteSelect) return;

        const id = savedPaletteSelect.value;
        if (!id) return;

        const savedPalette = paletteStorage.getById(id);
        if (!savedPalette) return;

        if (confirm(`Delete palette "${savedPalette.name}"?`)) {
            paletteStorage.deletePalette(id);
            savedPaletteSelect.value = '';
            renderSavedPalettes();
        }
    }

    /**
     * Update UI from state
     */
    function updateFromState(): void {
        const state = app.getState();

        // Update color match select
        if (colorMatchSelect) {
            colorMatchSelect.value = state.colorMatch;
        }

        // Render swatches
        renderSwatches();
    }

    // ========== Event Handlers ==========

    // Palette source change
    if (paletteSource) {
        paletteSource.addEventListener('change', () => {
            const source = paletteSource.value;
            updateSourceUI(source);

            // Handle different sources
            switch (source) {
                case 'builtin':
                    // Load selected builtin palette
                    if (builtinPaletteSelect) {
                        const paletteId = builtinPaletteSelect.value as BuiltInPalette;
                        const palette = getPalette(paletteId);
                        if (palette) {
                            app.setState({ palette });
                        }
                    }
                    break;
                case 'custom':
                    // Start with current palette as base for custom editing
                    // or use saved custom palette
                    const state = app.getState();
                    if (state.customPalette) {
                        app.setState({ palette: state.customPalette });
                    } else {
                        // Use current palette, but save as custom
                        app.setState({
                            customPalette: { ...state.palette, name: 'Custom' }
                        });
                    }
                    break;
                case 'generate':
                    // Generate palette from current image
                    generatePaletteFromImage();
                    // Reset to builtin after generation since it's a one-time action
                    if (paletteSource) {
                        paletteSource.value = 'builtin';
                        updateSourceUI('builtin');
                    }
                    break;
                case 'load':
                    // Open file picker for palette file
                    loadPaletteFromFile();
                    // Reset to builtin after loading
                    if (paletteSource) {
                        paletteSource.value = 'builtin';
                        updateSourceUI('builtin');
                    }
                    break;
            }
        });
    }

    // Builtin palette change
    if (builtinPaletteSelect) {
        builtinPaletteSelect.addEventListener('change', () => {
            const paletteId = builtinPaletteSelect.value as BuiltInPalette;
            const palette = getPalette(paletteId);
            if (palette) {
                app.setState({ palette }, true); // Save history for undo
            }
        });
    }

    // Color match method change
    if (colorMatchSelect) {
        colorMatchSelect.addEventListener('change', () => {
            const method = colorMatchSelect.value as ColorMatchMethod;
            app.setState({ colorMatch: method }, true); // Save history for undo
        });
    }

    // Swatch click (for editing colors or deleting)
    if (paletteSwatches) {
        paletteSwatches.addEventListener('click', (e: MouseEvent) => {
            // Suppress click that fires after a completed drag
            if (_dragDidMove) {
                _dragDidMove = false;
                return;
            }

            const target = e.target as HTMLElement;

            // Delete button
            if (target.classList.contains('swatch-delete-btn')) {
                e.stopPropagation();
                if (_currentSource !== 'custom') return;
                const index = parseInt(target.dataset.index || '-1', 10);
                if (index < 0) return;
                const state = app.getState();
                const colors = state.palette.colors;
                if (colors.length <= MIN_CUSTOM_COLORS) return;
                const newColors = [...colors];
                newColors.splice(index, 1);
                const newPalette: Palette = { name: 'Custom', colors: newColors };
                app.setState({ palette: newPalette, customPalette: newPalette }, true);
                return;
            }

            // Color picker open
            const swatch = target.closest<HTMLElement>('.color-swatch');
            if (swatch && _currentSource === 'custom') {
                const index = parseInt(swatch.dataset.index || '0', 10);
                openColorPicker(index, swatch);
            }
        });

        // Drag: record source index
        paletteSwatches.addEventListener('dragstart', (e: DragEvent) => {
            if (_currentSource !== 'custom') { e.preventDefault(); return; }
            const swatch = (e.target as HTMLElement).closest<HTMLElement>('.color-swatch');
            if (!swatch) { e.preventDefault(); return; }
            _dragFromIndex = parseInt(swatch.dataset.index || '-1', 10);
            if (_dragFromIndex < 0) { e.preventDefault(); return; }
            _dragDidMove = true;
            e.dataTransfer!.setData('text/plain', String(_dragFromIndex)); // required for Firefox
            e.dataTransfer!.effectAllowed = 'move';
            // Apply dragging style after a tick so drag ghost captures full opacity
            requestAnimationFrame(() => swatch.classList.add('swatch-dragging'));
        });

        // Drag: provide drop target feedback
        paletteSwatches.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            if (_currentSource !== 'custom' || _dragFromIndex < 0) return;
            e.dataTransfer!.dropEffect = 'move';
            const swatch = (e.target as HTMLElement).closest<HTMLElement>('.color-swatch');
            if (!swatch) return;
            const overIndex = parseInt(swatch.dataset.index || '-1', 10);
            if (overIndex < 0 || overIndex === _dragOverIndex) return;
            paletteSwatches.querySelectorAll<HTMLElement>('.drag-over').forEach(el => el.classList.remove('drag-over'));
            _dragOverIndex = overIndex;
            swatch.classList.add('drag-over');
        });

        // Drag: clear drop indicator only when truly leaving the container
        paletteSwatches.addEventListener('dragleave', (e: DragEvent) => {
            if (!paletteSwatches.contains(e.relatedTarget as Node | null)) {
                paletteSwatches.querySelectorAll<HTMLElement>('.drag-over').forEach(el => el.classList.remove('drag-over'));
                _dragOverIndex = -1;
            }
        });

        // Drag: perform reorder on drop
        paletteSwatches.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            // Clean up visual state unconditionally
            paletteSwatches.querySelectorAll<HTMLElement>('.drag-over, .swatch-dragging')
                .forEach(el => { el.classList.remove('drag-over'); el.classList.remove('swatch-dragging'); });
            _dragOverIndex = -1;

            if (_currentSource !== 'custom' || _dragFromIndex < 0) { _dragFromIndex = -1; return; }

            const swatch = (e.target as HTMLElement).closest<HTMLElement>('.color-swatch');
            const toIndex = swatch ? parseInt(swatch.dataset.index || '-1', 10) : -1;

            const from = _dragFromIndex;
            _dragFromIndex = -1;

            if (toIndex < 0 || toIndex === from) return;

            const state = app.getState();
            const newColors = reorderColors(state.palette.colors, from, toIndex);
            const newPalette: Palette = { name: 'Custom', colors: newColors };
            app.setState({ palette: newPalette, customPalette: newPalette }, true);
        });

        // Drag: always clean up (fires even if drop was outside the container)
        paletteSwatches.addEventListener('dragend', () => {
            paletteSwatches.querySelectorAll<HTMLElement>('.drag-over, .swatch-dragging')
                .forEach(el => { el.classList.remove('drag-over'); el.classList.remove('swatch-dragging'); });
            _dragOverIndex = -1;
            _dragFromIndex = -1;
            // _dragDidMove intentionally NOT cleared here — the click event fires after dragend
            // and the click handler clears it, suppressing spurious color picker open after drag.
        });
    }

    // Add color button
    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => {
            const state = app.getState();
            const colors = state.palette.colors;

            if (colors.length >= MAX_CUSTOM_COLORS) return;

            // Add a new color (gray by default)
            const newColors = [...colors, { r: 128, g: 128, b: 128 }];
            const newPalette: Palette = {
                name: 'Custom',
                colors: newColors
            };

            app.setState({
                palette: newPalette,
                customPalette: newPalette
            });
        });
    }

    // Remove color button
    if (removeColorBtn) {
        removeColorBtn.addEventListener('click', () => {
            const state = app.getState();
            const colors = state.palette.colors;

            if (colors.length <= MIN_CUSTOM_COLORS) return;

            // Remove the last color
            const newColors = colors.slice(0, -1);
            const newPalette: Palette = {
                name: 'Custom',
                colors: newColors
            };

            app.setState({
                palette: newPalette,
                customPalette: newPalette
            });
        });
    }

    // Save palette button
    if (savePaletteBtn) {
        savePaletteBtn.addEventListener('click', handleSavePalette);
    }

    // Export palette button
    if (exportPaletteBtn) {
        exportPaletteBtn.addEventListener('click', handleExportPalette);
    }

    // Saved palette select
    if (savedPaletteSelect) {
        savedPaletteSelect.addEventListener('change', handleSelectSavedPalette);
    }

    // Delete saved palette button
    if (deleteSavedPaletteBtn) {
        deleteSavedPaletteBtn.addEventListener('click', handleDeleteSavedPalette);
    }

    // Listen for palette storage changes
    paletteStorage.onChange(() => {
        renderSavedPalettes();
    });

    // Listen for state changes
    app.on('statechange', (e) => {
        if ('palette' in e.detail.changes || 'colorMatch' in e.detail.changes) {
            updateFromState();
        }
    });

    // Initial update
    updateFromState();
    renderSavedPalettes();
}

/**
 * Reorder colors array by moving the element at `from` to `to` (shift-insert semantics).
 * Returns the original array unchanged when from === to.
 */
function reorderColors(colors: Color[], from: number, to: number): Color[] {
    if (from === to) return colors;
    const newColors = [...colors];
    const [removed] = newColors.splice(from, 1);
    newColors.splice(to, 0, removed);
    return newColors;
}

/**
 * Convert Color to hex string
 */
function colorToHex(color: Color): string {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Parse hex string to Color
 */
function hexToColor(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return { r: 0, g: 0, b: 0 };
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

/**
 * Open color picker for a swatch using Coloris
 */
function openColorPicker(index: number, clickedElement?: HTMLElement): void {
    const state = app.getState();
    const color = state.palette.colors[index];
    if (!color) return;

    const input = document.getElementById('coloris-input') as HTMLInputElement;
    if (!input) return;

    // Position the input near the clicked swatch so Coloris appears in the right place
    if (clickedElement) {
        const rect = clickedElement.getBoundingClientRect();
        input.style.position = 'fixed';
        input.style.top = `${rect.bottom + 5}px`;
        input.style.left = `${rect.left}px`;
    }

    input.value = colorToHex(color);
    input.dataset.colorIndex = String(index);

    // Bind change handler
    input.oninput = () => {
        const idx = parseInt(input.dataset.colorIndex || '0', 10);
        const newColor = hexToColor(input.value);
        const currentState = app.getState();
        const newColors = [...currentState.palette.colors];
        newColors[idx] = newColor;

        const newPalette: Palette = {
            name: 'Custom',
            colors: newColors
        };

        app.setState({
            palette: newPalette,
            customPalette: newPalette
        });
    };

    // Trigger Coloris to open
    input.click();
}

/**
 * Generate a palette from the current source image using median cut quantization
 */
function generatePaletteFromImage(): void {
    const state = app.getState();
    if (!state.sourceImage) {
        alert('Please load an image first');
        return;
    }

    const numColors = 16; // Generate 16 colors
    const colors = extractColorsFromImage(state.sourceImage, numColors);

    const palette: Palette = {
        name: 'Generated',
        colors
    };

    app.setState({ palette });
}

/**
 * Extract dominant colors from an image using simple k-means clustering
 */
function extractColorsFromImage(imageData: ImageData, numColors: number): Color[] {
    const { data, width, height } = imageData;
    const pixels: Color[] = [];

    // Sample pixels (every Nth pixel for performance)
    const sampleRate = Math.max(1, Math.floor((width * height) / 10000));

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
        pixels.push({
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        });
    }

    // Simple median cut quantization
    return medianCut(pixels, numColors);
}

/**
 * Median cut color quantization
 */
function medianCut(pixels: Color[], numColors: number): Color[] {
    if (pixels.length === 0) {
        return [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }];
    }

    // Start with all pixels in one bucket
    let buckets: Color[][] = [pixels];

    // Split buckets until we have enough colors
    while (buckets.length < numColors) {
        // Find bucket with largest color range
        let maxRange = 0;
        let bucketToSplit = 0;
        let splitChannel: 'r' | 'g' | 'b' = 'r';

        for (let i = 0; i < buckets.length; i++) {
            const bucket = buckets[i];
            if (bucket.length < 2) continue;

            // Find range for each channel
            for (const channel of ['r', 'g', 'b'] as const) {
                const values = bucket.map(p => p[channel]);
                const range = Math.max(...values) - Math.min(...values);
                if (range > maxRange) {
                    maxRange = range;
                    bucketToSplit = i;
                    splitChannel = channel;
                }
            }
        }

        // If we can't split anymore, break
        if (maxRange === 0) break;

        // Split the bucket
        const bucket = buckets[bucketToSplit];
        bucket.sort((a, b) => a[splitChannel] - b[splitChannel]);

        const mid = Math.floor(bucket.length / 2);
        const bucket1 = bucket.slice(0, mid);
        const bucket2 = bucket.slice(mid);

        buckets.splice(bucketToSplit, 1, bucket1, bucket2);
    }

    // Get average color from each bucket
    const colors: Color[] = buckets.map(bucket => {
        if (bucket.length === 0) return { r: 0, g: 0, b: 0 };

        const sum = bucket.reduce(
            (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
            { r: 0, g: 0, b: 0 }
        );

        return {
            r: Math.round(sum.r / bucket.length),
            g: Math.round(sum.g / bucket.length),
            b: Math.round(sum.b / bucket.length)
        };
    });

    // Sort by luminance
    colors.sort((a, b) => {
        const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
        const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
        return lumA - lumB;
    });

    return colors;
}

/**
 * Load palette from a file (.pal, .gpl, .hex, .txt)
 */
function loadPaletteFromFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pal,.gpl,.hex,.txt,.json';

    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const colors = parsePaletteFile(text, file.name);

            if (colors.length < 2) {
                alert('Palette must have at least 2 colors');
                return;
            }

            const palette: Palette = {
                name: file.name.replace(/\.[^.]+$/, ''),
                colors: colors.slice(0, 256) // Max 256 colors
            };

            app.setState({ palette });
        } catch (error) {
            console.error('Failed to load palette:', error);
            alert('Failed to load palette file');
        }
    });

    input.click();
}

/**
 * Parse palette file contents
 */
function parsePaletteFile(content: string, _filename: string): Color[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    const colors: Color[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and headers
        if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('GIMP')) {
            continue;
        }

        // Try to parse as hex color
        const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
        if (hexMatch) {
            colors.push(hexToColor(hexMatch[1]));
            continue;
        }

        // Try to parse as RGB values (space or comma separated)
        const rgbMatch = trimmed.match(/^(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/);
        if (rgbMatch) {
            const r = Math.min(255, parseInt(rgbMatch[1], 10));
            const g = Math.min(255, parseInt(rgbMatch[2], 10));
            const b = Math.min(255, parseInt(rgbMatch[3], 10));
            colors.push({ r, g, b });
            continue;
        }
    }

    return colors;
}

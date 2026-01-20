import { app } from '../app.ts';
import type { Palette, Color, BuiltInPalette, ColorMatchMethod } from '../types/index.ts';
import { BUILTIN_PALETTES, getPalette } from '../data/palettes/presets.ts';

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

    let currentSource = 'builtin';

    /**
     * Render color swatches
     */
    function renderSwatches(): void {
        if (!paletteSwatches) return;

        const state = app.getState();
        const { colors } = state.palette;

        const html = colors.map((color, index) => {
            const hex = colorToHex(color);
            return `<div class="color-swatch editable" data-index="${index}" style="background-color: ${hex};" title="${hex}"></div>`;
        }).join('');

        paletteSwatches.innerHTML = html;

        // Update color count
        if (colorCountSpan) {
            colorCountSpan.textContent = String(colors.length);
        }

        // Update button states
        if (addColorBtn) {
            addColorBtn.disabled = colors.length >= MAX_CUSTOM_COLORS;
        }
        if (removeColorBtn) {
            removeColorBtn.disabled = colors.length <= MIN_CUSTOM_COLORS;
        }
    }

    /**
     * Show/hide UI elements based on palette source
     */
    function updateSourceUI(source: string): void {
        currentSource = source;

        if (builtinPaletteGroup) {
            builtinPaletteGroup.style.display = source === 'builtin' ? '' : 'none';
        }

        if (customPaletteEditor) {
            customPaletteEditor.style.display = source === 'custom' ? '' : 'none';
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
                app.setState({ palette });
            }
        });
    }

    // Color match method change
    if (colorMatchSelect) {
        colorMatchSelect.addEventListener('change', () => {
            const method = colorMatchSelect.value as ColorMatchMethod;
            app.setState({ colorMatch: method });
        });
    }

    // Swatch click (for editing colors)
    if (paletteSwatches) {
        paletteSwatches.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('color-swatch')) {
                const index = parseInt(target.dataset.index || '0', 10);
                openColorPicker(index, target);
            }
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

    // Listen for state changes
    app.on('statechange', (e) => {
        if ('palette' in e.detail.changes || 'colorMatch' in e.detail.changes) {
            updateFromState();
        }
    });

    // Initial update
    updateFromState();
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
function parsePaletteFile(content: string, filename: string): Color[] {
    const ext = filename.split('.').pop()?.toLowerCase();
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

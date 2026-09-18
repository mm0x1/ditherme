/**
 * Palette export utilities - export palettes to various formats
 */

import type { Color, Palette } from '../types/palette.ts';
import { isElectron, saveFile as saveFileWithDialog } from './electron-bridge.ts';

export type ExportFormat = 'json' | 'gpl' | 'hex' | 'pal';

/**
 * JSON export format structure
 */
interface JSONPaletteExport {
    name: string;
    version: string;
    colors: Array<{ r: number; g: number; b: number }>;
}

/**
 * Convert Color to hex string
 */
function colorToHex(color: Color): string {
    const r = color.r.toString(16).padStart(2, '0').toUpperCase();
    const g = color.g.toString(16).padStart(2, '0').toUpperCase();
    const b = color.b.toString(16).padStart(2, '0').toUpperCase();
    return `#${r}${g}${b}`;
}

/**
 * Export palette to JSON format
 */
function exportToJSON(palette: Palette): string {
    const data: JSONPaletteExport = {
        name: palette.name,
        version: '1.0',
        colors: palette.colors.map(c => ({ r: c.r, g: c.g, b: c.b }))
    };
    return JSON.stringify(data, null, 2);
}

/**
 * Export palette to GIMP GPL format
 */
function exportToGPL(palette: Palette): string {
    const lines = [
        'GIMP Palette',
        `Name: ${palette.name}`,
        `Columns: ${Math.min(16, palette.colors.length)}`,
        '#'
    ];

    for (const color of palette.colors) {
        // Right-pad RGB values to 3 characters each
        const r = String(color.r).padStart(3, ' ');
        const g = String(color.g).padStart(3, ' ');
        const b = String(color.b).padStart(3, ' ');
        lines.push(`${r} ${g} ${b}\t${colorToHex(color)}`);
    }

    return lines.join('\n');
}

/**
 * Export palette to HEX format (one hex color per line)
 */
function exportToHEX(palette: Palette): string {
    return palette.colors.map(color => colorToHex(color)).join('\n');
}

/**
 * Export palette to JASC-PAL format
 */
function exportToPAL(palette: Palette): string {
    const lines = [
        'JASC-PAL',
        '0100',
        String(palette.colors.length)
    ];

    for (const color of palette.colors) {
        lines.push(`${color.r} ${color.g} ${color.b}`);
    }

    return lines.join('\n');
}

/**
 * Export palette to specified format
 */
export function exportPalette(palette: Palette, format: ExportFormat): string {
    switch (format) {
        case 'json':
            return exportToJSON(palette);
        case 'gpl':
            return exportToGPL(palette);
        case 'hex':
            return exportToHEX(palette);
        case 'pal':
            return exportToPAL(palette);
        default:
            throw new Error(`Unknown export format: ${format}`);
    }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
    switch (format) {
        case 'json':
            return 'json';
        case 'gpl':
            return 'gpl';
        case 'hex':
            return 'hex';
        case 'pal':
            return 'pal';
        default:
            return 'txt';
    }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
    switch (format) {
        case 'json':
            return 'application/json';
        default:
            return 'text/plain';
    }
}

/**
 * Download palette as file
 */
export async function downloadPalette(palette: Palette, format: ExportFormat): Promise<boolean> {
    const content = exportPalette(palette, format);
    const ext = getFileExtension(format);
    const mimeType = getMimeType(format);

    // Sanitize filename
    const safeName = palette.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${safeName}.${ext}`;

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });

    if (isElectron()) {
        return saveFileWithDialog(blob, filename, {
            filters: [{ name: `${format.toUpperCase()} Palette`, extensions: [ext] }]
        });
    }

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    return true;
}

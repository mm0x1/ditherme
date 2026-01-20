import type { Palette, Color, BuiltInPalette } from '../../types/index.ts';

/**
 * Built-in palette definitions
 */
export const BUILTIN_PALETTES: Record<BuiltInPalette, Palette> = {
    'mono': {
        name: 'Mono',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 255, b: 255 }
        ]
    },

    'grayscale4': {
        name: 'Grayscale 4',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 85, g: 85, b: 85 },
            { r: 170, g: 170, b: 170 },
            { r: 255, g: 255, b: 255 }
        ]
    },

    'grayscale8': {
        name: 'Grayscale 8',
        colors: Array.from({ length: 8 }, (_, i) => {
            const v = Math.round(i * 255 / 7);
            return { r: v, g: v, b: v };
        })
    },

    'grayscale16': {
        name: 'Grayscale 16',
        colors: Array.from({ length: 16 }, (_, i) => {
            const v = Math.round(i * 255 / 15);
            return { r: v, g: v, b: v };
        })
    },

    'cga': {
        name: 'CGA',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 85, g: 255, b: 255 },   // Cyan
            { r: 255, g: 85, b: 255 },   // Magenta
            { r: 255, g: 255, b: 255 }   // White
        ]
    },

    'ega': {
        name: 'EGA',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 0, g: 0, b: 170 },      // Blue
            { r: 0, g: 170, b: 0 },      // Green
            { r: 0, g: 170, b: 170 },    // Cyan
            { r: 170, g: 0, b: 0 },      // Red
            { r: 170, g: 0, b: 170 },    // Magenta
            { r: 170, g: 85, b: 0 },     // Brown
            { r: 170, g: 170, b: 170 },  // Light Gray
            { r: 85, g: 85, b: 85 },     // Dark Gray
            { r: 85, g: 85, b: 255 },    // Light Blue
            { r: 85, g: 255, b: 85 },    // Light Green
            { r: 85, g: 255, b: 255 },   // Light Cyan
            { r: 255, g: 85, b: 85 },    // Light Red
            { r: 255, g: 85, b: 255 },   // Light Magenta
            { r: 255, g: 255, b: 85 },   // Yellow
            { r: 255, g: 255, b: 255 }   // White
        ]
    },

    'mac16': {
        name: 'Mac 16',
        colors: [
            { r: 255, g: 255, b: 255 },  // White
            { r: 255, g: 255, b: 0 },    // Yellow
            { r: 255, g: 102, b: 0 },    // Orange
            { r: 221, g: 0, b: 0 },      // Red
            { r: 255, g: 0, b: 153 },    // Magenta
            { r: 51, g: 0, b: 153 },     // Purple
            { r: 0, g: 0, b: 204 },      // Blue
            { r: 0, g: 153, b: 255 },    // Cyan
            { r: 0, g: 170, b: 0 },      // Green
            { r: 0, g: 102, b: 0 },      // Dark Green
            { r: 102, g: 51, b: 0 },     // Brown
            { r: 153, g: 102, b: 51 },   // Tan
            { r: 187, g: 187, b: 187 },  // Light Gray
            { r: 136, g: 136, b: 136 },  // Medium Gray
            { r: 68, g: 68, b: 68 },     // Dark Gray
            { r: 0, g: 0, b: 0 }         // Black
        ]
    },

    'windows16': {
        name: 'Windows 16',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 128, g: 0, b: 0 },      // Maroon
            { r: 0, g: 128, b: 0 },      // Green
            { r: 128, g: 128, b: 0 },    // Olive
            { r: 0, g: 0, b: 128 },      // Navy
            { r: 128, g: 0, b: 128 },    // Purple
            { r: 0, g: 128, b: 128 },    // Teal
            { r: 192, g: 192, b: 192 },  // Silver
            { r: 128, g: 128, b: 128 },  // Gray
            { r: 255, g: 0, b: 0 },      // Red
            { r: 0, g: 255, b: 0 },      // Lime
            { r: 255, g: 255, b: 0 },    // Yellow
            { r: 0, g: 0, b: 255 },      // Blue
            { r: 255, g: 0, b: 255 },    // Fuchsia
            { r: 0, g: 255, b: 255 },    // Aqua
            { r: 255, g: 255, b: 255 }   // White
        ]
    },

    'pico8': {
        name: 'Pico-8',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 29, g: 43, b: 83 },     // Dark Blue
            { r: 126, g: 37, b: 83 },    // Dark Purple
            { r: 0, g: 135, b: 81 },     // Dark Green
            { r: 171, g: 82, b: 54 },    // Brown
            { r: 95, g: 87, b: 79 },     // Dark Gray
            { r: 194, g: 195, b: 199 },  // Light Gray
            { r: 255, g: 241, b: 232 },  // White
            { r: 255, g: 0, b: 77 },     // Red
            { r: 255, g: 163, b: 0 },    // Orange
            { r: 255, g: 236, b: 39 },   // Yellow
            { r: 0, g: 228, b: 54 },     // Green
            { r: 41, g: 173, b: 255 },   // Blue
            { r: 131, g: 118, b: 156 },  // Lavender
            { r: 255, g: 119, b: 168 },  // Pink
            { r: 255, g: 204, b: 170 }   // Peach
        ]
    },

    'c64': {
        name: 'Commodore 64',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 255, g: 255, b: 255 },  // White
            { r: 136, g: 0, b: 0 },      // Red
            { r: 170, g: 255, b: 238 },  // Cyan
            { r: 204, g: 68, b: 204 },   // Violet
            { r: 0, g: 204, b: 85 },     // Green
            { r: 0, g: 0, b: 170 },      // Blue
            { r: 238, g: 238, b: 119 },  // Yellow
            { r: 221, g: 136, b: 85 },   // Orange
            { r: 102, g: 68, b: 0 },     // Brown
            { r: 255, g: 119, b: 119 },  // Light Red
            { r: 51, g: 51, b: 51 },     // Dark Gray
            { r: 119, g: 119, b: 119 },  // Medium Gray
            { r: 170, g: 255, b: 102 },  // Light Green
            { r: 0, g: 136, b: 255 },    // Light Blue
            { r: 187, g: 187, b: 187 }   // Light Gray
        ]
    },

    'nes': {
        name: 'NES',
        colors: [
            { r: 124, g: 124, b: 124 }, { r: 0, g: 0, b: 252 },
            { r: 0, g: 0, b: 188 }, { r: 68, g: 40, b: 188 },
            { r: 148, g: 0, b: 132 }, { r: 168, g: 0, b: 32 },
            { r: 168, g: 16, b: 0 }, { r: 136, g: 20, b: 0 },
            { r: 80, g: 48, b: 0 }, { r: 0, g: 120, b: 0 },
            { r: 0, g: 104, b: 0 }, { r: 0, g: 88, b: 0 },
            { r: 0, g: 64, b: 88 }, { r: 0, g: 0, b: 0 },
            { r: 188, g: 188, b: 188 }, { r: 0, g: 120, b: 248 },
            { r: 0, g: 88, b: 248 }, { r: 104, g: 68, b: 252 },
            { r: 216, g: 0, b: 204 }, { r: 228, g: 0, b: 88 },
            { r: 248, g: 56, b: 0 }, { r: 228, g: 92, b: 16 },
            { r: 172, g: 124, b: 0 }, { r: 0, g: 184, b: 0 },
            { r: 0, g: 168, b: 0 }, { r: 0, g: 168, b: 68 },
            { r: 0, g: 136, b: 136 }, { r: 248, g: 248, b: 248 },
            { r: 60, g: 188, b: 252 }, { r: 104, g: 136, b: 252 },
            { r: 152, g: 120, b: 248 }, { r: 248, g: 120, b: 248 },
            { r: 248, g: 88, b: 152 }, { r: 248, g: 120, b: 88 },
            { r: 252, g: 160, b: 68 }, { r: 248, g: 184, b: 0 },
            { r: 184, g: 248, b: 24 }, { r: 88, g: 216, b: 84 },
            { r: 88, g: 248, b: 152 }, { r: 0, g: 232, b: 216 },
            { r: 120, g: 120, b: 120 }, { r: 252, g: 252, b: 252 },
            { r: 164, g: 228, b: 252 }, { r: 184, g: 184, b: 248 },
            { r: 216, g: 184, b: 248 }, { r: 248, g: 184, b: 248 },
            { r: 248, g: 164, b: 192 }, { r: 240, g: 208, b: 176 },
            { r: 252, g: 224, b: 168 }, { r: 248, g: 216, b: 120 },
            { r: 216, g: 248, b: 120 }, { r: 184, g: 248, b: 184 },
            { r: 184, g: 248, b: 216 }, { r: 0, g: 252, b: 252 }
        ]
    },

    'gameboy': {
        name: 'Game Boy',
        colors: [
            { r: 15, g: 56, b: 15 },     // Darkest
            { r: 48, g: 98, b: 48 },
            { r: 139, g: 172, b: 15 },
            { r: 155, g: 188, b: 15 }    // Lightest
        ]
    },

    'gameboy-pocket': {
        name: 'Game Boy Pocket',
        colors: [
            { r: 0, g: 0, b: 0 },        // Black
            { r: 85, g: 85, b: 85 },     // Dark Gray
            { r: 170, g: 170, b: 170 },  // Light Gray
            { r: 255, g: 255, b: 255 }   // White
        ]
    },

    'websafe': {
        name: 'Web Safe 216',
        colors: generateWebSafePalette()
    }
};

/**
 * Generate web-safe 216 color palette
 */
function generateWebSafePalette(): Color[] {
    const colors: Color[] = [];
    const values = [0, 51, 102, 153, 204, 255];

    for (const r of values) {
        for (const g of values) {
            for (const b of values) {
                colors.push({ r, g, b });
            }
        }
    }

    return colors;
}

/**
 * Get palette by ID
 */
export function getPalette(id: BuiltInPalette): Palette | undefined {
    return BUILTIN_PALETTES[id];
}

/**
 * Get list of available palette IDs
 */
export function getAvailablePalettes(): BuiltInPalette[] {
    return Object.keys(BUILTIN_PALETTES) as BuiltInPalette[];
}

/**
 * Create a copy of a palette
 */
export function clonePalette(palette: Palette): Palette {
    return {
        name: palette.name,
        colors: palette.colors.map(c => ({ ...c }))
    };
}

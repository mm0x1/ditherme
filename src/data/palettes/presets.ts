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
    },

    'zx-spectrum': {
        name: 'ZX Spectrum',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 0, g: 0, b: 215 },
            { r: 215, g: 0, b: 0 },
            { r: 215, g: 0, b: 215 },
            { r: 0, g: 215, b: 0 },
            { r: 0, g: 215, b: 215 },
            { r: 215, g: 215, b: 0 },
            { r: 255, g: 255, b: 255 }
        ]
    },

    'apple-ii': {
        name: 'Apple II',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 114, g: 38, b: 64 },
            { r: 64, g: 51, b: 127 },
            { r: 228, g: 52, b: 254 },
            { r: 14, g: 89, b: 64 },
            { r: 27, g: 154, b: 254 },
            { r: 184, g: 203, b: 191 },
            { r: 255, g: 255, b: 255 }
        ]
    },

    'dawnbringer-8': {
        name: 'DawnBringer 8',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 85, g: 65, b: 95 },
            { r: 100, g: 105, b: 100 },
            { r: 215, g: 115, b: 85 },
            { r: 80, g: 140, b: 215 },
            { r: 100, g: 185, b: 100 },
            { r: 230, g: 200, b: 110 },
            { r: 255, g: 255, b: 255 }
        ]
    },

    'sunset': {
        name: 'Sunset',
        colors: [
            { r: 38, g: 24, b: 77 },
            { r: 122, g: 36, b: 86 },
            { r: 219, g: 70, b: 81 },
            { r: 244, g: 138, b: 68 },
            { r: 250, g: 224, b: 119 }
        ]
    },

    'ocean': {
        name: 'Ocean',
        colors: [
            { r: 9, g: 26, b: 51 },
            { r: 22, g: 72, b: 112 },
            { r: 32, g: 132, b: 158 },
            { r: 86, g: 195, b: 197 },
            { r: 219, g: 242, b: 234 }
        ]
    },

    'forest': {
        name: 'Forest',
        colors: [
            { r: 27, g: 38, b: 28 },
            { r: 51, g: 75, b: 47 },
            { r: 99, g: 117, b: 56 },
            { r: 161, g: 152, b: 99 },
            { r: 224, g: 209, b: 167 }
        ]
    },

    'pastel': {
        name: 'Pastel',
        colors: [
            { r: 255, g: 200, b: 221 },
            { r: 255, g: 175, b: 204 },
            { r: 189, g: 224, b: 254 },
            { r: 162, g: 210, b: 255 },
            { r: 207, g: 186, b: 240 }
        ]
    },

    'neon': {
        name: 'Neon',
        colors: [
            { r: 13, g: 13, b: 26 },
            { r: 255, g: 0, b: 110 },
            { r: 131, g: 56, b: 236 },
            { r: 58, g: 134, b: 255 },
            { r: 255, g: 190, b: 11 }
        ]
    },

    'vaporwave': {
        name: 'Vaporwave',
        colors: [
            { r: 26, g: 13, b: 51 },
            { r: 255, g: 113, b: 206 },
            { r: 184, g: 142, b: 245 },
            { r: 1, g: 205, b: 254 },
            { r: 5, g: 255, b: 161 },
            { r: 255, g: 251, b: 150 }
        ]
    },

    'autumn': {
        name: 'Autumn',
        colors: [
            { r: 50, g: 24, b: 13 },
            { r: 138, g: 50, b: 24 },
            { r: 207, g: 110, b: 36 },
            { r: 230, g: 168, b: 60 },
            { r: 245, g: 222, b: 179 }
        ]
    },

    'arctic': {
        name: 'Arctic',
        colors: [
            { r: 31, g: 50, b: 73 },
            { r: 91, g: 127, b: 164 },
            { r: 173, g: 207, b: 222 },
            { r: 235, g: 246, b: 247 }
        ]
    },

    'lava': {
        name: 'Lava',
        colors: [
            { r: 18, g: 6, b: 6 },
            { r: 92, g: 13, b: 13 },
            { r: 207, g: 50, b: 17 },
            { r: 255, g: 138, b: 24 },
            { r: 255, g: 217, b: 102 }
        ]
    },

    'terminal-green': {
        name: 'Terminal Green',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 0, g: 53, b: 22 },
            { r: 0, g: 130, b: 51 },
            { r: 0, g: 209, b: 90 },
            { r: 130, g: 255, b: 152 }
        ]
    },

    'terminal-amber': {
        name: 'Terminal Amber',
        colors: [
            { r: 16, g: 8, b: 0 },
            { r: 64, g: 32, b: 0 },
            { r: 168, g: 89, b: 0 },
            { r: 255, g: 176, b: 0 },
            { r: 255, g: 222, b: 145 }
        ]
    },

    'cyberpunk': {
        name: 'Cyberpunk',
        colors: [
            { r: 10, g: 8, b: 30 },
            { r: 55, g: 0, b: 110 },
            { r: 255, g: 0, b: 122 },
            { r: 0, g: 245, b: 255 },
            { r: 245, g: 213, b: 71 }
        ]
    },

    'sepia': {
        name: 'Sepia',
        colors: [
            { r: 36, g: 24, b: 16 },
            { r: 95, g: 64, b: 41 },
            { r: 168, g: 122, b: 80 },
            { r: 222, g: 184, b: 135 },
            { r: 245, g: 230, b: 200 }
        ]
    },

    'desert': {
        name: 'Desert',
        colors: [
            { r: 96, g: 56, b: 39 },
            { r: 191, g: 122, b: 81 },
            { r: 234, g: 192, b: 134 },
            { r: 168, g: 198, b: 204 },
            { r: 73, g: 110, b: 130 }
        ]
    },

    'berry': {
        name: 'Berry',
        colors: [
            { r: 35, g: 12, b: 36 },
            { r: 92, g: 26, b: 76 },
            { r: 162, g: 48, b: 124 },
            { r: 220, g: 95, b: 155 },
            { r: 247, g: 196, b: 224 }
        ]
    },

    'sakura': {
        name: 'Sakura',
        colors: [
            { r: 78, g: 60, b: 73 },
            { r: 184, g: 112, b: 137 },
            { r: 232, g: 169, b: 187 },
            { r: 252, g: 219, b: 228 },
            { r: 254, g: 246, b: 240 }
        ]
    },

    'noir-red': {
        name: 'Noir Red',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 64, g: 64, b: 64 },
            { r: 192, g: 192, b: 192 },
            { r: 255, g: 255, b: 255 },
            { r: 178, g: 0, b: 0 }
        ]
    },

    'muted-earth': {
        name: 'Muted Earth',
        colors: [
            { r: 60, g: 53, b: 45 },
            { r: 122, g: 100, b: 80 },
            { r: 168, g: 142, b: 109 },
            { r: 188, g: 175, b: 138 },
            { r: 220, g: 209, b: 178 }
        ]
    },

    'tropical': {
        name: 'Tropical',
        colors: [
            { r: 0, g: 96, b: 100 },
            { r: 0, g: 172, b: 172 },
            { r: 255, g: 211, b: 56 },
            { r: 248, g: 109, b: 41 },
            { r: 217, g: 41, b: 78 }
        ]
    },

    'twilight': {
        name: 'Twilight',
        colors: [
            { r: 19, g: 22, b: 64 },
            { r: 56, g: 36, b: 95 },
            { r: 109, g: 50, b: 117 },
            { r: 180, g: 84, b: 122 },
            { r: 234, g: 144, b: 121 },
            { r: 250, g: 213, b: 159 }
        ]
    },

    'rose-gold': {
        name: 'Rose Gold',
        colors: [
            { r: 67, g: 47, b: 51 },
            { r: 153, g: 88, b: 89 },
            { r: 215, g: 132, b: 122 },
            { r: 240, g: 184, b: 161 },
            { r: 248, g: 226, b: 213 }
        ]
    },

    'mint-cream': {
        name: 'Mint Cream',
        colors: [
            { r: 36, g: 71, b: 60 },
            { r: 91, g: 161, b: 132 },
            { r: 178, g: 220, b: 193 },
            { r: 233, g: 247, b: 218 },
            { r: 252, g: 243, b: 217 }
        ]
    },

    'lichen': {
        name: 'Lichen',
        colors: [
            { r: 47, g: 51, b: 41 },
            { r: 101, g: 116, b: 84 },
            { r: 165, g: 170, b: 124 },
            { r: 207, g: 198, b: 162 },
            { r: 232, g: 222, b: 196 }
        ]
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

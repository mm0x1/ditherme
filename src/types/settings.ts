/**
 * User settings and preferences
 */

import type { PostEffect } from './post-effect.ts';
import type { ImageAdjustments } from './state.ts';
import type { ImageEffect, ImageEffectParams } from './image-effect.ts';

/**
 * Export preset configuration
 */
export interface ExportPreset {
    id: string;
    name: string;
    format: 'png' | 'jpeg' | 'webp';
    quality: number;  // 1-100, for jpeg/webp
    scale: number;    // 1x, 2x, 0.5x, etc.
}

/**
 * User settings persisted to localStorage
 */
export interface UserSettings {
    // Default algorithm settings
    defaultMode: 'mono' | 'color';
    defaultAlgorithm: string;
    defaultPalette: string;

    // UI preferences
    rememberZoom: boolean;
    autoFitOnLoad: boolean;
    showWasmBadges: boolean;

    // Performance
    enableCaching: boolean;
    cacheMaxMemoryMB: number;

    // Favorites
    favoriteAlgorithms: string[];

    // Export presets
    exportPresets: ExportPreset[];
    defaultExportPreset: string | null;

    // Recently used
    recentAlgorithms: string[];
    maxRecentItems: number;

    // API settings
    apiEnabled: boolean;
    apiPort: number;
    apiBindAddress: string;
    apiAuthEnabled: boolean;
    apiAuthToken: string | null;

    // Post-Processing
    postEffect: PostEffect;
    effectColor: string;
    layer2Adjustments: ImageAdjustments;

    // Image Effects
    imageEffect: ImageEffect;
    imageEffectParams: ImageEffectParams;
}

/**
 * Default export presets
 */
export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
    { id: 'web-png', name: 'Web (PNG)', format: 'png', quality: 100, scale: 1 },
    { id: 'web-jpg', name: 'Web (JPEG 80%)', format: 'jpeg', quality: 80, scale: 1 },
    { id: 'hq-png', name: 'High Quality (PNG 2x)', format: 'png', quality: 100, scale: 2 },
    { id: 'social', name: 'Social Media (JPEG)', format: 'jpeg', quality: 85, scale: 1 },
    { id: 'thumbnail', name: 'Thumbnail (JPEG 0.5x)', format: 'jpeg', quality: 70, scale: 0.5 },
];

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: UserSettings = {
    defaultMode: 'mono',
    defaultAlgorithm: 'floyd-steinberg',
    defaultPalette: 'mono',
    rememberZoom: false,
    autoFitOnLoad: true,
    showWasmBadges: true,
    enableCaching: true,
    cacheMaxMemoryMB: 256,
    favoriteAlgorithms: [],
    exportPresets: [...DEFAULT_EXPORT_PRESETS],
    defaultExportPreset: 'web-png',
    recentAlgorithms: [],
    maxRecentItems: 10,
    // API defaults
    apiEnabled: true,
    apiPort: 7842,
    apiBindAddress: '127.0.0.1',
    apiAuthEnabled: false,
    apiAuthToken: null,

    // Post-Processing defaults
    postEffect: 'none',
    effectColor: '#ff6600',
    layer2Adjustments: { brightness: 0, contrast: 0, gamma: 1.0, saturation: 0, blackPoint: 0, whitePoint: 255 },

    // Image Effects defaults
    imageEffect: 'none',
    imageEffectParams: { intensity: 50, radius: 10, color: '#ff4400', amount: 3, threshold: 100 },
};

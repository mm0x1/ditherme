/**
 * Electron Vite Configuration
 * Configures the build for main process, preload scripts, and renderer
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
    // Main process configuration
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/main.ts')
                }
            }
        }
    },

    // Preload script configuration
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/preload.ts')
                }
            }
        }
    },

    // Renderer configuration (web app)
    renderer: {
        root: '.',
        build: {
            target: 'es2022',
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'index.html')
                }
            }
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@types': resolve(__dirname, 'src/types'),
                '@ui': resolve(__dirname, 'src/ui'),
                '@engine': resolve(__dirname, 'src/engine'),
                '@algorithms': resolve(__dirname, 'src/algorithms')
            }
        },
        worker: {
            format: 'es'
        }
    }
});

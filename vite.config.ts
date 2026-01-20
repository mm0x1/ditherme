import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@types': resolve(__dirname, 'src/types'),
            '@ui': resolve(__dirname, 'src/ui'),
            '@engine': resolve(__dirname, 'src/engine'),
            '@algorithms': resolve(__dirname, 'src/algorithms')
        }
    },
    build: {
        target: 'es2022',
        outDir: 'dist'
    },
    worker: {
        format: 'es'
    }
});

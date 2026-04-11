import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@types': resolve(__dirname, 'src/types'),
            '@ui': resolve(__dirname, 'src/ui'),
            '@engine': resolve(__dirname, 'src/engine'),
            '@algorithms': resolve(__dirname, 'src/algorithms'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/types/**',
                'src/data/**',
                'src/**/*.d.ts',
                'src/api/openapi-spec.ts',
            ],
        },
    },
});

import { describe, it, expect } from 'vitest';
import { handleAlgorithms } from '../../../../src/api/handlers/algorithms.ts';
import { createMockAPIContext, createMockRequest } from '../../../fixtures/api.ts';

describe('handleAlgorithms', () => {
    it('returns 200', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        expect(res.status).toBe(200);
    });

    it('body has mono and color groups', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        const body = res.body as { mono: unknown[]; color: unknown[] };
        expect(Array.isArray(body.mono)).toBe(true);
        expect(Array.isArray(body.color)).toBe(true);
    });

    it('mono groups are non-empty', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        const body = res.body as { mono: Array<{ category: string; algorithms: unknown[] }> };
        expect(body.mono.length).toBeGreaterThan(0);
    });

    it('each group has category and algorithms array', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        const body = res.body as { mono: Array<{ category: string; algorithms: Array<{ id: string; name: string }> }> };
        for (const group of body.mono) {
            expect(typeof group.category).toBe('string');
            expect(Array.isArray(group.algorithms)).toBe(true);
        }
    });

    it('each algorithm detail has id and name', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        const body = res.body as { mono: Array<{ algorithms: Array<{ id: string; name: string }> }> };
        const first = body.mono[0].algorithms[0];
        expect(typeof first.id).toBe('string');
        expect(typeof first.name).toBe('string');
    });

    it('floyd-steinberg algorithm is in mono list', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/algorithms');
        const res = await handleAlgorithms(req, ctx);
        const body = res.body as { mono: Array<{ algorithms: Array<{ id: string }> }> };
        const allMono = body.mono.flatMap(g => g.algorithms);
        expect(allMono.some(a => a.id === 'floyd-steinberg')).toBe(true);
    });
});

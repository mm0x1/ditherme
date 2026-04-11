import { describe, it, expect } from 'vitest';
import { handleInfo } from '../../../../src/api/handlers/info.ts';
import { createMockAPIContext, createMockRequest } from '../../../fixtures/api.ts';

describe('handleInfo', () => {
    it('returns 200', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleInfo(req, ctx);
        expect(res.status).toBe(200);
    });

    it('body.name is dithertoy', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleInfo(req, ctx);
        const body = res.body as { name: string };
        expect(body.name).toBe('dithertoy');
    });

    it('includes apiVersion field', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleInfo(req, ctx);
        const body = res.body as { apiVersion: string };
        expect(typeof body.apiVersion).toBe('string');
    });

    it('includes capabilities array', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleInfo(req, ctx);
        const body = res.body as { capabilities: string[] };
        expect(Array.isArray(body.capabilities)).toBe(true);
        expect(body.capabilities.length).toBeGreaterThan(0);
    });

    it('includes endpoints array', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleInfo(req, ctx);
        const body = res.body as { endpoints: Array<{ method: string; path: string }> };
        expect(Array.isArray(body.endpoints)).toBe(true);
        expect(body.endpoints.length).toBeGreaterThan(0);
        expect(body.endpoints[0]).toHaveProperty('method');
        expect(body.endpoints[0]).toHaveProperty('path');
    });
});

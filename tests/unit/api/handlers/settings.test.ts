import { describe, it, expect, vi } from 'vitest';
import { handleGetSettings, handleUpdateSettings } from '../../../../src/api/handlers/settings.ts';
import { createMockAPIContext, createMockRequest, createMockStateSnapshot } from '../../../fixtures/api.ts';

describe('handleGetSettings', () => {
    it('returns 200', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/settings');
        const res = await handleGetSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('returns mode and algorithm from app state', async () => {
        const ctx = createMockAPIContext({
            getAppState: () => createMockStateSnapshot({ mode: 'color', algorithm: 'ordered-bayer4' }),
        });
        const req = createMockRequest('GET', '/api/settings');
        const res = await handleGetSettings(req, ctx);
        const body = res.body as { mode: string; algorithm: string };
        expect(body.mode).toBe('color');
        expect(body.algorithm).toBe('ordered-bayer4');
    });

    it('response includes all required settings fields', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/settings');
        const res = await handleGetSettings(req, ctx);
        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('mode');
        expect(body).toHaveProperty('algorithm');
        expect(body).toHaveProperty('palette');
        expect(body).toHaveProperty('colorMatch');
        expect(body).toHaveProperty('pixelScale');
        expect(body).toHaveProperty('levels');
        expect(body).toHaveProperty('adjustments');
    });
});

describe('handleUpdateSettings', () => {
    it('returns 400 for empty body', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', null);
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('returns 400 for non-object body', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', 'bad');
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid mode update', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', { mode: 'color' });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
        expect(setAppState).toHaveBeenCalled();
    });

    it('rejects invalid mode', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { mode: 'rainbow' });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid algorithm', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', { algorithm: 'floyd-steinberg' });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('rejects unknown algorithm', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { algorithm: 'fake-algo' });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid pixelScale', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', { pixelScale: 4 });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('rejects out-of-range pixelScale', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { pixelScale: 100 });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('rejects non-integer pixelScale', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { pixelScale: 2.5 });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid palette as string preset', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', { palette: 'mono' });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('rejects unknown palette preset string', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { palette: 'nonexistent-palette' });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid palette as color array', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', {
            palette: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }]
        });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('rejects palette with fewer than 2 colors', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', {
            palette: [{ r: 0, g: 0, b: 0 }]
        });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('accepts valid adjustments', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', {
            adjustments: { brightness: 10, contrast: -20 }
        });
        const res = await handleUpdateSettings(req, ctx);
        expect(res.status).toBe(200);
    });

    it('rejects brightness out of range', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', {
            adjustments: { brightness: 200 }
        });
        await expect(handleUpdateSettings(req, ctx)).rejects.toThrow();
    });

    it('does not call setAppState for empty update', async () => {
        const setAppState = vi.fn();
        const ctx = createMockAPIContext({ setAppState });
        const req = createMockRequest('POST', '/api/settings', {});
        await handleUpdateSettings(req, ctx);
        expect(setAppState).not.toHaveBeenCalled();
    });

    it('returns updated settings in response', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('POST', '/api/settings', { mode: 'color' });
        const res = await handleUpdateSettings(req, ctx);
        const body = res.body as { success: boolean; settings: Record<string, unknown> };
        expect(body.success).toBe(true);
        expect(body.settings).toHaveProperty('mode');
    });
});

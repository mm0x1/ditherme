import { describe, it, expect } from 'vitest';
import { handleRequest, createAPIRequest } from '../../../src/api/router.ts';
import { createMockAPIContext, createMockRequest } from '../../fixtures/api.ts';

describe('handleRequest', () => {
    it('handles OPTIONS preflight with 204', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('OPTIONS', '/api/info');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(204);
    });

    it('OPTIONS response includes CORS headers', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('OPTIONS', '/api/info');
        const res = await handleRequest(req, ctx);
        expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('returns 404 for unknown path', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/does-not-exist');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(404);
    });

    it('returns 405 for known path with wrong method', async () => {
        const ctx = createMockAPIContext();
        // /api/info only has GET
        const req = createMockRequest('DELETE', '/api/info');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(405);
    });

    it('applies CORS headers to all responses', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleRequest(req, ctx);
        expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('returns 401 when auth fails', async () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'valid-token',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'Bearer wrong' });
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(401);
    });

    it('routes GET /api/info to info handler successfully', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(200);
        const body = res.body as { name: string };
        expect(body.name).toBe('ditherme');
    });

    it('routes GET /api/settings to settings handler', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/settings');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(200);
    });

    it('parses path parameters correctly (GET /api/batch/:id)', async () => {
        const ctx = createMockAPIContext({
            getBatchQueue: () => ({
                createJob: () => {},
                getJob: () => null,
                cancelJob: () => {},
                getAllJobs: () => [],
            }),
        });
        const req = createMockRequest('GET', '/api/batch/job123');
        const res = await handleRequest(req, ctx);
        // Returns 404 not-found for missing job, but routing worked
        expect(res.status).toBe(404);
    });

    it('strips query string before route matching', async () => {
        const ctx = createMockAPIContext();
        const req = createMockRequest('GET', '/api/info?foo=bar');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(200);
    });

    it('handles unexpected handler errors with 500', async () => {
        const ctx = createMockAPIContext({
            getAppState: () => { throw new Error('crash'); },
        });
        const req = createMockRequest('GET', '/api/settings');
        const res = await handleRequest(req, ctx);
        expect(res.status).toBe(500);
    });
});

describe('createAPIRequest', () => {
    it('normalizes method to uppercase', () => {
        const req = createAPIRequest('get', '/api/info', {}, null);
        expect(req.method).toBe('GET');
    });

    it('normalizes header keys to lowercase', () => {
        const req = createAPIRequest('GET', '/api/info', { 'Content-Type': 'application/json' }, null);
        expect(req.headers['content-type']).toBe('application/json');
    });

    it('parses query string from URL', () => {
        const req = createAPIRequest('GET', '/api/info?foo=bar&baz=qux', {}, null);
        expect(req.query['foo']).toBe('bar');
        expect(req.query['baz']).toBe('qux');
    });

    it('returns empty query for URL without query string', () => {
        const req = createAPIRequest('GET', '/api/info', {}, null);
        expect(req.query).toEqual({});
    });

    it('sets path to full URL', () => {
        const req = createAPIRequest('GET', '/api/info?x=1', {}, null);
        expect(req.path).toBe('/api/info?x=1');
    });
});

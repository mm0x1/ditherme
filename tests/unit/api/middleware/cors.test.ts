import { describe, it, expect } from 'vitest';
import { applyCors, createPreflightResponse } from '../../../../src/api/middleware/cors.ts';

describe('applyCors', () => {
    it('adds Access-Control-Allow-Origin header', () => {
        const response = applyCors({ status: 200, headers: {}, body: null });
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('adds Access-Control-Allow-Methods header', () => {
        const response = applyCors({ status: 200, headers: {}, body: null });
        expect(response.headers['Access-Control-Allow-Methods']).toContain('GET');
        expect(response.headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('adds Access-Control-Allow-Headers header', () => {
        const response = applyCors({ status: 200, headers: {}, body: null });
        expect(response.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
        expect(response.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    });

    it('adds Access-Control-Max-Age header', () => {
        const response = applyCors({ status: 200, headers: {}, body: null });
        expect(response.headers['Access-Control-Max-Age']).toBeDefined();
    });

    it('preserves existing headers in the response', () => {
        const response = applyCors({ status: 200, headers: { 'Content-Type': 'application/json' }, body: null });
        expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('existing response headers take precedence over CORS defaults', () => {
        const response = applyCors({
            status: 200,
            headers: { 'Access-Control-Allow-Origin': 'https://example.com' },
            body: null
        });
        expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('preserves status and body', () => {
        const body = { foo: 'bar' };
        const response = applyCors({ status: 201, headers: {}, body });
        expect(response.status).toBe(201);
        expect(response.body).toBe(body);
    });

    it('does not add credentials header by default', () => {
        const response = applyCors({ status: 200, headers: {}, body: null });
        expect(response.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });
});

describe('createPreflightResponse', () => {
    it('returns 204 status', () => {
        const response = createPreflightResponse();
        expect(response.status).toBe(204);
    });

    it('includes CORS headers', () => {
        const response = createPreflightResponse();
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('has null body', () => {
        const response = createPreflightResponse();
        expect(response.body).toBeNull();
    });
});

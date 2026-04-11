import { describe, it, expect } from 'vitest';
import { checkAuth, generateToken } from '../../../../src/api/middleware/auth.ts';
import { createMockAPIContext, createMockRequest } from '../../../fixtures/api.ts';

describe('checkAuth', () => {
    it('returns null when auth is disabled', () => {
        const ctx = createMockAPIContext({ isAuthEnabled: () => false });
        const req = createMockRequest('GET', '/api/info');
        expect(checkAuth(req, ctx)).toBeNull();
    });

    it('returns 500 when auth is enabled but no token configured', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => null,
        });
        const req = createMockRequest('GET', '/api/info');
        const result = checkAuth(req, ctx);
        expect(result).not.toBeNull();
        expect(result!.status).toBe(500);
    });

    it('returns 401 when no authorization header is present', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'secret-token',
        });
        const req = createMockRequest('GET', '/api/info', null, {});
        const result = checkAuth(req, ctx);
        expect(result).not.toBeNull();
        expect(result!.status).toBe(401);
    });

    it('returns 401 for invalid authorization format (no Bearer)', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'secret-token',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'Token secret-token' });
        const result = checkAuth(req, ctx);
        expect(result).not.toBeNull();
        expect(result!.status).toBe(401);
    });

    it('returns 401 for wrong token', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'correct-token',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'Bearer wrong-token' });
        const result = checkAuth(req, ctx);
        expect(result).not.toBeNull();
        expect(result!.status).toBe(401);
    });

    it('returns null for correct token', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'correct-token',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'Bearer correct-token' });
        expect(checkAuth(req, ctx)).toBeNull();
    });

    it('is case-insensitive for Bearer prefix', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'mytoken',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'BEARER mytoken' });
        expect(checkAuth(req, ctx)).toBeNull();
    });

    it('rejects token of different length (timing attack safety)', () => {
        const ctx = createMockAPIContext({
            isAuthEnabled: () => true,
            getAuthToken: () => 'short',
        });
        const req = createMockRequest('GET', '/api/info', null, { authorization: 'Bearer longertoken' });
        const result = checkAuth(req, ctx);
        expect(result).not.toBeNull();
        expect(result!.status).toBe(401);
    });
});

describe('generateToken', () => {
    it('generates a token of default length 32', () => {
        const token = generateToken();
        expect(token).toHaveLength(32);
    });

    it('generates a token of specified length', () => {
        const token = generateToken(16);
        expect(token).toHaveLength(16);
    });

    it('generates different tokens each time', () => {
        const a = generateToken();
        const b = generateToken();
        expect(a).not.toBe(b);
    });

    it('only contains alphanumeric characters', () => {
        const token = generateToken(64);
        expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLegacyAPIServiceWorkers } from '../../../src/utils/legacy-api-cleanup.ts';

afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    vi.restoreAllMocks();
});

describe('cleanupLegacyAPIServiceWorkers', () => {
    it('unregisters only the legacy API scope', async () => {
        const unregisterLegacy = vi.fn(async () => true);
        const unregisterOther = vi.fn(async () => true);
        const apiScope = new URL('/api/', window.location.origin).href;

        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: {
                getRegistrations: vi.fn(async () => [
                    { scope: apiScope, unregister: unregisterLegacy },
                    { scope: `${window.location.origin}/`, unregister: unregisterOther }
                ])
            }
        });

        await cleanupLegacyAPIServiceWorkers();

        expect(unregisterLegacy).toHaveBeenCalledOnce();
        expect(unregisterOther).not.toHaveBeenCalled();
    });

    it('does not throw when service workers are unavailable', async () => {
        await expect(cleanupLegacyAPIServiceWorkers()).resolves.toBeUndefined();
    });

    it('does not throw when registration lookup fails', async () => {
        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: {
                getRegistrations: vi.fn(async () => {
                    throw new Error('registration unavailable');
                })
            }
        });

        await expect(cleanupLegacyAPIServiceWorkers()).resolves.toBeUndefined();
    });
});

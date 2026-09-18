/**
 * Remove API service-worker registrations left by pre-alpha builds.
 */
export async function cleanupLegacyAPIServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
            return;
        }

        const apiScope = new URL('/api/', window.location.href).href;
        const registrations = await navigator.serviceWorker.getRegistrations();
        const legacyRegistrations = registrations.filter(
            registration => registration.scope === apiScope
        );

        const results = await Promise.all(
            legacyRegistrations.map(registration => registration.unregister())
        );

        if (results.some(Boolean)) {
            console.info('[App] Removed legacy API service-worker registration');
        }
    } catch (error) {
        console.warn('[App] Failed to remove legacy API service-worker registration:', error);
    }
}

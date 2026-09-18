const APPROVED_EXTERNAL_PATHS = new Set([
    '/mm0x1/ditherme',
    '/mm0x1/ditherme/issues'
]);

export function getApprovedExternalURL(value: string): string | null {
    try {
        const url = new URL(value);

        if (
            url.protocol !== 'https:' ||
            url.origin !== 'https://github.com' ||
            url.username ||
            url.password ||
            url.port ||
            url.search ||
            url.hash ||
            !APPROVED_EXTERNAL_PATHS.has(url.pathname)
        ) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

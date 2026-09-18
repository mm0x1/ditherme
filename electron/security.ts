type RendererIPCEvent = {
    senderFrame: { url: string } | null;
};

export function assertTrustedRenderer(event: RendererIPCEvent): void {
    const url = event.senderFrame?.url;

    if (!url || !isTrustedRendererURL(url)) {
        throw new Error('Untrusted renderer IPC sender');
    }
}

function isTrustedRendererURL(value: string): boolean {
    try {
        const url = new URL(value);

        if (process.env.VITE_DEV_SERVER_URL) {
            return url.origin === new URL(process.env.VITE_DEV_SERVER_URL).origin;
        }

        return url.protocol === 'file:' && url.pathname.endsWith('/out/renderer/index.html');
    } catch {
        return false;
    }
}

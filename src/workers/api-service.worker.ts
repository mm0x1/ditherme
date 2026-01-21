/**
 * API Service Worker
 * Intercepts /api/* requests in web mode and routes them to the main thread
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const API_PREFIX = '/api/';

/**
 * Message types for communication with main thread
 */
interface APIRequestMessage {
    type: 'api-request';
    id: string;
    request: {
        method: string;
        path: string;
        headers: Record<string, string>;
        body: unknown;
    };
}

interface APIResponseMessage {
    type: 'api-response';
    id: string;
    response?: {
        status: number;
        headers: Record<string, string>;
        body: unknown;
    };
    error?: string;
}

// Pending requests waiting for responses
const pendingRequests = new Map<string, {
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
}>();

/**
 * Install event - skip waiting to activate immediately
 */
self.addEventListener('install', (event) => {
    console.log('[API Service Worker] Installing');
    event.waitUntil(self.skipWaiting());
});

/**
 * Activate event - claim all clients
 */
self.addEventListener('activate', (event) => {
    console.log('[API Service Worker] Activating');
    event.waitUntil(self.clients.claim());
});

/**
 * Fetch event - intercept API requests
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only intercept /api/* requests on the same origin
    if (!url.pathname.startsWith(API_PREFIX)) {
        return;
    }

    // Handle the API request
    event.respondWith(handleAPIRequest(event.request));
});

/**
 * Message event - receive responses from main thread
 */
self.addEventListener('message', (event) => {
    const data = event.data as APIResponseMessage;

    if (data.type !== 'api-response') {
        return;
    }

    const pending = pendingRequests.get(data.id);
    if (!pending) {
        console.warn('[API Service Worker] No pending request for id:', data.id);
        return;
    }

    pendingRequests.delete(data.id);

    if (data.error) {
        pending.reject(new Error(data.error));
    } else if (data.response) {
        const response = createResponse(data.response);
        pending.resolve(response);
    } else {
        pending.reject(new Error('Invalid response'));
    }
});

/**
 * Handle an API request
 */
async function handleAPIRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
        // Read request body if present
        let body: unknown = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    body = await request.json();
                } catch {
                    return new Response(
                        JSON.stringify({ error: 'Invalid JSON in request body', code: 'BAD_REQUEST' }),
                        { status: 400, headers: { 'Content-Type': 'application/json' } }
                    );
                }
            }
        }

        // Convert headers to object
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });

        // Generate request ID
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Create request message
        const message: APIRequestMessage = {
            type: 'api-request',
            id,
            request: {
                method: request.method,
                path: url.pathname + url.search,
                headers,
                body
            }
        };

        // Send to main thread and wait for response
        const response = await sendToMainThread(id, message);
        return response;

    } catch (error) {
        console.error('[API Service Worker] Error handling request:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal error',
                code: 'INTERNAL_ERROR'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Send message to main thread and wait for response
 */
function sendToMainThread(id: string, message: APIRequestMessage): Promise<Response> {
    return new Promise((resolve, reject) => {
        // Set timeout
        const timeout = setTimeout(() => {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
        }, 30000);

        pendingRequests.set(id, {
            resolve: (response) => {
                clearTimeout(timeout);
                resolve(response);
            },
            reject: (error) => {
                clearTimeout(timeout);
                reject(error);
            }
        });

        // Send to all clients
        self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length === 0) {
                pendingRequests.delete(id);
                clearTimeout(timeout);
                reject(new Error('No active clients'));
                return;
            }

            // Send to the first client (should be the main window)
            clients[0].postMessage(message);
        });
    });
}

/**
 * Create a Response from API response data
 */
function createResponse(data: { status: number; headers: Record<string, string>; body: unknown }): Response {
    const headers = new Headers();

    for (const [key, value] of Object.entries(data.headers)) {
        headers.set(key, value);
    }

    let body: BodyInit | null = null;

    if (data.body !== null && data.body !== undefined) {
        if (data.body instanceof ArrayBuffer) {
            body = data.body;
        } else if (data.body instanceof Uint8Array) {
            body = data.body.buffer as ArrayBuffer;
        } else {
            body = JSON.stringify(data.body);
            if (!headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
        }
    }

    return new Response(body, {
        status: data.status,
        headers
    });
}

export {};

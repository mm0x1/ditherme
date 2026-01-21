/**
 * Electron API Server
 * HTTP server for the scripting API in Electron mode
 */

import * as http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { BrowserWindow, ipcMain } from 'electron';

/**
 * API Server configuration
 */
interface APIServerConfig {
    port: number;
    bindAddress: string;
    authEnabled: boolean;
    authToken: string | null;
}

/**
 * API Server class
 */
export class APIServer {
    private server: http.Server | null = null;
    private config: APIServerConfig;
    private mainWindow: BrowserWindow | null = null;
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

    constructor(config: APIServerConfig) {
        this.config = config;
    }

    /**
     * Set the main window for IPC communication
     */
    setMainWindow(window: BrowserWindow): void {
        this.mainWindow = window;
    }

    /**
     * Start the API server
     */
    async start(): Promise<void> {
        if (this.server) {
            console.log('[API Server] Already running');
            return;
        }

        return new Promise((resolve, reject) => {
            this.server = http.createServer(this.handleRequest.bind(this));

            this.server.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`[API Server] Port ${this.config.port} is already in use`);
                    reject(new Error(`Port ${this.config.port} is already in use`));
                } else {
                    console.error('[API Server] Error:', error);
                    reject(error);
                }
            });

            this.server.listen(this.config.port, this.config.bindAddress, () => {
                console.log(`[API Server] Running at http://${this.config.bindAddress}:${this.config.port}`);
                resolve();
            });
        });
    }

    /**
     * Stop the API server
     */
    async stop(): Promise<void> {
        if (!this.server) {
            return;
        }

        return new Promise((resolve) => {
            this.server!.close(() => {
                console.log('[API Server] Stopped');
                this.server = null;
                resolve();
            });
        });
    }

    /**
     * Check if server is running
     */
    isRunning(): boolean {
        return this.server !== null && this.server.listening;
    }

    /**
     * Get the current port
     */
    getPort(): number {
        return this.config.port;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<APIServerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Handle incoming HTTP requests
     */
    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        // Collect request body
        const chunks: Buffer[] = [];

        req.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        req.on('end', async () => {
            try {
                const bodyBuffer = Buffer.concat(chunks);
                const bodyString = bodyBuffer.toString('utf8');

                // Parse body as JSON if present
                let body: unknown = null;
                if (bodyString && req.headers['content-type']?.includes('application/json')) {
                    try {
                        body = JSON.parse(bodyString);
                    } catch {
                        this.sendResponse(res, 400, {
                            error: 'Invalid JSON in request body',
                            code: 'BAD_REQUEST'
                        });
                        return;
                    }
                }

                // Create request object
                const apiRequest = {
                    method: req.method || 'GET',
                    path: req.url || '/',
                    headers: this.normalizeHeaders(req.headers),
                    body,
                    authEnabled: this.config.authEnabled,
                    authToken: this.config.authToken
                };

                // Send to renderer process for handling
                const response = await this.forwardToRenderer(apiRequest);

                // Send response
                this.sendAPIResponse(res, response);

            } catch (error) {
                console.error('[API Server] Request handling error:', error);
                this.sendResponse(res, 500, {
                    error: error instanceof Error ? error.message : 'Internal server error',
                    code: 'INTERNAL_ERROR'
                });
            }
        });

        req.on('error', (error) => {
            console.error('[API Server] Request error:', error);
            this.sendResponse(res, 500, {
                error: 'Request error',
                code: 'INTERNAL_ERROR'
            });
        });
    }

    /**
     * Forward request to renderer process via IPC
     */
    private forwardToRenderer(request: unknown): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
        return new Promise((resolve, reject) => {
            if (!this.mainWindow || this.mainWindow.isDestroyed()) {
                reject(new Error('Main window not available'));
                return;
            }

            const id = ++this.requestId;

            // Set timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, 30000);

            this.pendingRequests.set(id, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response as { status: number; headers: Record<string, string>; body: unknown });
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            // Send to renderer
            this.mainWindow.webContents.send('api-request', { id, request });
        });
    }

    /**
     * Handle response from renderer
     */
    handleRendererResponse(id: number, response: unknown, error?: string): void {
        const pending = this.pendingRequests.get(id);
        if (!pending) {
            console.warn('[API Server] No pending request for id:', id);
            return;
        }

        this.pendingRequests.delete(id);

        if (error) {
            pending.reject(new Error(error));
        } else {
            pending.resolve(response);
        }
    }

    /**
     * Normalize headers to lowercase keys
     */
    private normalizeHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
        const normalized: Record<string, string> = {};

        for (const [key, value] of Object.entries(headers)) {
            if (typeof value === 'string') {
                normalized[key.toLowerCase()] = value;
            } else if (Array.isArray(value)) {
                normalized[key.toLowerCase()] = value.join(', ');
            }
        }

        return normalized;
    }

    /**
     * Send API response
     */
    private sendAPIResponse(
        res: ServerResponse,
        response: { status: number; headers: Record<string, string>; body: unknown }
    ): void {
        // Set headers
        for (const [key, value] of Object.entries(response.headers)) {
            res.setHeader(key, value);
        }

        res.statusCode = response.status;

        // Handle binary responses
        if (response.body instanceof ArrayBuffer || response.body instanceof Uint8Array) {
            const buffer = Buffer.from(response.body as ArrayBuffer);
            res.end(buffer);
        } else if (response.body === null || response.body === undefined) {
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response.body));
        }
    }

    /**
     * Send JSON response
     */
    private sendResponse(res: ServerResponse, status: number, body: unknown): void {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(body));
    }
}

// Singleton instance
let apiServer: APIServer | null = null;

/**
 * Initialize the API server
 */
export function initAPIServer(config: APIServerConfig): APIServer {
    if (apiServer) {
        return apiServer;
    }

    apiServer = new APIServer(config);
    return apiServer;
}

/**
 * Get the API server instance
 */
export function getAPIServer(): APIServer | null {
    return apiServer;
}

/**
 * Setup IPC handlers for API server communication
 */
export function setupAPIServerIPC(): void {
    // Handle response from renderer
    ipcMain.on('api-response', (_event, { id, response, error }) => {
        if (apiServer) {
            apiServer.handleRendererResponse(id, response, error);
        }
    });

    // Get API server status
    ipcMain.handle('api-server-status', () => {
        return {
            running: apiServer?.isRunning() ?? false,
            port: apiServer?.getPort() ?? 7842
        };
    });

    // Start API server
    ipcMain.handle('api-server-start', async (_event, config: APIServerConfig) => {
        if (!apiServer) {
            apiServer = new APIServer(config);
        } else {
            apiServer.updateConfig(config);
        }

        try {
            await apiServer.start();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start API server'
            };
        }
    });

    // Stop API server
    ipcMain.handle('api-server-stop', async () => {
        if (apiServer) {
            await apiServer.stop();
        }
        return { success: true };
    });
}

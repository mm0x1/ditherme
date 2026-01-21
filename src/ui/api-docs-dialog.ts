/**
 * API Documentation Dialog
 * Shows API information and links to documentation
 */

import { settings } from '../utils/settings.ts';

/**
 * Show the API documentation dialog
 */
export function showAPIDocsDialog(): void {
    // Remove existing dialog if present
    const existing = document.querySelector('.api-docs-dialog');
    if (existing) {
        existing.remove();
        return;
    }

    const apiPort = settings.get('apiPort');
    const apiEnabled = settings.get('apiEnabled');
    const baseUrl = `http://localhost:${apiPort}`;

    const modal = document.createElement('div');
    modal.className = 'modal api-docs-dialog';

    modal.innerHTML = `
        <div class="modal-content api-docs-content">
            <div class="help-header">
                <h3>Scripting API</h3>
                <button class="close-btn" title="Close">&times;</button>
            </div>
            <div class="api-docs-body">
                <div class="api-experimental-notice">
                    <strong>Experimental Feature</strong> - The Scripting API is under development and may not work reliably in all configurations.
                </div>

                <div class="api-status ${apiEnabled ? 'enabled' : 'disabled'}">
                    <span class="status-indicator"></span>
                    <span>API is ${apiEnabled ? 'enabled' : 'disabled'}</span>
                    ${!apiEnabled ? '<span class="status-hint">(Enable in Settings)</span>' : ''}
                </div>

                <div class="api-info-section">
                    <h4>Base URL</h4>
                    <div class="api-url-box">
                        <code id="api-base-url">${baseUrl}</code>
                        <button class="btn btn-small" id="copy-url-btn" title="Copy URL">Copy</button>
                    </div>
                </div>

                <div class="api-info-section">
                    <h4>Quick Links</h4>
                    <div class="api-links">
                        <a href="${baseUrl}/api/info" target="_blank" class="api-link">
                            <span class="link-method">GET</span>
                            <span class="link-path">/api/info</span>
                            <span class="link-desc">API Discovery</span>
                        </a>
                        <a href="${baseUrl}/api/status" target="_blank" class="api-link">
                            <span class="link-method">GET</span>
                            <span class="link-path">/api/status</span>
                            <span class="link-desc">App Status</span>
                        </a>
                        <a href="${baseUrl}/api/algorithms" target="_blank" class="api-link">
                            <span class="link-method">GET</span>
                            <span class="link-path">/api/algorithms</span>
                            <span class="link-desc">List Algorithms</span>
                        </a>
                        <a href="${baseUrl}/api/settings" target="_blank" class="api-link">
                            <span class="link-method">GET</span>
                            <span class="link-path">/api/settings</span>
                            <span class="link-desc">Current Settings</span>
                        </a>
                        <a href="${baseUrl}/api/palettes" target="_blank" class="api-link">
                            <span class="link-method">GET</span>
                            <span class="link-path">/api/palettes</span>
                            <span class="link-desc">Available Palettes</span>
                        </a>
                    </div>
                </div>

                <div class="api-info-section">
                    <h4>Interactive Documentation</h4>
                    <p class="api-docs-desc">
                        Open the Swagger UI documentation to explore and test all API endpoints interactively.
                    </p>
                    <button class="btn btn-primary" id="open-swagger-btn">
                        Open API Documentation
                    </button>
                </div>

                <div class="api-info-section">
                    <h4>Example Usage</h4>
                    <div class="code-example">
                        <pre><code># Get current status
curl ${baseUrl}/api/status

# Load an image from URL
curl -X POST ${baseUrl}/api/load \\
  -H "Content-Type: application/json" \\
  -d '{"source":{"type":"url","url":"https://example.com/image.png"}}'

# Change algorithm and trigger dither
curl -X POST ${baseUrl}/api/dither \\
  -H "Content-Type: application/json" \\
  -d '{"settings":{"algorithm":"atkinson"}}'

# Get result as PNG
curl ${baseUrl}/api/result?format=png -o output.png</code></pre>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="api-docs-close">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Get elements
    const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement;
    const closeBtn2 = modal.querySelector('#api-docs-close') as HTMLButtonElement;
    const copyUrlBtn = modal.querySelector('#copy-url-btn') as HTMLButtonElement;
    const openSwaggerBtn = modal.querySelector('#open-swagger-btn') as HTMLButtonElement;

    // Copy URL handler
    copyUrlBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(baseUrl);
            copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyUrlBtn.textContent = 'Copy';
            }, 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = baseUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyUrlBtn.textContent = 'Copy';
            }, 2000);
        }
    });

    // Open Swagger docs
    openSwaggerBtn.addEventListener('click', () => {
        const docsUrl = `/api-docs/index.html?port=${apiPort}`;
        window.open(docsUrl, '_blank');
    });

    // Close handlers
    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    closeBtn2.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

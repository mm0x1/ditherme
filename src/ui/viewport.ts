import { app, shouldUpdateViewport, shouldInvalidateVideoCache } from '../app.ts';
import { getVideoManager } from '../engine/video/video-manager.ts';

/**
 * Debounce delay for video settings changes (ms)
 * This prevents excessive cache invalidation during rapid slider adjustments
 */
const VIDEO_SETTINGS_DEBOUNCE_MS = 50;

/**
 * Viewport controls interface
 */
export interface ViewportControls {
    canvas: HTMLCanvasElement;
    render: () => void;
    setZoom: (zoom: number, centerOnMouse?: { x: number; y: number }) => void;
    resetView: () => void;
    fitToView: () => void;
}

/**
 * Zoom constraints
 */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;

/**
 * Initialize the canvas viewport with zoom and pan support
 */
export function initViewport(container: HTMLElement): ViewportControls {
    const canvasEl = container.querySelector<HTMLCanvasElement>('#main-canvas');
    if (!canvasEl) {
        throw new Error('Canvas element not found');
    }

    const ctxEl = canvasEl.getContext('2d', { willReadFrequently: true });
    if (!ctxEl) {
        throw new Error('Could not get 2D context');
    }

    // Capture as non-null (we've verified above)
    const canvas = canvasEl;
    const ctx = ctxEl;

    const emptyState = container.querySelector<HTMLElement>('#empty-state');
    const zoomLevelEl = container.querySelector<HTMLElement>('#zoom-level');
    const imageDimensionsEl = container.querySelector<HTMLElement>('#image-dimensions');

    let animationFrameId: number | null = null;

    // Track current video frame for rendering
    let currentVideoFrame: ImageData | null = null;
    let lastRenderedFrameIndex = -1;
    // Monotonic counter for video frame requests. Each new request bumps it;
    // when a request completes we only render if its id is still the latest.
    // This avoids a hung fetch (e.g. a stuck source/decoder request) blocking
    // all future renders the way a single in-flight gate would.
    let videoFrameRequestId = 0;

    // Debounce timer for video settings changes
    let videoSettingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Render the current image to canvas
     */
    function render(): void {
        const state = app.getState();

        // Video mode: don't gate behind requestAnimationFrame — playback needs
        // every frame request to proceed without cancelling the previous one.
        if (state.isVideoMode && state.videoMetadata) {
            renderVideoFrame(state);
            return;
        }

        // Cancel any pending render for static images
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
            const currentState = app.getState();

            const image = currentState.showOriginal ? currentState.sourceImage : (currentState.ditheredImage ?? currentState.sourceImage);

            // Update empty state visibility
            if (emptyState) {
                emptyState.classList.toggle('hidden', image !== null || currentState.isVideoMode);
            }

            // Update video mode indicator
            container.classList.toggle('video-mode', currentState.isVideoMode);

            if (!image) {
                // Clear canvas when no image
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                updateInfo(null);
                return;
            }

            renderImage(image, currentState);
            animationFrameId = null;
        });
    }

    /**
     * Render a static image
     */
    function renderImage(image: ImageData, state: ReturnType<typeof app.getState>): void {
        // Set canvas size to container size
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate centered position
        const { zoom, panX, panY } = state;
        const scaledWidth = image.width * zoom;
        const scaledHeight = image.height * zoom;
        const centerX = (containerWidth - scaledWidth) / 2 + panX;
        const centerY = (containerHeight - scaledHeight) / 2 + panY;

        // Create temporary canvas for the image
        const tempCanvas = new OffscreenCanvas(image.width, image.height);
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(image, 0, 0);

        // Disable image smoothing for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;

        // Draw scaled image
        ctx.drawImage(
            tempCanvas,
            0, 0, image.width, image.height,
            centerX, centerY, scaledWidth, scaledHeight
        );

        updateInfo(image);
    }

    /**
     * Render a video frame
     */
    async function renderVideoFrame(state: ReturnType<typeof app.getState>): Promise<void> {
        const frameIndex = state.currentFrame;
        const wantOriginal = state.showOriginal;

        // Skip only if the frame currently on the canvas is exactly this one.
        if (lastRenderedFrameIndex === frameIndex && currentVideoFrame && !wantOriginal) {
            renderImage(currentVideoFrame, state);
            return;
        }

        const requestId = ++videoFrameRequestId;

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        container.classList.add('video-mode');

        // Show the last completed frame immediately while we load the new one
        if (currentVideoFrame) {
            renderImage(currentVideoFrame, state);
        }

        try {
            const videoManager = getVideoManager();

            let imageData: ImageData;
            if (wantOriginal) {
                const sourceFrame = await videoManager.getSourceFrame(frameIndex);
                imageData = sourceFrame.imageData;
            } else {
                const ditheredFrame = await videoManager.getDitheredFrame(frameIndex, state);
                imageData = ditheredFrame.imageData;
            }

            // Only render if no newer request has been made since this one
            // started. A hung older request can no longer block the canvas.
            if (requestId === videoFrameRequestId) {
                currentVideoFrame = imageData;
                lastRenderedFrameIndex = frameIndex;
                renderImage(currentVideoFrame, app.getState());
            }
        } catch (error) {
            console.error('[Viewport] Error loading video frame:', error);
        }

        animationFrameId = null;
    }

    /**
     * Update zoom and dimension info
     */
    function updateInfo(image: ImageData | null): void {
        const state = app.getState();

        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(state.zoom * 100)}%`;
        }

        // Update zoom display in right panel
        const zoomDisplay = document.getElementById('zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(state.zoom * 100)}%`;
        }

        if (imageDimensionsEl) {
            if (image) {
                imageDimensionsEl.textContent = `${image.width} × ${image.height}`;
            } else {
                imageDimensionsEl.textContent = '';
            }
        }
    }

    /**
     * Set zoom level, optionally centering on a point
     */
    function setZoom(newZoom: number, centerPoint?: { x: number; y: number }): void {
        const state = app.getState();
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

        if (clampedZoom === state.zoom) return;

        let newPanX = state.panX;
        let newPanY = state.panY;

        // If center point provided, adjust pan to keep that point stationary
        if (centerPoint && state.sourceImage) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const image = state.sourceImage;

            // Current image center position
            const oldScaledWidth = image.width * state.zoom;
            const oldScaledHeight = image.height * state.zoom;
            const oldCenterX = (containerWidth - oldScaledWidth) / 2 + state.panX;
            const oldCenterY = (containerHeight - oldScaledHeight) / 2 + state.panY;

            // Point in image coordinates
            const imgX = (centerPoint.x - oldCenterX) / state.zoom;
            const imgY = (centerPoint.y - oldCenterY) / state.zoom;

            // New center position
            const newScaledWidth = image.width * clampedZoom;
            const newScaledHeight = image.height * clampedZoom;
            const newCenterX = (containerWidth - newScaledWidth) / 2;
            const newCenterY = (containerHeight - newScaledHeight) / 2;

            // Where the point would be at new zoom
            const newPointX = newCenterX + imgX * clampedZoom;
            const newPointY = newCenterY + imgY * clampedZoom;

            // Adjust pan to keep point at same screen position
            newPanX = centerPoint.x - newPointX;
            newPanY = centerPoint.y - newPointY;
        }

        app.setState({
            zoom: clampedZoom,
            panX: newPanX,
            panY: newPanY
        });
    }

    /**
     * Reset view to default zoom and pan
     */
    function resetView(): void {
        app.setState({
            zoom: 1,
            panX: 0,
            panY: 0
        });
    }

    /**
     * Fit image to viewport
     */
    function fitToView(): void {
        const state = app.getState();
        const image = state.sourceImage;

        if (!image) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const padding = 40; // Some padding around the image

        const scaleX = (containerWidth - padding * 2) / image.width;
        const scaleY = (containerHeight - padding * 2) / image.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

        app.setState({
            zoom: scale,
            panX: 0,
            panY: 0
        });
    }

    // ========== Event Handlers ==========

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();

        const state = app.getState();
        if (!state.sourceImage) return;

        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = state.zoom * (1 + delta);

        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setZoom(newZoom, { x: mouseX, y: mouseY });
    }, { passive: false });

    // Pan with mouse drag
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button !== 0) return; // Only left click

        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isPanning) return;

        const state = app.getState();
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;

        app.setState({
            panX: state.panX + dx,
            panY: state.panY + dy
        });

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isPanning = false;
        canvas.style.cursor = '';
    });

    canvas.addEventListener('mouseleave', () => {
        isPanning = false;
        canvas.style.cursor = '';
    });

    // Double-click to fit
    canvas.addEventListener('dblclick', () => {
        fitToView();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Ignore if typing in input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const state = app.getState();

        switch (e.key) {
            case '+':
            case '=':
                setZoom(state.zoom + ZOOM_STEP);
                break;
            case '-':
            case '_':
                setZoom(state.zoom - ZOOM_STEP);
                break;
            case '0':
                resetView();
                break;
            case '.':
                fitToView();
                break;
            case ' ':
                // Toggle show original while space is held
                e.preventDefault();
                app.setState({ showOriginal: true });
                break;
        }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.key === ' ') {
            app.setState({ showOriginal: false });
        }
    });

    // React to state changes
    app.on('statechange', (e) => {
        if (shouldUpdateViewport(e.detail.changes)) {
            render();
        }

        // Debounce video cache invalidation when dither settings change
        // This prevents excessive re-dithering during rapid slider adjustments
        if (e.detail.newState.isVideoMode && shouldInvalidateVideoCache(e.detail.changes)) {
            // Cancel any pending invalidation
            if (videoSettingsDebounceTimer !== null) {
                clearTimeout(videoSettingsDebounceTimer);
            }

            videoSettingsDebounceTimer = setTimeout(() => {
                videoSettingsDebounceTimer = null;
                const videoManager = getVideoManager();
                videoManager.invalidateCache();
                // Force a refetch by invalidating lastRenderedFrameIndex.
                // currentVideoFrame is kept so we keep showing the old frame
                // while the new one processes (instant feedback).
                lastRenderedFrameIndex = -1;
                render();
            }, VIDEO_SETTINGS_DEBOUNCE_MS);
        }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        render();
    });
    resizeObserver.observe(container);

    // Initial render
    render();

    return {
        canvas,
        render,
        setZoom,
        resetView,
        fitToView
    };
}

/**
 * Initialize view control buttons in the right panel
 */
export function initViewControls(viewportControls: ViewportControls): void {
    // Zoom in/out buttons
    document.querySelectorAll('[data-action="zoom-in"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = app.getState();
            viewportControls.setZoom(state.zoom + ZOOM_STEP);
        });
    });

    document.querySelectorAll('[data-action="zoom-out"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = app.getState();
            viewportControls.setZoom(state.zoom - ZOOM_STEP);
        });
    });

    document.querySelectorAll('[data-action="fit-to-view"]').forEach(btn => {
        btn.addEventListener('click', () => {
            viewportControls.fitToView();
        });
    });

    document.querySelectorAll('[data-action="actual-size"]').forEach(btn => {
        btn.addEventListener('click', () => {
            viewportControls.resetView();
        });
    });

    // Show original toggle
    const showOriginalCheckbox = document.getElementById('show-original') as HTMLInputElement;
    if (showOriginalCheckbox) {
        showOriginalCheckbox.addEventListener('change', () => {
            app.setState({ showOriginal: showOriginalCheckbox.checked });
        });

        app.on('statechange', (e) => {
            if ('showOriginal' in e.detail.changes) {
                showOriginalCheckbox.checked = e.detail.newState.showOriginal;
            }
        });
    }

    // Toggle original via menu
    document.querySelectorAll('[data-action="toggle-original"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = app.getState();
            app.setState({ showOriginal: !state.showOriginal });
        });
    });
}

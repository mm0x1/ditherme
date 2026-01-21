import { app } from '../app.ts';
import { isSupportedVideoType, MAX_VIDEO_DURATION } from '../types/video.ts';
import { getVideoManager } from './video/video-manager.ts';
import { getTimeline } from '../ui/video/timeline.ts';

/**
 * Supported image MIME types
 */
const SUPPORTED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/bmp',
    'image/webp'
];

/**
 * Check if a file is a video
 */
function isVideoFile(file: File): boolean {
    return isSupportedVideoType(file.type);
}

/**
 * Check if a file is an image
 */
function isImageFile(file: File): boolean {
    return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Maximum image dimension
 */
const MAX_DIMENSION = 4096;

/**
 * Result type for operations
 */
export type ImageLoadResult = {
    ok: true;
    imageData: ImageData;
    fileName: string;
} | {
    ok: false;
    error: string;
}

/**
 * Load an image file and convert to ImageData
 */
export async function loadImageFile(file: File): Promise<ImageLoadResult> {
    // Validate file type
    if (!isImageFile(file)) {
        return {
            ok: false,
            error: `Unsupported file type: ${file.type}. Supported types: PNG, JPEG, GIF, BMP, WebP`
        };
    }

    try {
        // Create object URL for the file
        const url = URL.createObjectURL(file);

        try {
            // Load as image
            const imageData = await loadImageFromURL(url);

            if (!imageData.ok) {
                return imageData;
            }

            return {
                ok: true,
                imageData: imageData.imageData,
                fileName: file.name
            };
        } finally {
            // Clean up object URL
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        return {
            ok: false,
            error: `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Load image from URL and convert to ImageData
 */
export async function loadImageFromURL(url: string): Promise<ImageLoadResult> {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            // Check dimensions
            if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
                resolve({
                    ok: false,
                    error: `Image too large (${img.width}×${img.height}). Maximum dimension is ${MAX_DIMENSION}px`
                });
                return;
            }

            // Convert to ImageData
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                resolve({
                    ok: false,
                    error: 'Failed to create canvas context'
                });
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            resolve({
                ok: true,
                imageData,
                fileName: url.split('/').pop() || 'image'
            });
        };

        img.onerror = () => {
            resolve({
                ok: false,
                error: 'Failed to decode image'
            });
        };

        img.src = url;
    });
}

/**
 * Load image from clipboard
 */
export async function loadImageFromClipboard(): Promise<ImageLoadResult> {
    try {
        const clipboardItems = await navigator.clipboard.read();

        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (SUPPORTED_IMAGE_TYPES.includes(type)) {
                    const blob = await item.getType(type);
                    const file = new File([blob], 'clipboard-image', { type });
                    return loadImageFile(file);
                }
            }
        }

        return {
            ok: false,
            error: 'No image found in clipboard'
        };
    } catch (error) {
        return {
            ok: false,
            error: `Failed to read clipboard: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Export ImageData to blob
 */
export async function imageDataToBlob(
    imageData: ImageData,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality = 0.92
): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            },
            format,
            quality
        );
    });
}

/**
 * Copy ImageData to clipboard
 */
export async function copyImageToClipboard(imageData: ImageData): Promise<boolean> {
    try {
        const blob = await imageDataToBlob(imageData, 'image/png');
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Download ImageData as file
 */
export async function downloadImage(
    imageData: ImageData,
    fileName: string,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
): Promise<void> {
    const blob = await imageDataToBlob(imageData, format);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Scale ImageData using nearest-neighbor interpolation (pixel-perfect)
 */
function scaleImageData(imageData: ImageData, scale: number): ImageData {
    if (scale === 1) return imageData;

    const newWidth = Math.round(imageData.width * scale);
    const newHeight = Math.round(imageData.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor for pixel-perfect scaling

    // Draw original to temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    // Scale to target size
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Download image with export preset settings
 */
export async function downloadImageWithPreset(
    imageData: ImageData,
    fileName: string,
    preset: { format: 'png' | 'jpeg' | 'webp'; quality: number; scale: number }
): Promise<void> {
    // Scale image if needed
    let outputData = imageData;
    if (preset.scale !== 1) {
        outputData = scaleImageData(imageData, preset.scale);
    }

    const format = `image/${preset.format}` as 'image/png' | 'image/jpeg' | 'image/webp';
    const quality = preset.quality / 100;

    // Generate filename with correct extension
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const extension = preset.format === 'jpeg' ? 'jpg' : preset.format;
    const finalFileName = `${baseName}_dithered.${extension}`;

    const blob = await imageDataToBlob(outputData, format, quality);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Set up drag and drop handlers for the viewport
 */
export function initDragAndDrop(viewport: HTMLElement): void {
    const dropOverlay = viewport.querySelector<HTMLElement>('#drop-overlay');

    let dragCounter = 0;

    viewport.addEventListener('dragenter', (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter++;

        if (e.dataTransfer?.types.includes('Files')) {
            dropOverlay?.classList.remove('hidden');
        }
    });

    viewport.addEventListener('dragleave', (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter--;

        if (dragCounter === 0) {
            dropOverlay?.classList.add('hidden');
        }
    });

    viewport.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    });

    viewport.addEventListener('drop', async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter = 0;
        dropOverlay?.classList.add('hidden');

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Check if it's a video file
        if (isVideoFile(file)) {
            await handleVideoLoad(file);
        } else {
            await handleImageLoad(file);
        }
    });
}

/**
 * Set up file input handler
 */
export function initFileInput(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (!fileInput) return;

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (file) {
            // Check if it's a video file
            if (isVideoFile(file)) {
                await handleVideoLoad(file);
            } else {
                await handleImageLoad(file);
            }
            // Reset input so same file can be selected again
            fileInput.value = '';
        }
    });

    // Open file dialog on button click
    const openBtn = document.getElementById('open-file-btn');
    openBtn?.addEventListener('click', () => {
        fileInput.click();
    });

    // Menu open action
    document.querySelectorAll('[data-action="open"]').forEach(btn => {
        btn.addEventListener('click', () => {
            fileInput.click();
        });
    });

    // Menu open video action
    document.querySelectorAll('[data-action="open-video"]').forEach(btn => {
        btn.addEventListener('click', () => {
            fileInput.click();
        });
    });
}

/**
 * Handle image load - update app state
 */
async function handleImageLoad(file: File): Promise<void> {
    // Exit video mode if active
    if (app.getState().isVideoMode) {
        const videoManager = getVideoManager();
        videoManager.closeVideo();
        app.setState({
            isVideoMode: false,
            videoFile: null,
            videoMetadata: null,
            currentFrame: 0
        });
    }

    setStatus('Loading image...');

    const result = await loadImageFile(file);

    if (result.ok) {
        app.setState({
            sourceImage: result.imageData,
            ditheredImage: null, // Will be set by dithering
            originalFileName: result.fileName
        });

        // Emit loaded event
        app.emit('imageloaded', {
            fileName: result.fileName,
            imageData: result.imageData
        });

        setStatus(`Loaded: ${result.fileName} (${result.imageData.width}×${result.imageData.height})`);
    } else {
        setStatus(`Error: ${result.error}`);
        console.error('Image load error:', result.error);
    }
}

/**
 * Handle video load - update app state
 */
async function handleVideoLoad(file: File): Promise<void> {
    setStatus('Loading video...');

    try {
        const videoManager = getVideoManager();
        const metadata = await videoManager.loadVideo(file);

        // Validate duration
        if (metadata.duration > MAX_VIDEO_DURATION) {
            videoManager.closeVideo();
            setStatus(`Error: Video too long (${metadata.duration.toFixed(1)}s). Maximum duration is ${MAX_VIDEO_DURATION}s`);
            return;
        }

        // Update app state
        app.setState({
            isVideoMode: true,
            videoFile: file,
            videoMetadata: metadata,
            currentFrame: 0,
            isPlaying: false,
            sourceImage: null,
            ditheredImage: null,
            originalFileName: file.name
        });

        // Emit video loaded event
        app.emit('videoloaded', {
            metadata,
            fileName: file.name
        });

        // Initialize timeline if available
        const timeline = getTimeline();
        if (timeline) {
            timeline.setVideo(metadata);
        }

        setStatus(`Loaded: ${file.name} (${metadata.width}×${metadata.height}, ${metadata.duration.toFixed(1)}s, ${metadata.frameCount} frames)`);
    } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Video load error:', error);
    }
}

/**
 * Set up clipboard handlers
 */
export function initClipboard(): void {
    // Paste from clipboard
    document.addEventListener('paste', async (e: ClipboardEvent) => {
        // Don't intercept if user is typing
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (SUPPORTED_IMAGE_TYPES.includes(item.type)) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await handleImageLoad(file);
                }
                return;
            }
        }
    });

    // Copy menu action
    document.querySelectorAll('[data-action="copy"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const state = app.getState();
            const image = state.ditheredImage || state.sourceImage;

            if (image) {
                const success = await copyImageToClipboard(image);
                setStatus(success ? 'Copied to clipboard' : 'Failed to copy');
            }
        });
    });

    // Paste menu action
    document.querySelectorAll('[data-action="paste"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            setStatus('Loading from clipboard...');
            const result = await loadImageFromClipboard();

            if (result.ok) {
                app.setState({
                    sourceImage: result.imageData,
                    ditheredImage: null,
                    originalFileName: 'clipboard-image'
                });
                setStatus('Loaded from clipboard');
            } else {
                setStatus(`Error: ${result.error}`);
            }
        });
    });
}

/**
 * Set up save handlers
 */
export function initSaveHandlers(): void {
    // Save action
    document.querySelectorAll('[data-action="save"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const state = app.getState();
            const image = state.ditheredImage || state.sourceImage;

            if (!image) {
                setStatus('No image to save');
                return;
            }

            // Generate filename
            let fileName = state.originalFileName || 'image';
            const baseName = fileName.replace(/\.[^/.]+$/, '');
            fileName = `${baseName}_dithered.png`;

            await downloadImage(image, fileName, 'image/png');
            setStatus(`Saved: ${fileName}`);
        });
    });
}

/**
 * Update status message
 */
function setStatus(message: string): void {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

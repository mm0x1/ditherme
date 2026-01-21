/**
 * Batch processor - process multiple images with same settings
 */

import { app } from '../app.ts';
import { processImage } from './dither.ts';
import { loadImageFile, imageDataToBlob } from './image.ts';
import type { ExportPreset } from '../types/settings.ts';

/**
 * Batch job status
 */
export interface BatchJob {
    file: File;
    status: 'pending' | 'processing' | 'complete' | 'error';
    result?: Blob;
    error?: string;
}

/**
 * Batch processing options
 */
export interface BatchOptions {
    exportPreset: ExportPreset;
}

/**
 * Progress callback type
 */
export type BatchProgressCallback = (
    current: number,
    total: number,
    currentFile: string,
    status: string
) => void;

/**
 * Scale ImageData
 */
function scaleImageData(imageData: ImageData, scale: number): ImageData {
    if (scale === 1) return imageData;

    const newWidth = Math.round(imageData.width * scale);
    const newHeight = Math.round(imageData.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Process a batch of images with current dither settings
 */
export async function processBatch(
    files: File[],
    options: BatchOptions,
    onProgress: BatchProgressCallback
): Promise<BatchJob[]> {
    const jobs: BatchJob[] = files.map(file => ({
        file,
        status: 'pending' as const
    }));

    const state = app.getState();

    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        job.status = 'processing';
        onProgress(i + 1, jobs.length, job.file.name, 'Loading...');

        try {
            // Load image
            const loadResult = await loadImageFile(job.file);
            if (!loadResult.ok) {
                job.status = 'error';
                job.error = loadResult.error;
                continue;
            }

            onProgress(i + 1, jobs.length, job.file.name, 'Dithering...');

            // Process with current settings
            const dithered = await processImage(
                loadResult.imageData,
                state.algorithm,
                state.palette,
                state.adjustments,
                state.options,
                state.colorMatch,
                state.pixelScale,
                state.levels
            );

            // Scale if needed
            let output = dithered;
            if (options.exportPreset.scale !== 1) {
                output = scaleImageData(dithered, options.exportPreset.scale);
            }

            onProgress(i + 1, jobs.length, job.file.name, 'Encoding...');

            // Convert to blob
            const format = `image/${options.exportPreset.format}` as 'image/png' | 'image/jpeg' | 'image/webp';
            job.result = await imageDataToBlob(output, format, options.exportPreset.quality / 100);
            job.status = 'complete';

        } catch (error) {
            job.status = 'error';
            job.error = error instanceof Error ? error.message : String(error);
        }
    }

    return jobs;
}

/**
 * Download all completed batch jobs
 */
export async function downloadBatchResults(
    jobs: BatchJob[],
    preset: ExportPreset
): Promise<void> {
    const extension = preset.format === 'jpeg' ? 'jpg' : preset.format;

    for (const job of jobs) {
        if (job.status === 'complete' && job.result) {
            const baseName = job.file.name.replace(/\.[^/.]+$/, '');
            const fileName = `${baseName}_dithered.${extension}`;

            const url = URL.createObjectURL(job.result);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Small delay between downloads to prevent browser issues
            await new Promise(r => setTimeout(r, 150));
        }
    }
}

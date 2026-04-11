/**
 * Batch Queue Manager
 * Manages batch processing jobs
 */

import type {
    BatchQueue,
    BatchJob,
    BatchJobItem,
    BatchJobSettings,
    BatchJobResult,
    ImageSource
} from './types.ts';
import { generateId } from '../utils/id.ts';

/**
 * Batch Queue Manager implementation
 */
export class BatchQueueManager implements BatchQueue {
    private jobs: Map<string, BatchJob> = new Map();
    private cancelledJobs: Set<string> = new Set();
    private processImageFn: (source: ImageSource, settings: BatchJobSettings) => Promise<string>;

    constructor(
        processImage: (source: ImageSource, settings: BatchJobSettings) => Promise<string>
    ) {
        this.processImageFn = processImage;
    }

    /**
     * Create a new batch job
     */
    createJob(items: BatchJobItem[], settings: BatchJobSettings): BatchJob {
        const id = generateId('batch');

        const job: BatchJob = {
            id,
            status: 'pending',
            progress: 0,
            total: items.length,
            completed: 0,
            failed: 0,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
            items,
            settings,
            results: []
        };

        this.jobs.set(id, job);
        return job;
    }

    /**
     * Get a job by ID
     */
    getJob(id: string): BatchJob | undefined {
        return this.jobs.get(id);
    }

    /**
     * Start processing a batch job
     */
    async startJob(id: string): Promise<void> {
        const job = this.jobs.get(id);
        if (!job) {
            throw new Error(`Job not found: ${id}`);
        }

        if (job.status !== 'pending') {
            throw new Error(`Job cannot be started from status: ${job.status}`);
        }

        job.status = 'processing';
        job.startedAt = Date.now();

        try {
            for (let i = 0; i < job.items.length; i++) {
                // Check if cancelled
                if (this.cancelledJobs.has(id)) {
                    job.status = 'failed';
                    job.error = 'Job cancelled';
                    job.completedAt = Date.now();
                    this.cancelledJobs.delete(id);
                    return;
                }

                const item = job.items[i];
                const outputName = item.outputName || `output_${i + 1}`;

                try {
                    // Process the image
                    const resultData = await this.processImageFn(item.source, job.settings);

                    const result: BatchJobResult = {
                        index: i,
                        success: true,
                        outputName,
                        data: resultData
                    };

                    job.results.push(result);
                    job.completed++;
                } catch (error) {
                    const result: BatchJobResult = {
                        index: i,
                        success: false,
                        outputName,
                        error: error instanceof Error ? error.message : String(error)
                    };

                    job.results.push(result);
                    job.failed++;
                }

                // Update progress
                job.progress = Math.round(((i + 1) / job.total) * 100);
            }

            job.status = job.failed === job.total ? 'failed' : 'completed';
            job.completedAt = Date.now();

            if (job.failed > 0 && job.completed > 0) {
                job.error = `${job.failed} of ${job.total} items failed`;
            } else if (job.failed === job.total) {
                job.error = 'All items failed';
            }
        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
            job.completedAt = Date.now();
        }
    }

    /**
     * Cancel a batch job
     */
    cancelJob(id: string): void {
        const job = this.jobs.get(id);
        if (!job) {
            throw new Error(`Job not found: ${id}`);
        }

        if (job.status === 'pending') {
            job.status = 'failed';
            job.error = 'Job cancelled';
            job.completedAt = Date.now();
        } else if (job.status === 'processing') {
            this.cancelledJobs.add(id);
        }
    }

    /**
     * Get all jobs
     */
    getAllJobs(): BatchJob[] {
        return Array.from(this.jobs.values());
    }

    /**
     * Remove completed/failed jobs older than specified age
     */
    cleanupOldJobs(maxAgeMs: number = 3600000): void {
        const now = Date.now();

        for (const [id, job] of this.jobs.entries()) {
            if (job.status === 'completed' || job.status === 'failed') {
                if (job.completedAt && now - job.completedAt > maxAgeMs) {
                    this.jobs.delete(id);
                }
            }
        }
    }
}

/**
 * Create a batch queue with default image processor
 * This should be initialized with the actual dithering function
 */
export function createBatchQueue(
    processImage: (source: ImageSource, settings: BatchJobSettings) => Promise<string>
): BatchQueue {
    return new BatchQueueManager(processImage);
}

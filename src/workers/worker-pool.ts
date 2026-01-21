/**
 * Worker pool for parallel video frame processing
 */

import * as Comlink from 'comlink';
import type { Remote } from 'comlink';
import type { VideoProcessorAPI } from './video-processor.worker.ts';

/**
 * Generic worker pool interface
 */
export interface WorkerPool<T> {
    execute<R>(task: (worker: Remote<T>) => Promise<R>): Promise<R>;
    executeAll<R>(tasks: Array<(worker: Remote<T>) => Promise<R>>): Promise<R[]>;
    resize(count: number): void;
    terminate(): void;
    get size(): number;
}

/**
 * Worker instance with busy state tracking
 */
interface PooledWorker<T> {
    worker: Worker;
    proxy: Remote<T>;
    busy: boolean;
}

/**
 * Task waiting in queue
 */
interface QueuedTask<T, R> {
    task: (worker: Remote<T>) => Promise<R>;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
}

/**
 * Create a pool of workers for parallel processing
 */
export function createWorkerPool<T>(
    createWorker: () => Worker,
    initialSize: number
): WorkerPool<T> {
    const workers: Array<PooledWorker<T>> = [];
    const taskQueue: Array<QueuedTask<T, unknown>> = [];

    // Initialize workers
    for (let i = 0; i < initialSize; i++) {
        addWorker();
    }

    function addWorker(): void {
        const worker = createWorker();
        const proxy = Comlink.wrap<T>(worker);
        workers.push({ worker, proxy, busy: false });
    }

    function removeWorker(): void {
        const pooledWorker = workers.pop();
        if (pooledWorker) {
            pooledWorker.worker.terminate();
        }
    }

    function getAvailableWorker(): PooledWorker<T> | null {
        return workers.find(w => !w.busy) ?? null;
    }

    async function processNextTask(): Promise<void> {
        if (taskQueue.length === 0) return;

        const pooledWorker = getAvailableWorker();
        if (!pooledWorker) return;

        const { task, resolve, reject } = taskQueue.shift()!;
        pooledWorker.busy = true;

        try {
            const result = await task(pooledWorker.proxy);
            resolve(result);
        } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
            pooledWorker.busy = false;
            // Process next task if any
            processNextTask();
        }
    }

    return {
        execute<R>(task: (worker: Remote<T>) => Promise<R>): Promise<R> {
            return new Promise((resolve, reject) => {
                taskQueue.push({
                    task: task as (worker: Remote<T>) => Promise<unknown>,
                    resolve: resolve as (result: unknown) => void,
                    reject,
                });
                processNextTask();
            });
        },

        executeAll<R>(tasks: Array<(worker: Remote<T>) => Promise<R>>): Promise<R[]> {
            return Promise.all(tasks.map(task => this.execute(task)));
        },

        resize(count: number): void {
            while (workers.length < count) {
                addWorker();
            }
            while (workers.length > count) {
                // Only remove idle workers
                const idleIndex = workers.findIndex(w => !w.busy);
                if (idleIndex >= 0) {
                    const [removed] = workers.splice(idleIndex, 1);
                    removed.worker.terminate();
                } else {
                    // All workers busy, can't resize down right now
                    break;
                }
            }
        },

        terminate(): void {
            for (const pooledWorker of workers) {
                pooledWorker.worker.terminate();
            }
            workers.length = 0;
            taskQueue.length = 0;
        },

        get size(): number {
            return workers.length;
        },
    };
}

/**
 * Determine optimal worker pool size
 */
export function getOptimalWorkerCount(): number {
    const cores = navigator.hardwareConcurrency ?? 4;
    // Use cores - 2 to leave room for main thread and other tasks
    // Minimum 2, maximum 8
    return Math.min(8, Math.max(2, cores - 2));
}

/**
 * Create a video processor worker pool
 */
export function createVideoWorkerPool(): WorkerPool<VideoProcessorAPI> {
    const poolSize = getOptimalWorkerCount();

    return createWorkerPool<VideoProcessorAPI>(
        () => new Worker(
            new URL('./video-processor.worker.ts', import.meta.url),
            { type: 'module' }
        ),
        poolSize
    );
}

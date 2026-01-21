/**
 * Batch Processing Handlers
 * POST /api/batch, GET /api/batch/:id
 */

import type { APIRequest, APIResponse, APIContext, BatchRequest, BatchResponse, BatchStatusResponse } from '../types.ts';
import { createResponse } from '../types.ts';
import { APIError } from '../middleware/error.ts';
import { ALGORITHMS } from '../../algorithms/index.ts';
import type { Algorithm } from '../../types/index.ts';

/**
 * Handle POST /api/batch
 * Creates a new batch processing job
 */
export async function handleCreateBatch(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const body = req.body as BatchRequest;

    if (!body) {
        throw APIError.badRequest('Request body required');
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        throw APIError.badRequest('items must be a non-empty array');
    }

    if (!body.settings) {
        throw APIError.badRequest('settings object is required');
    }

    // Validate settings
    if (!body.settings.algorithm) {
        throw APIError.badRequest('settings.algorithm is required');
    }

    if (!ALGORITHMS[body.settings.algorithm as Algorithm]) {
        throw APIError.invalidAlgorithm(body.settings.algorithm);
    }

    if (!body.settings.export) {
        throw APIError.badRequest('settings.export is required');
    }

    if (!['png', 'jpeg', 'webp'].includes(body.settings.export.format)) {
        throw APIError.invalidFormat(body.settings.export.format);
    }

    // Validate items
    for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.source) {
            throw APIError.badRequest(`items[${i}].source is required`);
        }
        if (!['base64', 'url', 'file'].includes(item.source.type)) {
            throw APIError.badRequest(`items[${i}].source.type must be "base64", "url", or "file"`);
        }
    }

    // Create the batch job
    const batchQueue = context.getBatchQueue();
    const job = batchQueue.createJob(body.items, body.settings);

    // Auto-start if requested
    if (body.autoStart) {
        // Start in background
        batchQueue.startJob(job.id).catch(err => {
            console.error('Batch job error:', err);
        });
    }

    const response: BatchResponse = {
        id: job.id,
        status: job.status,
        total: job.total
    };

    return createResponse(response, 201);
}

/**
 * Handle GET /api/batch/:id
 * Returns batch job status and results
 */
export async function handleGetBatch(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const { id } = req.params;

    if (!id) {
        throw APIError.badRequest('Batch job ID is required');
    }

    const batchQueue = context.getBatchQueue();
    const job = batchQueue.getJob(id);

    if (!job) {
        throw APIError.batchNotFound(id);
    }

    const response: BatchStatusResponse = {
        ...job
    };

    return createResponse(response);
}

/**
 * Handle POST /api/batch/:id/start
 * Starts a pending batch job
 */
export async function handleStartBatch(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const { id } = req.params;

    if (!id) {
        throw APIError.badRequest('Batch job ID is required');
    }

    const batchQueue = context.getBatchQueue();
    const job = batchQueue.getJob(id);

    if (!job) {
        throw APIError.batchNotFound(id);
    }

    if (job.status !== 'pending') {
        throw APIError.badRequest(`Cannot start job with status "${job.status}"`);
    }

    // Start in background
    batchQueue.startJob(id).catch(err => {
        console.error('Batch job error:', err);
    });

    return createResponse({
        success: true,
        id,
        status: 'processing'
    });
}

/**
 * Handle POST /api/batch/:id/cancel
 * Cancels a batch job
 */
export async function handleCancelBatch(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    const { id } = req.params;

    if (!id) {
        throw APIError.badRequest('Batch job ID is required');
    }

    const batchQueue = context.getBatchQueue();
    const job = batchQueue.getJob(id);

    if (!job) {
        throw APIError.batchNotFound(id);
    }

    if (job.status === 'completed' || job.status === 'failed') {
        throw APIError.badRequest(`Cannot cancel job with status "${job.status}"`);
    }

    batchQueue.cancelJob(id);

    return createResponse({
        success: true,
        id,
        status: 'cancelled'
    });
}

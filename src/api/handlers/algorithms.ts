/**
 * GET /api/algorithms Handler
 * List all algorithms with parameters
 */

import type { APIRequest, APIResponse, APIContext, AlgorithmsResponse, AlgorithmCategoryGroup, AlgorithmDetail, AlgorithmOptionDefinition } from '../types.ts';
import { createResponse } from '../types.ts';
import { getAlgorithmsByCategory, shouldUseWasm } from '../../algorithms/index.ts';
import type { AlgorithmInfo } from '../../types/index.ts';

/**
 * Get option definitions for an algorithm
 */
function getAlgorithmOptions(algorithmId: string): AlgorithmOptionDefinition[] {
    // Most error diffusion algorithms support serpentine
    const isErrorDiffusion = algorithmId.includes('floyd') ||
        algorithmId.includes('jarvis') ||
        algorithmId.includes('stucki') ||
        algorithmId.includes('burkes') ||
        algorithmId.includes('sierra') ||
        algorithmId.includes('atkinson') ||
        algorithmId.includes('stevenson');

    if (isErrorDiffusion) {
        return [{
            name: 'serpentine',
            type: 'boolean' as const,
            default: true,
            description: 'Use serpentine (bi-directional) scanning for better quality'
        }];
    }

    return [];
}

/**
 * Convert algorithm info to API detail format
 */
function toAlgorithmDetail(info: AlgorithmInfo): AlgorithmDetail {
    return {
        id: info.id,
        name: info.name,
        description: info.description,
        warning: info.warning,
        hasWasm: shouldUseWasm(info.id),
        options: getAlgorithmOptions(info.id)
    };
}

/**
 * Handle GET /api/algorithms
 * Returns all available algorithms grouped by category
 */
export async function handleAlgorithms(
    _req: APIRequest,
    _context: APIContext
): Promise<APIResponse> {
    // Get mono algorithms by category
    const monoByCategory = getAlgorithmsByCategory('mono');
    const monoGroups: AlgorithmCategoryGroup[] = [];

    monoByCategory.forEach((algorithms, category) => {
        monoGroups.push({
            category,
            algorithms: algorithms.map(toAlgorithmDetail)
        });
    });

    // Get color algorithms by category
    const colorByCategory = getAlgorithmsByCategory('color');
    const colorGroups: AlgorithmCategoryGroup[] = [];

    colorByCategory.forEach((algorithms, category) => {
        colorGroups.push({
            category,
            algorithms: algorithms.map(toAlgorithmDetail)
        });
    });

    const response: AlgorithmsResponse = {
        mono: monoGroups,
        color: colorGroups
    };

    return createResponse(response);
}

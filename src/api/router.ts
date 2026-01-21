/**
 * API Router
 * Route matching with path parameter extraction
 */

import type { Route, APIRequest, APIResponse, APIContext, HttpMethod } from './types.ts';
import { createErrorResponse, ErrorCodes } from './types.ts';
import { routes } from './routes.ts';
import { applyCors } from './middleware/cors.ts';
import { checkAuth } from './middleware/auth.ts';
import { handleError } from './middleware/error.ts';

/**
 * Match result from route matching
 */
interface MatchResult {
    route: Route;
    params: Record<string, string>;
}

/**
 * Parse path pattern into regex and param names
 */
function parsePathPattern(pattern: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];

    // Escape special regex chars except for :params
    const regexStr = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });

    return {
        regex: new RegExp(`^${regexStr}$`),
        paramNames
    };
}

/**
 * Match a request path against a route pattern
 */
function matchRoute(method: HttpMethod, path: string): MatchResult | null {
    // Remove query string from path
    const pathWithoutQuery = path.split('?')[0];

    for (const route of routes) {
        if (route.method !== method) continue;

        const { regex, paramNames } = parsePathPattern(route.path);
        const match = pathWithoutQuery.match(regex);

        if (match) {
            const params: Record<string, string> = {};
            paramNames.forEach((name, index) => {
                params[name] = decodeURIComponent(match[index + 1]);
            });

            return { route, params };
        }
    }

    return null;
}

/**
 * Parse query string into key-value pairs
 */
function parseQuery(url: string): Record<string, string> {
    const query: Record<string, string> = {};
    const queryStart = url.indexOf('?');

    if (queryStart === -1) return query;

    const queryString = url.substring(queryStart + 1);
    const params = new URLSearchParams(queryString);

    params.forEach((value, key) => {
        query[key] = value;
    });

    return query;
}

/**
 * Main router function
 * Routes requests to appropriate handlers
 */
export async function handleRequest(
    req: APIRequest,
    context: APIContext
): Promise<APIResponse> {
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            return applyCors({
                status: 204,
                headers: {},
                body: null
            });
        }

        // Check authentication
        const authResult = checkAuth(req, context);
        if (authResult) {
            return applyCors(authResult);
        }

        // Parse query parameters
        req.query = parseQuery(req.path);

        // Match route
        const match = matchRoute(req.method, req.path);

        if (!match) {
            // Check if path exists but method is wrong
            const anyMethodMatch = routes.find(r => {
                const { regex } = parsePathPattern(r.path);
                return regex.test(req.path.split('?')[0]);
            });

            if (anyMethodMatch) {
                return applyCors(createErrorResponse(
                    `Method ${req.method} not allowed for ${req.path}`,
                    ErrorCodes.METHOD_NOT_ALLOWED,
                    405
                ));
            }

            return applyCors(createErrorResponse(
                `Endpoint not found: ${req.path}`,
                ErrorCodes.NOT_FOUND,
                404
            ));
        }

        // Set params on request
        req.params = match.params;

        // Execute handler
        const response = await match.route.handler(req, context);

        // Apply CORS headers
        return applyCors(response);

    } catch (error) {
        // Handle unexpected errors
        return applyCors(handleError(error));
    }
}

/**
 * Create an APIRequest from raw HTTP request data
 */
export function createAPIRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: unknown
): APIRequest {
    return {
        method: method.toUpperCase() as HttpMethod,
        path: url,
        params: {},
        query: parseQuery(url),
        headers: normalizeHeaders(headers),
        body
    };
}

/**
 * Normalize headers to lowercase keys
 */
function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value;
    }

    return normalized;
}

/**
 * OpenAPI 3.0 Specification
 * API documentation for dithertoy scripting API
 */

import { API_VERSION, DEFAULT_API_PORT } from './index.ts';

/**
 * Generate OpenAPI specification object
 */
export function getOpenAPISpec(port: number = DEFAULT_API_PORT): object {
    return {
        openapi: '3.0.3',
        info: {
            title: 'dithertoy API',
            description: 'HTTP-based REST API for programmatically controlling dithertoy. Allows external scripts and tools to load images, configure dithering settings, trigger processing, and export results.',
            version: API_VERSION,
            contact: {
                name: 'dithertoy',
                url: 'https://github.com/yourusername/dithertoy'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Local API server'
            }
        ],
        tags: [
            { name: 'Discovery', description: 'API discovery and status' },
            { name: 'Settings', description: 'Dithering configuration' },
            { name: 'Image', description: 'Image loading and processing' },
            { name: 'Palettes', description: 'Palette management' },
            { name: 'Batch', description: 'Batch processing' }
        ],
        paths: {
            '/api/info': {
                get: {
                    tags: ['Discovery'],
                    summary: 'API Discovery',
                    description: 'Returns API metadata including version, capabilities, and available endpoints.',
                    responses: {
                        '200': {
                            description: 'API information',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/InfoResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/status': {
                get: {
                    tags: ['Discovery'],
                    summary: 'Application Status',
                    description: 'Returns current application status including loaded image info and processing state.',
                    responses: {
                        '200': {
                            description: 'Application status',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StatusResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/algorithms': {
                get: {
                    tags: ['Settings'],
                    summary: 'List Algorithms',
                    description: 'Returns all available dithering algorithms grouped by category.',
                    responses: {
                        '200': {
                            description: 'Algorithm list',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AlgorithmsResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/settings': {
                get: {
                    tags: ['Settings'],
                    summary: 'Get Settings',
                    description: 'Returns current dithering settings.',
                    responses: {
                        '200': {
                            description: 'Current settings',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/SettingsResponse' }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: ['Settings'],
                    summary: 'Update Settings',
                    description: 'Updates dithering settings. Only provided fields are updated.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SettingsUpdateRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Settings updated',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            settings: { $ref: '#/components/schemas/SettingsResponse' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid settings',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/load': {
                post: {
                    tags: ['Image'],
                    summary: 'Load Image',
                    description: 'Loads an image from base64 data, URL, or file path (Electron only).',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LoadRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Image loaded',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/LoadResponse' }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid request',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/dither': {
                post: {
                    tags: ['Image'],
                    summary: 'Trigger Dithering',
                    description: 'Triggers dithering with current or overridden settings.',
                    requestBody: {
                        required: false,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DitherRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Dithering complete',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DitherResponse' }
                                }
                            }
                        },
                        '400': {
                            description: 'No image loaded or invalid settings',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/result': {
                get: {
                    tags: ['Image'],
                    summary: 'Get Result',
                    description: 'Returns the dithered result image.',
                    parameters: [
                        {
                            name: 'format',
                            in: 'query',
                            description: 'Output format',
                            schema: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' }
                        },
                        {
                            name: 'quality',
                            in: 'query',
                            description: 'JPEG/WebP quality (1-100)',
                            schema: { type: 'integer', minimum: 1, maximum: 100, default: 92 }
                        },
                        {
                            name: 'scale',
                            in: 'query',
                            description: 'Scale factor',
                            schema: { type: 'number', minimum: 0.1, maximum: 10, default: 1 }
                        },
                        {
                            name: 'encoding',
                            in: 'query',
                            description: 'Response encoding',
                            schema: { type: 'string', enum: ['base64', 'binary'], default: 'base64' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Result image',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ResultResponse' }
                                },
                                'image/png': {
                                    schema: { type: 'string', format: 'binary' }
                                },
                                'image/jpeg': {
                                    schema: { type: 'string', format: 'binary' }
                                },
                                'image/webp': {
                                    schema: { type: 'string', format: 'binary' }
                                }
                            }
                        },
                        '400': {
                            description: 'No result available',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/export': {
                post: {
                    tags: ['Image'],
                    summary: 'Export Image',
                    description: 'Exports the dithered image with specified format and quality.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ExportRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Exported image',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ResultResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/palettes': {
                get: {
                    tags: ['Palettes'],
                    summary: 'List Palettes',
                    description: 'Returns all available palettes (built-in and saved).',
                    responses: {
                        '200': {
                            description: 'Palette list',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/PalettesResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/palette': {
                post: {
                    tags: ['Palettes'],
                    summary: 'Set Palette',
                    description: 'Sets the current palette by preset name or custom colors.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SetPaletteRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Palette set',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            palette: { $ref: '#/components/schemas/PaletteInfo' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/batch': {
                post: {
                    tags: ['Batch'],
                    summary: 'Create Batch Job',
                    description: 'Creates a new batch processing job.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/BatchRequest' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Job created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BatchResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/batch/{id}': {
                get: {
                    tags: ['Batch'],
                    summary: 'Get Batch Job',
                    description: 'Returns batch job status and results.',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Batch job ID',
                            schema: { type: 'string' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Job status',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BatchStatusResponse' }
                                }
                            }
                        },
                        '404': {
                            description: 'Job not found',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    }
                }
            }
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    description: 'Optional API token authentication'
                }
            },
            schemas: {
                Color: {
                    type: 'object',
                    required: ['r', 'g', 'b'],
                    properties: {
                        r: { type: 'integer', minimum: 0, maximum: 255 },
                        g: { type: 'integer', minimum: 0, maximum: 255 },
                        b: { type: 'integer', minimum: 0, maximum: 255 }
                    }
                },
                Adjustments: {
                    type: 'object',
                    properties: {
                        brightness: { type: 'number', minimum: -100, maximum: 100, default: 0 },
                        contrast: { type: 'number', minimum: -100, maximum: 100, default: 0 },
                        gamma: { type: 'number', minimum: 0.1, maximum: 3.0, default: 1.0 },
                        saturation: { type: 'number', minimum: -100, maximum: 100, default: 0 },
                        blackPoint: { type: 'integer', minimum: 0, maximum: 128, default: 0 },
                        whitePoint: { type: 'integer', minimum: 128, maximum: 255, default: 255 }
                    }
                },
                InfoResponse: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        version: { type: 'string' },
                        apiVersion: { type: 'string' },
                        capabilities: { type: 'array', items: { type: 'string' } },
                        endpoints: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    method: { type: 'string' },
                                    path: { type: 'string' },
                                    description: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                StatusResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ready', 'processing', 'error'] },
                        hasImage: { type: 'boolean' },
                        image: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                width: { type: 'integer' },
                                height: { type: 'integer' },
                                fileName: { type: 'string', nullable: true }
                            }
                        },
                        isVideoMode: { type: 'boolean' },
                        currentSettings: {
                            type: 'object',
                            properties: {
                                mode: { type: 'string', enum: ['mono', 'color'] },
                                algorithm: { type: 'string' },
                                palette: { type: 'string' },
                                pixelScale: { type: 'integer' },
                                levels: { type: 'integer' }
                            }
                        }
                    }
                },
                AlgorithmsResponse: {
                    type: 'object',
                    properties: {
                        mono: { type: 'array', items: { $ref: '#/components/schemas/AlgorithmCategory' } },
                        color: { type: 'array', items: { $ref: '#/components/schemas/AlgorithmCategory' } }
                    }
                },
                AlgorithmCategory: {
                    type: 'object',
                    properties: {
                        category: { type: 'string' },
                        algorithms: { type: 'array', items: { $ref: '#/components/schemas/AlgorithmDetail' } }
                    }
                },
                AlgorithmDetail: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        warning: { type: 'string' },
                        hasWasm: { type: 'boolean' }
                    }
                },
                SettingsResponse: {
                    type: 'object',
                    properties: {
                        mode: { type: 'string', enum: ['mono', 'color'] },
                        algorithm: { type: 'string' },
                        options: { type: 'object' },
                        palette: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                colors: { type: 'array', items: { $ref: '#/components/schemas/Color' } }
                            }
                        },
                        colorMatch: { type: 'string' },
                        pixelScale: { type: 'integer' },
                        levels: { type: 'integer' },
                        adjustments: { $ref: '#/components/schemas/Adjustments' }
                    }
                },
                SettingsUpdateRequest: {
                    type: 'object',
                    properties: {
                        mode: { type: 'string', enum: ['mono', 'color'] },
                        algorithm: { type: 'string' },
                        options: { type: 'object' },
                        palette: {
                            oneOf: [
                                { type: 'string', description: 'Preset name' },
                                { type: 'array', items: { $ref: '#/components/schemas/Color' } }
                            ]
                        },
                        colorMatch: { type: 'string' },
                        pixelScale: { type: 'integer', minimum: 1, maximum: 16 },
                        levels: { type: 'integer', minimum: 0, maximum: 256 },
                        adjustments: { $ref: '#/components/schemas/Adjustments' }
                    }
                },
                LoadRequest: {
                    type: 'object',
                    required: ['source'],
                    properties: {
                        source: {
                            oneOf: [
                                {
                                    type: 'object',
                                    required: ['type', 'data', 'mimeType'],
                                    properties: {
                                        type: { type: 'string', enum: ['base64'] },
                                        data: { type: 'string' },
                                        mimeType: { type: 'string' }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type', 'url'],
                                    properties: {
                                        type: { type: 'string', enum: ['url'] },
                                        url: { type: 'string', format: 'uri' }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type', 'path'],
                                    properties: {
                                        type: { type: 'string', enum: ['file'] },
                                        path: { type: 'string' }
                                    }
                                }
                            ]
                        }
                    }
                },
                LoadResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        width: { type: 'integer' },
                        height: { type: 'integer' },
                        fileName: { type: 'string' }
                    }
                },
                DitherRequest: {
                    type: 'object',
                    properties: {
                        settings: { $ref: '#/components/schemas/SettingsUpdateRequest' },
                        waitForResult: { type: 'boolean', default: true }
                    }
                },
                DitherResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        duration: { type: 'integer', description: 'Processing time in milliseconds' }
                    }
                },
                ExportRequest: {
                    type: 'object',
                    required: ['format'],
                    properties: {
                        format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                        quality: { type: 'integer', minimum: 1, maximum: 100 },
                        scale: { type: 'number', minimum: 0.1, maximum: 10 }
                    }
                },
                ResultResponse: {
                    type: 'object',
                    properties: {
                        format: { type: 'string' },
                        width: { type: 'integer' },
                        height: { type: 'integer' },
                        data: { type: 'string', description: 'Base64 encoded image data' }
                    }
                },
                PalettesResponse: {
                    type: 'object',
                    properties: {
                        builtin: { type: 'array', items: { $ref: '#/components/schemas/PaletteInfo' } },
                        saved: { type: 'array', items: { $ref: '#/components/schemas/PaletteInfo' } }
                    }
                },
                PaletteInfo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        colorCount: { type: 'integer' },
                        colors: { type: 'array', items: { $ref: '#/components/schemas/Color' } }
                    }
                },
                SetPaletteRequest: {
                    type: 'object',
                    properties: {
                        preset: { type: 'string', description: 'Preset palette name' },
                        colors: { type: 'array', items: { $ref: '#/components/schemas/Color' } },
                        name: { type: 'string', description: 'Custom palette name' }
                    }
                },
                BatchRequest: {
                    type: 'object',
                    required: ['items', 'settings'],
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['source'],
                                properties: {
                                    source: { type: 'object' },
                                    outputName: { type: 'string' }
                                }
                            }
                        },
                        settings: {
                            type: 'object',
                            required: ['algorithm', 'export'],
                            properties: {
                                algorithm: { type: 'string' },
                                options: { type: 'object' },
                                palette: { type: 'object' },
                                colorMatch: { type: 'string' },
                                pixelScale: { type: 'integer' },
                                levels: { type: 'integer' },
                                adjustments: { $ref: '#/components/schemas/Adjustments' },
                                export: {
                                    type: 'object',
                                    required: ['format'],
                                    properties: {
                                        format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                                        quality: { type: 'integer' },
                                        scale: { type: 'number' }
                                    }
                                }
                            }
                        },
                        autoStart: { type: 'boolean', default: false }
                    }
                },
                BatchResponse: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        status: { type: 'string' },
                        total: { type: 'integer' }
                    }
                },
                BatchStatusResponse: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
                        progress: { type: 'integer', minimum: 0, maximum: 100 },
                        total: { type: 'integer' },
                        completed: { type: 'integer' },
                        failed: { type: 'integer' },
                        createdAt: { type: 'integer' },
                        startedAt: { type: 'integer', nullable: true },
                        completedAt: { type: 'integer', nullable: true },
                        results: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'integer' },
                                    success: { type: 'boolean' },
                                    outputName: { type: 'string' },
                                    data: { type: 'string' },
                                    error: { type: 'string' }
                                }
                            }
                        },
                        error: { type: 'string' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        code: { type: 'string' },
                        details: { type: 'object' }
                    }
                }
            }
        }
    };
}

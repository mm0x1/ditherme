import type { AppState, StateChangeDetail } from './state.ts';

/**
 * Custom event map for type-safe event handling
 */
export interface AppEventMap {
    'statechange': CustomEvent<StateChangeDetail>;
    'imageloaded': CustomEvent<{ fileName: string; imageData: ImageData }>;
    'ditherstart': CustomEvent<{ algorithm: string }>;
    'dithercomplete': CustomEvent<{ result: ImageData; duration: number }>;
    'dithererror': CustomEvent<{ error: Error }>;
    'progress': CustomEvent<{ progress: number; message?: string }>;
}

/**
 * Type-safe event listener type
 */
export type AppEventListener<K extends keyof AppEventMap> = (event: AppEventMap[K]) => void;

/**
 * Create a typed custom event
 */
export function createAppEvent<K extends keyof AppEventMap>(
    type: K,
    detail: AppEventMap[K]['detail']
): AppEventMap[K] {
    return new CustomEvent(type, { detail }) as AppEventMap[K];
}

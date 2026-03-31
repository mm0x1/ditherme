import type {
    AppState,
    StateUpdate,
    StateChangeDetail,
    Algorithm,
    AlgorithmOptions,
    DitherMode
} from './types/index.ts';
import type { AppEventMap, AppEventListener } from './types/events.ts';
import { createAppEvent } from './types/events.ts';

/**
 * Initial application state
 */
const initialState: AppState = {
    // Images
    sourceImage: null,
    ditheredImage: null,
    originalFileName: null,

    // Algorithm
    mode: 'mono',
    algorithm: 'floyd-steinberg',
    options: { serpentine: true },

    // Palette
    palette: {
        name: 'Mono',
        colors: [
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 255, b: 255 }
        ]
    },
    customPalette: null,
    colorMatch: 'euclidean',
    quantization: 'median-cut',

    // Dither Settings
    pixelScale: 1,   // 1 = normal, 2 = 2x2 blocks, etc.
    levels: 0,       // 0 = use full palette, 2-256 = reduce to N colors

    // Adjustments
    adjustments: {
        brightness: 0,
        contrast: 0,
        gamma: 1.0,
        saturation: 0,
        blackPoint: 0,    // 0 = disabled
        whitePoint: 255   // 255 = disabled
    },

    // Video
    videoFile: null,
    videoMetadata: null,
    currentFrame: 0,
    isVideoMode: false,
    isPlaying: false,
    playbackSpeed: 1,
    isProcessingVideo: false,

    // UI State
    zoom: 1,
    panX: 0,
    panY: 0,
    showOriginal: false,

    // Post-Processing Effects
    postEffect: 'none',
    effectColor: '#ff6600',
    layer2Adjustments: {
        brightness: 0,
        contrast: 0,
        gamma: 1.0,
        saturation: 0,
        blackPoint: 0,
        whitePoint: 255
    },

    // Processing
    isProcessing: false,
    processingProgress: 0
};

/**
 * Main Application class
 *
 * Centralized state management with event-driven updates.
 * Components subscribe to state changes via typed events.
 */
class App extends EventTarget {
    private state: AppState;
    private stateHistory: AppState[] = [];
    private redoStack: AppState[] = [];
    private maxHistoryLength = 50;

    constructor() {
        super();
        this.state = { ...initialState };
    }

    /**
     * Get current application state (read-only)
     */
    getState(): Readonly<AppState> {
        return this.state;
    }

    /**
     * Update application state with partial updates
     * Dispatches 'statechange' event with changes
     * @param updates - Partial state updates to apply
     * @param saveHistory - If true, saves current state to history before updating (for undo)
     */
    setState(updates: StateUpdate, saveHistory = false): void {
        // Save to history if requested (for undoable actions)
        if (saveHistory) {
            this.saveToHistory();
        }

        // Store previous state for event
        const oldState = { ...this.state };

        // Apply updates immutably
        this.state = { ...this.state, ...updates };

        // Dispatch state change event
        const detail: StateChangeDetail = {
            oldState,
            newState: this.state,
            changes: updates
        };

        this.dispatchEvent(createAppEvent('statechange', detail));
    }

    /**
     * Reset state to initial values
     */
    resetState(): void {
        this.setState({ ...initialState });
    }

    /**
     * Reset only adjustments to defaults
     */
    resetAdjustments(): void {
        this.setState({
            adjustments: {
                brightness: 0,
                contrast: 0,
                gamma: 1.0,
                saturation: 0,
                blackPoint: 0,
                whitePoint: 255
            }
        });
    }

    /**
     * Reset view (zoom and pan)
     */
    resetView(): void {
        this.setState({
            zoom: 1,
            panX: 0,
            panY: 0
        });
    }

    /**
     * Set algorithm and clear algorithm-specific options
     */
    setAlgorithm(algorithm: Algorithm, options?: AlgorithmOptions): void {
        this.setState({
            algorithm,
            options: options ?? { serpentine: true }
        });
    }

    /**
     * Set dithering mode (mono/color)
     */
    setMode(mode: DitherMode): void {
        this.setState({ mode });
    }

    /**
     * Type-safe event listener registration
     */
    on<K extends keyof AppEventMap>(
        type: K,
        listener: AppEventListener<K>
    ): void {
        this.addEventListener(type, listener as EventListener);
    }

    /**
     * Type-safe event listener removal
     */
    off<K extends keyof AppEventMap>(
        type: K,
        listener: AppEventListener<K>
    ): void {
        this.removeEventListener(type, listener as EventListener);
    }

    /**
     * Emit a typed event
     */
    emit<K extends keyof AppEventMap>(
        type: K,
        detail: AppEventMap[K]['detail']
    ): void {
        this.dispatchEvent(createAppEvent(type, detail));
    }

    /**
     * Subscribe to specific state property changes
     * Returns unsubscribe function
     */
    watch<K extends keyof AppState>(
        key: K,
        callback: (newValue: AppState[K], oldValue: AppState[K]) => void
    ): () => void {
        const listener = (event: Event) => {
            const detail = (event as CustomEvent<StateChangeDetail>).detail;
            if (key in detail.changes) {
                callback(detail.newState[key], detail.oldState[key]);
            }
        };

        this.addEventListener('statechange', listener);

        return () => {
            this.removeEventListener('statechange', listener);
        };
    }

    /**
     * Save current state to history (for undo)
     * Clears the redo stack since a new action invalidates redo history
     */
    saveToHistory(): void {
        this.stateHistory.push({ ...this.state });
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory.shift();
        }
        // Clear redo stack on new action
        this.redoStack = [];
    }

    /**
     * Check if can undo
     */
    canUndo(): boolean {
        return this.stateHistory.length > 0;
    }

    /**
     * Check if can redo
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Undo to previous state
     */
    undo(): void {
        const previousState = this.stateHistory.pop();
        if (previousState) {
            // Push current state to redo stack
            this.redoStack.push({ ...this.state });

            const oldState = { ...this.state };
            this.state = previousState;

            const detail: StateChangeDetail = {
                oldState,
                newState: this.state,
                changes: this.state // All properties changed on undo
            };

            this.dispatchEvent(createAppEvent('statechange', detail));
        }
    }

    /**
     * Redo previously undone state
     */
    redo(): void {
        const nextState = this.redoStack.pop();
        if (nextState) {
            // Push current state back to history
            this.stateHistory.push({ ...this.state });

            const oldState = { ...this.state };
            this.state = nextState;

            const detail: StateChangeDetail = {
                oldState,
                newState: this.state,
                changes: this.state // All properties changed on redo
            };

            this.dispatchEvent(createAppEvent('statechange', detail));
        }
    }
}

/**
 * Global application instance
 */
export const app = new App();

/**
 * Helper to check if state changes affect dithering
 */
export function shouldRedither(changes: StateUpdate): boolean {
    const ditherTriggers: (keyof AppState)[] = [
        'algorithm',
        'options',
        'palette',
        'adjustments',
        'sourceImage',
        'mode',
        'colorMatch',
        'pixelScale',
        'levels',
        'postEffect',
        'effectColor',
        'layer2Adjustments'
    ];

    return ditherTriggers.some(key => key in changes);
}

/**
 * Helper to check if state changes affect viewport
 */
export function shouldUpdateViewport(changes: StateUpdate): boolean {
    const viewportTriggers: (keyof AppState)[] = [
        'ditheredImage',
        'sourceImage',
        'showOriginal',
        'zoom',
        'panX',
        'panY',
        'currentFrame',
        'isVideoMode'
    ];

    return viewportTriggers.some(key => key in changes);
}

/**
 * Helper to check if state changes should invalidate video frame cache
 */
export function shouldInvalidateVideoCache(changes: StateUpdate): boolean {
    const cacheTriggers: (keyof AppState)[] = [
        'algorithm',
        'options',
        'palette',
        'customPalette',
        'colorMatch',
        'adjustments',
        'pixelScale',
        'levels',
        'mode',
        'postEffect',
        'effectColor',
        'layer2Adjustments'
    ];

    return cacheTriggers.some(key => key in changes);
}

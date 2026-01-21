# Ditherme Agent Reference

A concise reference for AI agents working on this codebase.

## Quick Facts

- **Stack**: TypeScript, Vite, Electron, WASM (libdither)
- **UI Framework**: None - Vanilla TS with native DOM APIs
- **State**: Centralized EventTarget-based store (`src/app.ts`)
- **Dithering**: 100+ algorithms via WASM + JS fallbacks

---

## Directory Structure

```
src/
├── main.ts              # Entry point, initializes UI + handlers
├── app.ts               # Centralized state management (singleton)
├── types/               # TypeScript type definitions
├── algorithms/          # Dithering algorithm implementations
│   ├── index.ts         # Algorithm registry + WASM routing
│   ├── error-diffusion.ts
│   ├── ordered.ts
│   └── threshold.ts
├── engine/              # Core processing logic
│   ├── dither.ts        # Dithering orchestrator (debounce, cache)
│   ├── wasm-dither.ts   # WASM module bindings
│   ├── image.ts         # Image load/export/clipboard
│   ├── color.ts         # Color space conversions + distance
│   ├── adjustments.ts   # Brightness/contrast/gamma/saturation
│   ├── image-cache.ts   # LRU cache for dithered results
│   └── video/           # Video processing subsystem
│       ├── video-manager.ts  # Main orchestrator
│       ├── extractor.ts      # Frame extraction
│       ├── encoder.ts        # Video encoding
│       ├── frame-cache.ts    # Frame caching
│       └── capability.ts     # Feature detection
├── ui/                  # UI components
│   ├── sidebar.ts       # Algorithm selection + search
│   ├── viewport.ts      # Canvas display + zoom/pan
│   ├── adjustments.ts   # Adjustment sliders
│   ├── palette.ts       # Palette selection + editor
│   ├── save-palette-dialog.ts
│   ├── export-palette-dialog.ts
│   ├── batch-dialog.ts
│   ├── settings-dialog.ts
│   ├── help-dialog.ts
│   └── video/           # Video-specific UI
│       ├── timeline.ts
│       ├── export-dialog.ts
│       └── progress-modal.ts
├── utils/               # Utilities
│   ├── settings.ts      # User settings (localStorage)
│   ├── palette-storage.ts   # Saved palettes (localStorage)
│   ├── palette-export.ts    # Export to JSON/GPL/HEX/PAL
│   └── electron-bridge.ts   # Electron IPC
├── workers/             # Web Workers
│   ├── worker-pool.ts   # Generic worker pool
│   └── video-processor.worker.ts
├── data/
│   └── palettes/presets.ts  # 14 built-in palettes
└── styles/main.css      # All styles
```

---

## State Management

### The App Singleton (`src/app.ts`)

```typescript
import { app } from './app.ts';

// Read state (returns immutable copy)
const state = app.getState();

// Update state (triggers events)
app.setState({ algorithm: 'floyd-steinberg' });
app.setState({ brightness: 20 }, true);  // true = save to undo history

// Listen for changes
app.on('statechange', (e) => {
    const { changes, previousState } = e.detail;
    if ('algorithm' in changes) { /* react */ }
});

// Other events: 'imageloaded', 'ditherstart', 'dithercomplete', 'videoloaded'
```

### Key State Properties

| Property | Type | Description |
|----------|------|-------------|
| `sourceImage` | `ImageData \| null` | Original loaded image |
| `ditheredImage` | `ImageData \| null` | Processed result |
| `algorithm` | `string` | Current algorithm ID |
| `mode` | `'mono' \| 'color'` | Dithering mode |
| `palette` | `Palette` | Active color palette |
| `colorMatch` | `ColorMatchMethod` | Color distance algorithm |
| `brightness/contrast/gamma/saturation` | `number` | Adjustments |
| `pixelScale` | `number` | 1-16, block size |
| `levels` | `number` | 0 or 2-256, posterization |

---

## Coding Conventions

### Must Follow

1. **No UI frameworks** - Vanilla TS only, native DOM APIs
2. **Strict TypeScript** - No `any`, explicit types on functions
3. **Immutable state** - Never mutate, always `setState()`
4. **Event-driven** - Components subscribe to state changes
5. **Small functions** - Single responsibility
6. **Functional style** - Prefer pure functions over classes

### Patterns Used

- **Singleton**: `app`, `settings`, `paletteStorage`, `imageCache`, `videoManager`
- **Observer**: State changes via `EventTarget.addEventListener`
- **Strategy**: Algorithm implementations, color distance methods
- **Facade**: Algorithm registry routes to WASM or JS

### Naming

- Algorithm IDs: `kebab-case` (e.g., `floyd-steinberg`, `ordered-bayer8`)
- Init functions: `init*()` prefix
- Event handlers: `handle*()` prefix
- Type definitions: `PascalCase`

---

## Adding Features

### Adding a New Dialog

```typescript
// src/ui/my-dialog.ts
export function showMyDialog(): Promise<{ confirmed: boolean; data?: T }> {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal my-dialog';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Title</h3>
                <!-- form fields -->
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel">Cancel</button>
                    <button class="btn btn-primary" id="confirm">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handle escape key
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { close(); resolve({ confirmed: false }); }
        };
        document.addEventListener('keydown', handleKeydown);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { close(); resolve({ confirmed: false }); }
        });

        function close() {
            modal.remove();
            document.removeEventListener('keydown', handleKeydown);
        }
    });
}
```

### Adding localStorage Persistence

Follow `src/utils/settings.ts` or `src/utils/palette-storage.ts` pattern:

```typescript
const STORAGE_KEY = 'ditherme_myfeature';

class MyManager extends EventTarget {
    private data: MyData;

    constructor() {
        super();
        this.data = this.load();
    }

    private load(): MyData {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) { console.warn('Load failed:', e); }
        return DEFAULT_DATA;
    }

    private save(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.dispatchEvent(new CustomEvent('mychange', { detail: this.data }));
    }

    onChange(callback: (data: MyData) => void): () => void {
        const handler = (e: Event) => callback((e as CustomEvent).detail);
        this.addEventListener('mychange', handler);
        return () => this.removeEventListener('mychange', handler);
    }
}

export const myManager = new MyManager();
```

### Adding a New Algorithm

1. Add algorithm ID to `src/types/algorithms.ts`
2. Add to registry in `src/algorithms/index.ts`:
```typescript
{ id: 'my-algorithm', name: 'My Algorithm', category: 'Other', modes: ['mono', 'color'] }
```
3. Add routing in the `dispatchDither()` function
4. Implement in appropriate file or WASM

### Adding New State

1. Add to `AppState` interface in `src/types/state.ts`
2. Add default value in `src/app.ts` constructor
3. Use `app.setState()` to update
4. Listen via `app.on('statechange', ...)`

---

## Key Implementation Details

### Dithering Pipeline (`src/engine/dither.ts`)

```
User changes settings
    ↓
triggerDither() called
    ↓
Debounce (50ms) to batch rapid changes
    ↓
Check image cache (settings hash)
    ↓ (cache miss)
processImage():
    1. applyAdjustments() - brightness/contrast/gamma/saturation
    2. downscaleImage() - if pixelScale > 1
    3. reducePalette() - if levels set
    4. ditherAsync() - route to WASM or JS algorithm
    5. upscaleImage() - restore original resolution
    ↓
Cache result, emit 'dithercomplete'
```

### WASM Integration (`src/engine/wasm-dither.ts`)

- Located at `public/wasm/libdither.{js,wasm}`
- Loaded async on startup
- **Critical**: Set `correctGamma = 0` (input is sRGB)
- **Critical**: Zero output buffer before each call
- Fallback to JS if WASM fails

```typescript
import { wasmDither, isWasmLoaded } from './engine/wasm-dither.ts';

if (isWasmLoaded()) {
    result = await wasmDither.dither(imageData, algorithm, options);
}
```

### Video Processing (`src/engine/video/`)

- **WebCodecs** for modern browsers (Chrome, Edge)
- **FFmpeg.wasm** fallback for Safari
- Frame cache invalidated on settings change (hash-based)
- Worker pool for parallel frame dithering

---

## UI Component Locations

| Feature | File | HTML Element ID |
|---------|------|-----------------|
| Algorithm list | `ui/sidebar.ts` | `#algorithm-list` |
| Algorithm search | `ui/sidebar.ts` | `#algorithm-search` |
| Mode tabs (Mono/Color) | `ui/sidebar.ts` | `.mode-tabs` |
| Canvas viewport | `ui/viewport.ts` | `#main-canvas` |
| Zoom controls | `ui/viewport.ts` | `#zoom-display` |
| Brightness slider | `ui/adjustments.ts` | `#brightness` |
| Contrast slider | `ui/adjustments.ts` | `#contrast` |
| Gamma slider | `ui/adjustments.ts` | `#gamma` |
| Saturation slider | `ui/adjustments.ts` | `#saturation` |
| Pixel scale | `ui/adjustments.ts` | `#pixel-scale` |
| Levels | `ui/adjustments.ts` | `#levels` |
| Palette select | `ui/palette.ts` | `#builtin-palette` |
| Palette swatches | `ui/palette.ts` | `#palette-swatches` |
| Custom editor | `ui/palette.ts` | `#custom-palette-editor` |
| Saved palettes | `ui/palette.ts` | `#saved-palette-select` |
| Color match | `ui/palette.ts` | `#color-match` |
| Video timeline | `ui/video/timeline.ts` | `#timeline-container` |

---

## localStorage Keys

| Key | Manager | Purpose |
|-----|---------|---------|
| `ditherme_settings` | `utils/settings.ts` | User preferences |
| `ditherme_palettes` | `utils/palette-storage.ts` | Saved custom palettes (max 50) |

---

## CSS Architecture

All styles in `src/styles/main.css`:
- CSS variables for theming (`:root`)
- BEM-ish naming (`.panel-header`, `.btn-primary`)
- Modal styles: `.modal`, `.modal-content`, `.modal-actions`
- Dialog-specific: `.save-palette-dialog`, `.export-dialog`, etc.

---

## Event Reference

| Event | Emitted By | Detail |
|-------|------------|--------|
| `statechange` | `app.ts` | `{ changes, previousState }` |
| `imageloaded` | `main.ts` | `{ imageData }` |
| `ditherstart` | `dither.ts` | `{}` |
| `dithercomplete` | `dither.ts` | `{ time }` |
| `dithererror` | `dither.ts` | `{ error }` |
| `videoloaded` | `video-manager.ts` | `{ metadata }` |
| `videoframechange` | `video-manager.ts` | `{ frame }` |
| `paletteschange` | `palette-storage.ts` | `{ palettes }` |
| `settingschange` | `settings.ts` | `{ settings }` |

---

## Common Tasks

### Read current palette colors
```typescript
const state = app.getState();
const colors = state.palette.colors; // Color[]
```

### Trigger re-dither
```typescript
import { triggerDither } from './engine/dither.ts';
triggerDither();
```

### Check if video mode
```typescript
const state = app.getState();
if (state.videoSource) { /* video mode */ }
```

### Export current image
```typescript
import { exportImage } from './engine/image.ts';
exportImage('png', 1.0); // format, quality
```

### Add menu action
In `main.ts`, add to `initMenu()`:
```typescript
case 'my-action':
    handleMyAction();
    break;
```

---

## Testing Checklist

When modifying features, verify:
- [ ] Works in Mono mode
- [ ] Works in Color mode
- [ ] Works with WASM algorithms
- [ ] Works with JS fallback algorithms
- [ ] Settings persist on refresh
- [ ] Undo/redo functions correctly
- [ ] Video mode (if applicable)
- [ ] No TypeScript errors (`npm run build`)

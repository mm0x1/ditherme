# Ditherista Rebuild - AI Agent Prompt

## Project Overview

Build a professional cross-platform dithering application called **Ditherista** that runs both as a web app and desktop application. The app converts images and videos into dithered artwork using 100+ dithering algorithms with full color palette control.

**Target Stack:**
- **Language:** TypeScript (strict but practical)
- **Frontend:** Vanilla TypeScript + Canvas API + WebGL (for GPU acceleration)
- **UI Framework:** None - Pure Vanilla TS (like Photopea's approach)
- **Performance-Critical Code:** WebAssembly (compiled from C or Rust)
- **Desktop Packaging:** Electron (for downloadable offline executables)
- **Build Tool:** Vite (zero-config TypeScript support)
- **Architecture:** Web-first (works in browser), wrapped for desktop distribution

**Platforms:** macOS, Linux, Windows (in that priority order)

**IMPORTANT - No UI Frameworks:**
Do NOT use React, Vue, Angular, or similar frameworks. Use plain TypeScript with:
- Native DOM APIs (`document.createElement`, `querySelector`, etc.)
- Custom Events for component communication
- Web Components for reusable UI elements (optional)
- ES6 Classes for organizing code

**Why Vanilla JS:**
1. Canvas-based apps don't benefit from Virtual DOM
2. Zero framework overhead = faster load and runtime
3. Direct DOM access for real-time preview updates
4. Photopea (professional image editor) uses this approach successfully
5. Smaller bundle size for web distribution

---

## Core Architecture

### File Structure
```
ditherista/
├── src/
│   ├── index.html
│   ├── main.ts                      # App initialization
│   ├── app.ts                       # App state and event bus
│   ├── types/                       # TypeScript type definitions
│   │   ├── index.ts                 # Re-export all types
│   │   ├── algorithms.ts            # Algorithm type unions
│   │   ├── state.ts                 # App state interfaces
│   │   ├── palette.ts               # Color/palette types
│   │   └── options.ts               # Algorithm options interfaces
│   ├── ui/
│   │   ├── sidebar.ts               # Dither algorithm selector
│   │   ├── viewport.ts              # Canvas viewport with zoom/pan
│   │   ├── adjustments.ts           # Brightness/contrast/gamma controls
│   │   ├── palette.ts               # Color palette editor
│   │   ├── timeline.ts              # Video timeline scrubber
│   │   ├── dialogs.ts               # Modal dialogs
│   │   └── components/              # Reusable Web Components
│   │       ├── slider.ts
│   │       ├── color-swatch.ts
│   │       └── tree-view.ts
│   ├── engine/
│   │   ├── dither.ts                # Dithering orchestration
│   │   ├── color.ts                 # Color space conversions
│   │   ├── palette.ts               # Palette generation/quantization
│   │   ├── image.ts                 # Image loading/processing
│   │   ├── video.ts                 # Video frame extraction
│   │   └── wasm-loader.ts           # WASM module loader
│   ├── algorithms/
│   │   ├── index.ts                 # Algorithm registry
│   │   ├── error-diffusion.ts
│   │   ├── ordered.ts
│   │   ├── riemersma.ts
│   │   ├── pattern.ts
│   │   ├── threshold.ts
│   │   ├── dbs.ts
│   │   ├── dot-diffusion.ts
│   │   ├── grid.ts
│   │   └── variable-error.ts
│   ├── data/
│   │   ├── matrices/                # Dither matrices data
│   │   │   ├── bayer.ts
│   │   │   ├── blue-noise.ts
│   │   │   ├── clustered.ts
│   │   │   └── error-kernels.ts
│   │   └── palettes/                # Built-in palettes
│   │       └── presets.ts
│   ├── workers/
│   │   ├── dither.worker.ts         # Dithering web worker
│   │   └── video.worker.ts          # Video processing worker
│   ├── utils/
│   │   ├── color-match.ts           # Color matching algorithms
│   │   ├── quantize.ts              # Color quantization
│   │   ├── cache.ts                 # Dither result caching
│   │   └── memory.ts                # Memory management
│   ├── styles/
│   │   └── main.css
│   └── assets/
│       └── icons/
├── wasm/                            # WebAssembly source (Rust or C)
│   ├── src/
│   │   ├── lib.rs                   # Main WASM entry
│   │   ├── dither.rs                # Core dithering algorithms
│   │   ├── color.rs                 # Color space math
│   │   └── quantize.rs              # Color quantization
│   └── Cargo.toml
├── electron/                        # Electron wrapper
│   ├── main.ts                      # Electron main process
│   ├── preload.ts                   # Preload scripts
│   └── tsconfig.json                # Electron-specific TS config
├── dist/                            # Built web app
├── release/                         # Electron builds
├── package.json
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
└── README.md
```

### TypeScript Configuration

```json
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "jsx": "preserve",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "types": ["vite/client"],
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@types/*": ["src/types/*"],
            "@ui/*": ["src/ui/*"],
            "@engine/*": ["src/engine/*"],
            "@algorithms/*": ["src/algorithms/*"]
        }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@types': resolve(__dirname, 'src/types'),
            '@ui': resolve(__dirname, 'src/ui'),
            '@engine': resolve(__dirname, 'src/engine'),
            '@algorithms': resolve(__dirname, 'src/algorithms')
        }
    },
    build: {
        target: 'es2022',
        outDir: 'dist'
    },
    worker: {
        format: 'es'
    }
});
```

### Core Type Definitions

```typescript
// src/types/algorithms.ts
export type MonoAlgorithm =
    // Error Diffusion
    | 'floyd-steinberg'
    | 'jarvis-judice-ninke'
    | 'stucki'
    | 'burkes'
    | 'sierra3'
    | 'sierra2'
    | 'sierra-lite'
    | 'atkinson'
    | 'stevenson-arce'
    // Ordered
    | 'ordered-bayer2'
    | 'ordered-bayer4'
    | 'ordered-bayer8'
    | 'ordered-bayer16'
    | 'ordered-blue-noise'
    // ... all 100+ algorithms
    | 'threshold'
    | 'dbs'
    | 'riemersma-hilbert';

export type ColorAlgorithm =
    | 'floyd-steinberg-color'
    | 'ordered-bayer8-color'
    // ... color variants

export type Algorithm = MonoAlgorithm | ColorAlgorithm;

// src/types/palette.ts
export interface Color {
    r: number;  // 0-255
    g: number;
    b: number;
    a?: number; // Optional alpha
}

export interface LABColor {
    l: number;
    a: number;
    b: number;
}

export type ColorMatchMethod =
    | 'euclidean'
    | 'ciede2000'
    | 'cie94'
    | 'cie76'
    | 'luminance'
    | 'hsv'
    | 'linear'
    | 'srgb-ccir'
    | 'linear-ccir'
    | 'tetrapal';

export type QuantizationMethod =
    | 'median-cut'
    | 'wu'
    | 'neuquant'
    | 'kmeans';

export interface Palette {
    name: string;
    colors: Color[];
}

// src/types/options.ts
export interface BaseOptions {
    serpentine?: boolean;
}

export interface OrderedOptions extends BaseOptions {
    jitter?: number;       // 0.0 - 1.0
    matrixSize?: number;
}

export interface ThresholdOptions extends BaseOptions {
    threshold?: number;    // 0.0 - 1.0
    auto?: boolean;
    noise?: number;        // 0.0 - 1.0
}

export interface DBSOptions extends BaseOptions {
    formula?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    maxIterations?: number;
}

export interface GridOptions extends BaseOptions {
    gridWidth?: number;
    gridHeight?: number;
    minPixels?: number;
    alternativeMode?: boolean;
}

export type AlgorithmOptions =
    | BaseOptions
    | OrderedOptions
    | ThresholdOptions
    | DBSOptions
    | GridOptions;

// src/types/state.ts
export interface ImageAdjustments {
    brightness: number;    // -100 to 100
    contrast: number;      // -100 to 100
    gamma: number;         // 0.1 to 3.0
    saturation?: number;   // -100 to 100 (color mode only)
}

export interface AppState {
    // Images
    sourceImage: ImageData | null;
    ditheredImage: ImageData | null;
    originalFileName: string | null;

    // Algorithm
    mode: 'mono' | 'color';
    algorithm: Algorithm;
    options: AlgorithmOptions;

    // Palette
    palette: Palette;
    colorMatch: ColorMatchMethod;
    quantization: QuantizationMethod;

    // Adjustments
    adjustments: ImageAdjustments;

    // Video
    videoFrames: ImageData[] | null;
    currentFrame: number;
    isProcessingVideo: boolean;

    // UI
    zoom: number;
    panX: number;
    panY: number;
    showOriginal: boolean;
}

// src/types/index.ts - Re-export everything
export * from './algorithms';
export * from './palette';
export * from './options';
export * from './state';
```

### Technology Decisions

1. **TypeScript** - Strict but practical. Catches bugs at compile time, self-documenting code.

2. **Vanilla TypeScript** - No frameworks (React, Vue, etc.). Keep it simple and fast like Photopea.

2. **Canvas API** - Primary rendering. Use OffscreenCanvas for Web Workers when available.

3. **WebGL/GLSL** - GPU-accelerated rendering for:
   - Real-time preview of large images
   - Ordered dithering (parallel pixel operations)
   - Color space conversions

4. **WebAssembly** - For CPU-intensive operations:
   - Error diffusion algorithms (sequential, hard to parallelize)
   - DBS (Direct Binary Search) - very computationally intensive
   - Color quantization (median cut, Wu, KD-tree)

5. **Web Workers** - Background processing to keep UI responsive

6. **IndexedDB** - Cache dithered results locally

7. **FFmpeg.wasm** - Video frame extraction and encoding

---

## Feature Specification

### 1. Dithering Algorithms

Implement ALL of the following dithering methods:

#### 1.1 Error Diffusion (19 variants)
Sequential pixel processing that distributes quantization error to neighboring pixels.

| Name | Kernel Description |
|------|-------------------|
| Floyd-Steinberg | Classic 4-pixel diffusion (7,3,5,1)/16 |
| Jarvis-Judice-Ninke | 12-pixel diffusion, smoother results |
| Stucki | 12-pixel, similar to JJN |
| Burkes | 7-pixel diffusion |
| Sierra 3 | 10-pixel diffusion |
| Sierra 2-row | 7-pixel diffusion |
| Sierra Lite | 3-pixel diffusion, fast |
| Atkinson | 6-pixel, 3/4 error (Mac classic look) |
| Stevenson-Arce | Hexagonal diffusion pattern |
| Shiau-Fan (1, 2, 3) | Variants with different weights |
| Fake Floyd-Steinberg | 3-pixel simplified |
| XOT | Custom variant |
| Diagonal | Diagonal diffusion pattern |
| Diffusion 1D | Single row diffusion |
| Diffusion 2D | Two-dimensional diffusion |
| Steve Pigeon | Custom variant |
| Robert Kist | Custom variant |

**Parameters:**
- `serpentine`: boolean - Alternate scan direction each row (reduces artifacts)

#### 1.2 Ordered Dithering (45+ matrices)
Threshold-based dithering using pre-computed matrices.

| Category | Matrices |
|----------|----------|
| Bayer | 2x2, 3x3, 4x4, 8x8, 16x16, 32x32 |
| Blue Noise | 128x128 pre-computed |
| Clustered Dot | 11 variants (v1-v11) |
| Dispersed Dots | v1, v2, Ulichney Void |
| Non-Rectangular | v1, v2, v3, v4 |
| Ulichney | Bayer 5x5, Standard, Clustered |
| Diagonal | Diagonal ordered patterns |
| ImageMagick | 5x5, 6x6, 7x7 circles; 4x4, 6x6, 8x8 at 45-deg |
| Variable | 2x2, 4x4 with step parameter |
| Interleaved Gradient | Configurable a, b, c parameters |

**Parameters:**
- `jitter`: 0.0-1.0 - Add randomness to threshold
- `step`: For variable matrices

#### 1.3 Riemersma Dithering (8 space-filling curves)
Error diffusion along space-filling curves for reduced directional artifacts.

| Curve | Description |
|-------|-------------|
| Hilbert | Classic Hilbert curve |
| Hilbert Modified | Improved Hilbert variant |
| Peano | Peano curve |
| Fass0, Fass1, Fass2 | Fass curve variants |
| Gosper | Gosper flowsnake curve |
| Fass Spiral | Spiral variant |

**Parameters:**
- `modified`: boolean - Use modified algorithm

#### 1.4 Pattern Dithering (6 patterns)
Fixed pattern replacement based on intensity levels.

| Pattern | Size |
|---------|------|
| Pattern 2x2 | 5 intensity levels |
| Pattern 3x3 (3 variants) | 10 intensity levels |
| Pattern 4x4 | 17 intensity levels |
| Pattern 5x2 | 11 intensity levels |

#### 1.5 Dot Diffusion (9 variants)
Class matrix-based diffusion.

| Name | Matrix Size |
|------|-------------|
| Knuth | 8x8 |
| Mini-Knuth | 4x4 |
| Optimized Knuth | 8x8 |
| Mese-Vaidyanathan | 8x8, 16x16 |
| Guo-Liu | 8x8, 16x16 |
| Spiral | Spiral order |
| Inverted Spiral | Reverse spiral |

#### 1.6 Dot Lippens (6 variants)
Philips research dithering methods.

| Name |
|------|
| Li1, Li2, Li3 |
| Guo |
| Mese |
| Knuth |

#### 1.7 Variable Error Diffusion (2 variants)
Adaptive error diffusion with variable coefficients.

| Name | Description |
|------|-------------|
| Ostromoukhov | Locally-adaptive coefficients |
| Zhou-Fang | Pattern-based adaptation |

**Parameters:**
- `serpentine`: boolean

#### 1.8 Threshold
Simple threshold-based conversion.

**Parameters:**
- `threshold`: 0.0-1.0 (default: 0.5)
- `auto`: boolean - Calculate optimal threshold
- `noise`: 0.0-1.0 - Add noise before thresholding

#### 1.9 Direct Binary Search (DBS)
Iterative optimization for highest quality (slow).

**Parameters:**
- `formula`: 1-8 - Different optimization formulas
- `complexity`: Iteration limit

**Note:** Show progress dialog for images > 256x256. This algorithm is VERY slow.

#### 1.10 Grid Dithering
Block-based averaging.

**Parameters:**
- `gridWidth`: pixels
- `gridHeight`: pixels
- `minPixels`: threshold
- `alternativeMode`: boolean

#### 1.11 Kacker-Allebach
Research-based dithering method.

**Parameters:**
- `randomize`: boolean

---

### 2. Color Matching Methods (10 modes)

Implement these color distance/matching algorithms:

| Method | Description | Speed |
|--------|-------------|-------|
| Luminance | Brightness-only matching | Fast |
| sRGB | Euclidean distance in sRGB | Fast |
| Linear | Euclidean in linear RGB | Fast |
| HSV | Hue-Saturation-Value distance | Medium |
| sRGB CCIR | sRGB with perceptual weighting | Fast |
| Linear CCIR | Linear RGB with perceptual weighting | Fast |
| LAB76 | CIE LAB 1976 Delta-E | Medium |
| LAB94 | CIE LAB 1994 Delta-E | Medium |
| LAB2000 | CIE LAB 2000 Delta-E (most accurate) | Slow |
| Tetrapal | Optimized for ordered dithering | Fast |

**LAB Parameters:**
- `hueWeight`: default 0.91
- `chromaWeight`: default 0.84
- `valueWeight`: default 0.96
- `illuminant`: One of 14 standard illuminants (D65 default)

**Illuminants:**
D93, D75, D65, D55, D50, A, B, C, E, F1, F2, F3, F7, F11

---

### 3. Color Quantization (3 algorithms)

For generating palettes from images:

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| Median Cut | Recursive color space subdivision | General use |
| Wu | Optimized variance minimization | Speed + quality |
| KD-Tree | k-d tree nearest neighbor | Accuracy |

**Parameters:**
- `paletteSize`: 2-256 colors
- `includeBlackWhite`: boolean
- `includeRGBPrimaries`: boolean
- `includeCMY`: boolean
- `uniqueOnly`: boolean - Remove duplicates

---

### 4. Palette System

#### 4.1 Built-in Palettes
Include these preset palettes:

| Name | Colors | Description |
|------|--------|-------------|
| Mono | 2 | Black and white |
| CGA | 4 | IBM CGA |
| EGA | 16 | IBM EGA |
| Mac 16 | 16 | Classic Macintosh |
| Windows 16 | 16 | Windows 3.1 |
| Pico-8 | 16 | Pico-8 fantasy console |
| C64 | 16 | Commodore 64 |
| NES | 54 | Nintendo NES |
| Game Boy | 4 | Original Game Boy (green) |
| Game Boy Pocket | 4 | Game Boy Pocket (gray) |
| Grayscale 4 | 4 | 4-level grayscale |
| Grayscale 8 | 8 | 8-level grayscale |
| Grayscale 16 | 16 | 16-level grayscale |
| Web Safe | 216 | Web-safe colors |

#### 4.2 Palette Features
- **Load from file:** Paint.NET format (.txt), .pal files
- **Generate from image:** Use quantization algorithms
- **Custom editing:** Click colors to modify with color picker
- **Copy/paste colors:** Between swatches
- **Drag/drop reorder:** Rearrange palette order
- **Save palette:** Export to Paint.NET format
- **Max colors:** 256

#### 4.3 Mono Palette
- Two colors (foreground/background)
- Defaults to black (#000000) and white (#FFFFFF)
- Customizable via color pickers
- Reset to default button

---

### 5. Image Adjustments

#### 5.1 Common Adjustments
| Parameter | Range | Default |
|-----------|-------|---------|
| Brightness | -100 to +100 | 0 |
| Contrast | -100 to +100 | 0 |
| Gamma | 0.1 to 3.0 | 1.0 |

#### 5.2 Color Mode Additional
| Parameter | Range | Default |
|-----------|-------|---------|
| Saturation | -100 to +100 | 0 |

#### 5.3 UI Controls
- Slider + numeric input for each parameter
- Reset button per parameter
- "Show Original" toggle for comparison
- All adjustments applied before dithering

---

### 6. Video Support

#### 6.1 Supported Formats
- MP4 (H.264)
- WebM (VP8, VP9)
- AVI
- MOV
- MKV

Use **FFmpeg.wasm** for video processing.

#### 6.2 Video Features
- **Frame extraction:** Load video, extract frames
- **Timeline scrubber:** Navigate through frames
- **Frame preview:** Show current frame with dithering applied
- **Batch export:** Dither all frames and re-encode to video
- **Progress tracking:** Show progress during processing
- **Cancellation:** Allow cancelling long operations
- **Preserve metadata:** Keep original FPS, resolution

#### 6.3 Video Processing Pipeline
1. Load video with FFmpeg.wasm
2. Extract frames to ImageData
3. Apply selected dithering to each frame
4. Re-encode frames to video
5. Allow download of result

---

### 7. User Interface

#### 7.1 Layout
```
+----------------------------------------------------------+
|  Menu Bar (File, Edit, Help)                             |
+----------------------------------------------------------+
|          |                              |                |
|  Dither  |                              |  Adjustments   |
|  List    |      Canvas Viewport         |  Panel         |
|  (tree)  |      (zoom/pan)              |                |
|          |                              +----------------+
|          |                              |                |
|          |                              |  Palette       |
|          |                              |  Panel         |
+----------+------------------------------+----------------+
|  [Timeline for video mode]                               |
+----------------------------------------------------------+
|  Status Bar                                              |
+----------------------------------------------------------+
```

#### 7.2 Sidebar - Dither Selection
- Tree view with collapsible categories
- Tabs: "Mono" | "Color"
- Search/filter functionality
- Keyboard navigation (arrow keys)
- Scroll with mouse wheel
- Shows currently selected algorithm name
- Dynamic parameters panel below list

#### 7.3 Viewport
- Canvas-based image display
- **Zoom:** 10% - 500% (mouse wheel, +/- keys)
- **Pan:** Click and drag when zoomed
- **Fit to view:** Double-click or press '.'
- **Real-time preview:** Update as parameters change
- Checkerboard background for transparency

#### 7.4 Adjustments Panel
- Grouped sliders with numeric inputs
- Instant preview on change
- Reset buttons
- Separate panels for mono/color mode

#### 7.5 Palette Panel
- Grid of color swatches
- Palette source dropdown (Built-in, Load, Generate, Custom)
- Quantization settings (when generating)
- Color match method dropdown
- LAB weight sliders (when using LAB)
- Color picker for editing

#### 7.6 Timeline (Video Mode)
- Horizontal scrubber
- Frame counter display
- Play/pause (optional)
- Frame step buttons

#### 7.7 Menus

**File:**
- Open Image (Ctrl/Cmd+O)
- Open Video
- Save Image (Ctrl/Cmd+S)
- Save As...
- Export Video
- Batch Dither...
- Exit

**Edit:**
- Copy (Ctrl/Cmd+C)
- Paste (Ctrl/Cmd+V)
- Preferences/Settings

**Help:**
- Documentation
- About
- Check for Updates

#### 7.8 Dialogs

**Settings Dialog:**
- Cache management (clear, size display)
- Default export format
- Performance (thread count hint)
- Update checking toggle

**Batch Dither Dialog:**
- Source folder selection
- Output folder selection
- Filename prefix/suffix
- Format selection
- Progress bar
- Results summary

**About Dialog:**
- App name and version
- Credits
- License info
- Links

---

### 8. Input/Output

#### 8.1 Image Formats

**Input:**
- PNG (with alpha)
- JPEG
- GIF
- BMP

**Output:**
- PNG (recommended, preserves transparency)
- JPEG (with quality setting)
- GIF
- BMP

#### 8.2 Drag & Drop
- Drop image files onto viewport to load
- Drop onto desktop/folder to save

#### 8.3 Clipboard
- Copy: Current dithered image to clipboard
- Paste: Load image from clipboard

#### 8.4 Size Limits
- Maximum resolution: 4096 x 4096 pixels
- Show warning for very large images
- Show progress for slow algorithms (DBS)

---

### 9. Performance Optimizations

#### 9.1 Caching
- Cache dithered results by hash (algorithm + params + image hash)
- Use IndexedDB for persistence
- Clear cache when adjustments change
- Cache size management

#### 9.2 Web Workers
- Offload dithering to Web Worker
- Keep UI responsive
- Show progress indicators
- Support cancellation

#### 9.3 WebAssembly
Implement in WASM for performance:
- All error diffusion algorithms
- DBS algorithm
- Color quantization
- LAB color conversions

#### 9.4 WebGL
Use GPU for:
- Ordered dithering (parallel threshold comparison)
- Color space conversions
- Real-time preview scaling
- Large image handling

#### 9.5 Memory Management
- Reuse buffers for video processing
- Release ImageData when not needed
- Limit concurrent operations

---

### 10. Electron Integration

#### 10.1 Main Process
```javascript
// electron/main.js
const { app, BrowserWindow, Menu, dialog } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('../dist/index.html');
}

// Native file dialogs
// Native menus
// Auto-updater integration
```

#### 10.2 Features
- Native file open/save dialogs
- Native menus
- Auto-updater (electron-updater)
- Single instance lock
- Remember window position/size

#### 10.3 Build Targets
- macOS: .dmg installer, universal binary (Intel + Apple Silicon)
- Linux: AppImage, .deb
- Windows: NSIS installer, portable .exe

---

## 11. Performance Considerations & Solutions

### CRITICAL: JavaScript Performance Problems

JavaScript is **10-100x slower** than C/Rust for pixel manipulation. This is a known limitation that MUST be addressed for a usable application.

#### Performance Problem Areas

| Operation | JS Speed | Required Speed | Solution |
|-----------|----------|----------------|----------|
| Error diffusion (1080p) | ~3000ms | <100ms | WebAssembly |
| Ordered dithering (1080p) | ~500ms | <50ms | WebGL shader |
| DBS algorithm (512x512) | ~60000ms | <5000ms | WebAssembly + Web Worker |
| Color quantization (1080p) | ~2000ms | <200ms | WebAssembly |
| LAB color conversion | ~1500ms | <100ms | WebGL or WASM |
| Video frame processing | ~3000ms/frame | <100ms/frame | All optimizations |

### Solution 1: WebAssembly (WASM)

#### What to Port to WASM

**MUST port (unusable without):**
- All error diffusion algorithms
- DBS (Direct Binary Search)
- Variable error diffusion (Ostromoukhov, Zhou-Fang)
- Color quantization (Median Cut, Wu, KD-Tree)
- LAB color space conversions

**SHOULD port (noticeably slow):**
- Riemersma dithering
- Dot diffusion algorithms
- Pattern dithering

**CAN keep in JS (fast enough):**
- Threshold dithering
- UI logic
- File I/O

#### WASM Implementation Options

**Option A: Compile existing libdither C code with Emscripten (RECOMMENDED)**

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest

# Compile libdither to WASM
emcc libdither/src/libdither/*.c \
  -O3 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_dither_floyd_steinberg", "_dither_ordered", ...]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -o dist/libdither.js
```

**Advantages:**
- All 100+ algorithms already implemented and tested
- Proven correctness (matches original app output)
- Fastest path to working app

**Option B: Rewrite in Rust and compile to WASM**

```rust
// src/wasm/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn floyd_steinberg(
    pixels: &mut [u8],
    width: u32,
    height: u32,
    palette: &[u8],
    serpentine: bool
) {
    // Rust implementation
}
```

```bash
# Build with wasm-pack
wasm-pack build --target web
```

**Advantages:**
- Modern, safe code
- Better tooling
- Easier to maintain/extend

#### WASM Integration Pattern

```javascript
// js/engine/wasm-loader.js
let wasmModule = null;

export async function initWasm() {
    if (wasmModule) return wasmModule;

    // Load WASM module
    const response = await fetch('/wasm/libdither.wasm');
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {
        env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 4096 })
        }
    });

    wasmModule = instance.exports;
    return wasmModule;
}

// js/algorithms/error-diffusion.js
import { initWasm } from '../engine/wasm-loader.js';

export async function floydSteinberg(imageData, palette, options) {
    const wasm = await initWasm();

    // Copy image data to WASM memory
    const ptr = wasm.alloc(imageData.data.length);
    new Uint8Array(wasm.memory.buffer, ptr, imageData.data.length)
        .set(imageData.data);

    // Call WASM function
    wasm.floyd_steinberg(
        ptr,
        imageData.width,
        imageData.height,
        options.serpentine ? 1 : 0
    );

    // Copy result back
    imageData.data.set(
        new Uint8Array(wasm.memory.buffer, ptr, imageData.data.length)
    );

    wasm.free(ptr);
    return imageData;
}
```

### Solution 2: WebGL/GPU Shaders

#### What to Run on GPU

**Ideal for GPU (embarrassingly parallel):**
- Ordered dithering (each pixel independent)
- Threshold dithering
- Color space conversions
- Image adjustments (brightness, contrast, gamma)
- Nearest color matching

**NOT suitable for GPU (sequential dependencies):**
- Error diffusion (pixels depend on previous pixels)
- DBS (iterative optimization)

#### WebGL Ordered Dithering Shader

```glsl
// shaders/ordered-dither.frag
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_ditherMatrix;
uniform sampler2D u_palette;
uniform vec2 u_imageSize;
uniform vec2 u_matrixSize;
uniform float u_paletteSize;
uniform float u_jitter;

varying vec2 v_texCoord;

// Find nearest color in palette
vec3 nearestColor(vec3 color) {
    float minDist = 999999.0;
    vec3 nearest = vec3(0.0);

    for (float i = 0.0; i < 256.0; i++) {
        if (i >= u_paletteSize) break;
        vec3 palColor = texture2D(u_palette, vec2(i / 256.0, 0.5)).rgb;
        float dist = distance(color, palColor);
        if (dist < minDist) {
            minDist = dist;
            nearest = palColor;
        }
    }
    return nearest;
}

void main() {
    vec2 pixelCoord = v_texCoord * u_imageSize;
    vec2 matrixCoord = mod(pixelCoord, u_matrixSize) / u_matrixSize;

    vec4 color = texture2D(u_image, v_texCoord);
    float threshold = texture2D(u_ditherMatrix, matrixCoord).r;

    // Add jitter
    threshold += (fract(sin(dot(pixelCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * u_jitter;

    // Apply threshold and find nearest
    vec3 adjusted = color.rgb + (threshold - 0.5) * 0.5;
    vec3 result = nearestColor(adjusted);

    gl_FragColor = vec4(result, color.a);
}
```

#### WebGL Integration

```javascript
// js/engine/webgl-dither.js
export class WebGLDitherer {
    constructor(canvas) {
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        this.programs = {};
        this.textures = {};
        this.initShaders();
    }

    async initShaders() {
        this.programs.ordered = await this.createProgram(
            '/shaders/passthrough.vert',
            '/shaders/ordered-dither.frag'
        );
        this.programs.threshold = await this.createProgram(
            '/shaders/passthrough.vert',
            '/shaders/threshold.frag'
        );
    }

    orderedDither(imageData, matrix, palette, options) {
        const gl = this.gl;

        // Upload image as texture
        this.uploadTexture('image', imageData);
        this.uploadTexture('matrix', matrix);
        this.uploadPalette('palette', palette);

        // Set uniforms
        gl.useProgram(this.programs.ordered);
        gl.uniform2f(gl.getUniformLocation(this.programs.ordered, 'u_imageSize'),
            imageData.width, imageData.height);
        gl.uniform2f(gl.getUniformLocation(this.programs.ordered, 'u_matrixSize'),
            matrix.width, matrix.height);
        gl.uniform1f(gl.getUniformLocation(this.programs.ordered, 'u_jitter'),
            options.jitter || 0);

        // Render
        this.render();

        // Read back pixels
        return this.readPixels(imageData.width, imageData.height);
    }
}
```

### Solution 3: Web Workers

#### Worker Architecture

```
Main Thread                    Worker Thread
    │                              │
    ├─── UI rendering              │
    ├─── User input                │
    │                              │
    │    [postMessage]             │
    ├──────────────────────────────►
    │    {cmd: 'dither',           │
    │     imageData, options}      ├─── Heavy computation
    │                              │    (WASM calls)
    │    [postMessage]             │
    ◄──────────────────────────────┤
    │    {result: imageData}       │
    │                              │
    ├─── Display result            │
```

#### Worker Implementation

```javascript
// js/workers/dither-worker.js
importScripts('/wasm/libdither.js');

let wasmReady = false;
let wasm = null;

// Initialize WASM in worker
Module.onRuntimeInitialized = () => {
    wasm = Module;
    wasmReady = true;
    postMessage({ type: 'ready' });
};

self.onmessage = async function(e) {
    const { id, cmd, imageData, options } = e.data;

    if (!wasmReady) {
        postMessage({ id, error: 'WASM not ready' });
        return;
    }

    try {
        let result;

        switch (cmd) {
            case 'floyd-steinberg':
                result = floydSteinberg(imageData, options);
                break;
            case 'ordered':
                result = orderedDither(imageData, options);
                break;
            case 'dbs':
                result = dbs(imageData, options, (progress) => {
                    postMessage({ id, type: 'progress', progress });
                });
                break;
            // ... other algorithms
        }

        postMessage({ id, type: 'result', result }, [result.data.buffer]);
    } catch (error) {
        postMessage({ id, type: 'error', error: error.message });
    }
};

function floydSteinberg(imageData, options) {
    // Call WASM implementation
    const ptr = wasm._malloc(imageData.data.length);
    wasm.HEAPU8.set(imageData.data, ptr);

    wasm._floyd_steinberg(
        ptr,
        imageData.width,
        imageData.height,
        options.serpentine ? 1 : 0
    );

    const result = new ImageData(
        new Uint8ClampedArray(wasm.HEAPU8.subarray(ptr, ptr + imageData.data.length)),
        imageData.width,
        imageData.height
    );

    wasm._free(ptr);
    return result;
}
```

#### Worker Manager

```javascript
// js/engine/worker-manager.js
export class DitherWorkerManager {
    constructor(workerCount = navigator.hardwareConcurrency || 4) {
        this.workers = [];
        this.queue = [];
        this.pending = new Map();
        this.nextId = 0;

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker('/js/workers/dither-worker.js');
            worker.onmessage = (e) => this.handleMessage(i, e.data);
            worker.busy = false;
            this.workers.push(worker);
        }
    }

    async dither(imageData, algorithm, options) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            this.pending.set(id, { resolve, reject });
            this.queue.push({ id, cmd: algorithm, imageData, options });
            this.processQueue();
        });
    }

    processQueue() {
        for (const worker of this.workers) {
            if (!worker.busy && this.queue.length > 0) {
                const task = this.queue.shift();
                worker.busy = true;
                worker.currentTaskId = task.id;
                worker.postMessage(task, [task.imageData.data.buffer]);
            }
        }
    }

    handleMessage(workerIndex, data) {
        const worker = this.workers[workerIndex];
        const pending = this.pending.get(data.id);

        if (data.type === 'result') {
            worker.busy = false;
            pending?.resolve(data.result);
            this.pending.delete(data.id);
            this.processQueue();
        } else if (data.type === 'progress') {
            pending?.onProgress?.(data.progress);
        } else if (data.type === 'error') {
            worker.busy = false;
            pending?.reject(new Error(data.error));
            this.pending.delete(data.id);
            this.processQueue();
        }
    }

    // For video: process multiple frames in parallel
    async ditherFrames(frames, algorithm, options, onProgress) {
        const total = frames.length;
        let completed = 0;

        const results = await Promise.all(
            frames.map(frame =>
                this.dither(frame, algorithm, options).then(result => {
                    completed++;
                    onProgress?.(completed / total);
                    return result;
                })
            )
        );

        return results;
    }
}
```

### Solution 4: Memory Management

#### Problem: Large Images Cause Crashes

A 4096x4096 RGBA image = 67MB of memory. Processing requires:
- Source image: 67MB
- Working copy: 67MB
- Output: 67MB
- WASM heap: 67MB+

Total: **250-300MB per operation**

#### Solutions

```javascript
// js/engine/memory-manager.js
export class MemoryManager {
    constructor() {
        this.bufferPool = new Map();
        this.maxPoolSize = 500 * 1024 * 1024; // 500MB
        this.currentPoolSize = 0;
    }

    // Reuse buffers instead of allocating new ones
    getBuffer(size) {
        const poolKey = this.getSizeKey(size);
        const pool = this.bufferPool.get(poolKey) || [];

        if (pool.length > 0) {
            return pool.pop();
        }

        return new ArrayBuffer(size);
    }

    releaseBuffer(buffer) {
        if (this.currentPoolSize + buffer.byteLength > this.maxPoolSize) {
            return; // Let GC handle it
        }

        const poolKey = this.getSizeKey(buffer.byteLength);
        const pool = this.bufferPool.get(poolKey) || [];
        pool.push(buffer);
        this.bufferPool.set(poolKey, pool);
        this.currentPoolSize += buffer.byteLength;
    }

    getSizeKey(size) {
        // Round up to nearest power of 2 for pooling efficiency
        return Math.pow(2, Math.ceil(Math.log2(size)));
    }

    // Process large images in tiles
    async processInTiles(imageData, processor, tileSize = 512) {
        const { width, height } = imageData;
        const output = new ImageData(width, height);

        for (let y = 0; y < height; y += tileSize) {
            for (let x = 0; x < width; x += tileSize) {
                const tileWidth = Math.min(tileSize, width - x);
                const tileHeight = Math.min(tileSize, height - y);

                const tile = this.extractTile(imageData, x, y, tileWidth, tileHeight);
                const processed = await processor(tile);
                this.insertTile(output, processed, x, y);

                // Allow GC between tiles
                await new Promise(r => setTimeout(r, 0));
            }
        }

        return output;
    }
}
```

### Solution 5: Adaptive Quality / Progressive Rendering

```javascript
// js/engine/progressive-renderer.js
export class ProgressiveRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentOperation = null;
    }

    // Show quick preview, then high quality
    async renderProgressive(imageData, algorithm, options) {
        const operationId = Symbol();
        this.currentOperation = operationId;

        // Phase 1: Instant preview at 1/4 resolution
        const preview = this.downsample(imageData, 4);
        const quickResult = await this.ditherFast(preview, algorithm, options);

        if (this.currentOperation !== operationId) return; // Cancelled
        this.displayScaled(quickResult, 4);

        // Phase 2: Medium quality at 1/2 resolution
        const medium = this.downsample(imageData, 2);
        const mediumResult = await this.dither(medium, algorithm, options);

        if (this.currentOperation !== operationId) return;
        this.displayScaled(mediumResult, 2);

        // Phase 3: Full quality
        const fullResult = await this.dither(imageData, algorithm, options);

        if (this.currentOperation !== operationId) return;
        this.display(fullResult);

        return fullResult;
    }

    // Cancel current operation when user changes parameters
    cancel() {
        this.currentOperation = null;
    }

    downsample(imageData, factor) {
        const newWidth = Math.floor(imageData.width / factor);
        const newHeight = Math.floor(imageData.height / factor);

        const tempCanvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(
            this.imageDataToCanvas(imageData),
            0, 0, newWidth, newHeight
        );

        return ctx.getImageData(0, 0, newWidth, newHeight);
    }
}
```

### Performance Targets

| Operation | Image Size | Target Time | Acceptable Time |
|-----------|-----------|-------------|-----------------|
| Threshold | 1080p | <10ms | <50ms |
| Ordered (GPU) | 1080p | <20ms | <100ms |
| Ordered (CPU) | 1080p | <50ms | <200ms |
| Floyd-Steinberg | 1080p | <100ms | <300ms |
| Error Diffusion (any) | 1080p | <150ms | <500ms |
| Riemersma | 1080p | <200ms | <600ms |
| DBS | 512x512 | <3000ms | <10000ms |
| DBS | 256x256 | <800ms | <2000ms |
| Color quantization | 1080p | <200ms | <500ms |
| Video frame | 1080p | <100ms | <200ms |
| Video export (30fps, 10s) | 1080p | <60s | <120s |

### Performance Testing

```javascript
// js/test/benchmarks.js
export async function runBenchmarks() {
    const testImages = {
        small: await loadTestImage(256, 256),
        medium: await loadTestImage(1920, 1080),
        large: await loadTestImage(4096, 4096)
    };

    const algorithms = [
        'threshold',
        'floyd-steinberg',
        'ordered-bayer8',
        'dbs'
    ];

    const results = [];

    for (const [size, image] of Object.entries(testImages)) {
        for (const algo of algorithms) {
            const times = [];

            // Warm up
            await dither(image, algo);

            // Measure 5 runs
            for (let i = 0; i < 5; i++) {
                const start = performance.now();
                await dither(image, algo);
                times.push(performance.now() - start);
            }

            results.push({
                size,
                algorithm: algo,
                min: Math.min(...times),
                max: Math.max(...times),
                avg: times.reduce((a, b) => a + b) / times.length
            });
        }
    }

    console.table(results);
    return results;
}
```

### Recommended Implementation Strategy

#### Phase 1: Get it Working (Pure JS)
- Implement all algorithms in JavaScript first
- Accept slow performance initially
- Focus on correctness

#### Phase 2: Add WASM (Compile libdither)
- Use Emscripten to compile existing C code
- Replace JS implementations one by one
- Verify output matches original

#### Phase 3: Add WebGL (Parallel algorithms)
- Implement ordered dithering shaders
- Add color space conversion shaders
- Add image adjustment shaders

#### Phase 4: Add Web Workers
- Move all WASM calls to workers
- Implement progress reporting
- Add cancellation support

#### Phase 5: Optimize Memory
- Implement buffer pooling
- Add tile-based processing for huge images
- Add progressive rendering

### Summary: Performance Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │     UI      │  │   Canvas    │  │   WebGL     │         │
│  │  Controls   │  │   Display   │  │  Renderer   │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                           │                  │
│         Ordered Dithering (GPU) ◄─────────┘                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ postMessage
┌───────────────────────▼─────────────────────────────────────┐
│                    Web Workers                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  WebAssembly                         │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │    │
│  │  │  Error    │ │   DBS     │ │  Color    │         │    │
│  │  │ Diffusion │ │ Algorithm │ │  Quant    │         │    │
│  │  └───────────┘ └───────────┘ └───────────┘         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Phase 1: Core Foundation
1. Set up project structure
2. Implement Canvas viewport with zoom/pan
3. Image loading (drag/drop, file picker)
4. Basic threshold dithering
5. Image adjustments (brightness, contrast, gamma)

### Phase 2: Dithering Algorithms (JavaScript)
1. Error diffusion (Floyd-Steinberg first)
2. Ordered dithering (Bayer matrices)
3. All remaining algorithms
4. Algorithm parameter UI

### Phase 3: Color Support
1. Color palettes (built-in presets)
2. Color matching methods
3. Color quantization
4. Palette editor UI
5. Color dithering modes

### Phase 4: WebAssembly Optimization
1. Set up Rust/WASM toolchain
2. Port error diffusion to WASM
3. Port DBS to WASM
4. Port color quantization to WASM
5. Benchmark and optimize

### Phase 5: Video Support
1. Integrate FFmpeg.wasm
2. Video loading and frame extraction
3. Timeline UI
4. Frame-by-frame dithering
5. Video export

### Phase 6: Polish & Features
1. Caching system
2. Batch processing
3. Settings/preferences
4. Keyboard shortcuts
5. Help documentation

### Phase 7: Electron Packaging
1. Electron main process
2. Native menus and dialogs
3. Auto-updater
4. Build scripts for all platforms
5. Code signing (macOS)

---

## Code Quality Principles

**IMPORTANT:** Follow these principles rigorously. Good code is more important than fast code.

### 1. DRY (Don't Repeat Yourself)

Every piece of knowledge should have a single, unambiguous representation in the codebase.

```typescript
// ❌ BAD - Repeated logic
function applyFloydSteinberg(pixel: number, threshold: number): number {
    return pixel > threshold ? 255 : 0;
}
function applyAtkinson(pixel: number, threshold: number): number {
    return pixel > threshold ? 255 : 0;  // Same logic duplicated!
}

// ✅ GOOD - Single source of truth
function quantize(pixel: number, threshold: number): number {
    return pixel > threshold ? 255 : 0;
}
function applyFloydSteinberg(pixel: number, threshold: number): number {
    return quantize(pixel, threshold);
}
function applyAtkinson(pixel: number, threshold: number): number {
    return quantize(pixel, threshold);
}

// ✅ BETTER - Configuration over duplication
const ERROR_KERNELS = {
    'floyd-steinberg': [[0, 0, 7], [3, 5, 1]],
    'atkinson': [[0, 0, 1], [1, 1, 0], [0, 1, 0]],
    // ... add new algorithms by adding data, not code
} as const;

function applyErrorDiffusion(
    imageData: ImageData,
    kernel: keyof typeof ERROR_KERNELS
): ImageData {
    return diffuse(imageData, ERROR_KERNELS[kernel]);
}
```

### 2. Design by Contract

Functions should have clear preconditions, postconditions, and invariants. Use TypeScript to enforce contracts.

```typescript
// ❌ BAD - No contract, anything goes
function dither(img, algo, opts) {
    // What if img is null? What if algo is invalid?
}

// ✅ GOOD - Clear contract with types and validation
interface DitherContract {
    /** Image must be non-empty */
    imageData: ImageData;
    /** Algorithm must be a valid algorithm ID */
    algorithm: Algorithm;
    /** Options must match algorithm requirements */
    options: AlgorithmOptions;
}

function dither(contract: DitherContract): ImageData {
    // Preconditions (validate inputs)
    assertValidImageData(contract.imageData);
    assertValidAlgorithm(contract.algorithm);
    assertOptionsMatchAlgorithm(contract.options, contract.algorithm);

    // Process
    const result = processImage(contract);

    // Postcondition (validate output)
    assertValidImageData(result);
    assertSameDimensions(contract.imageData, result);

    return result;
}

// Assertion helpers
function assertValidImageData(data: ImageData): asserts data is ImageData {
    if (!data || data.width <= 0 || data.height <= 0) {
        throw new Error('Invalid ImageData: must have positive dimensions');
    }
}
```

### 3. Decoupling & Separation of Concerns

Modules should be independent and communicate through well-defined interfaces.

```typescript
// ❌ BAD - Tightly coupled, UI knows about algorithms
class Sidebar {
    render() {
        // Sidebar directly calls dithering logic
        const result = floydSteinberg(this.image, this.options);
        this.canvas.putImageData(result);
    }
}

// ✅ GOOD - Decoupled through events/messages
// ui/sidebar.ts - Only knows about UI
function initSidebar(container: HTMLElement): void {
    container.addEventListener('click', (e) => {
        const algo = getSelectedAlgorithm(e);
        if (algo) {
            // Emit event, don't call engine directly
            app.setState({ algorithm: algo });
        }
    });
}

// engine/dither.ts - Only knows about processing
function dither(imageData: ImageData, algorithm: Algorithm): ImageData {
    // Pure function, no UI knowledge
    return processors[algorithm](imageData);
}

// main.ts - Orchestrator connects them
app.on('statechange', async (e) => {
    if ('algorithm' in e.detail.changes) {
        const result = await dither(state.sourceImage, state.algorithm);
        app.setState({ ditheredImage: result });
    }
});
```

### 4. Small Functions (Single Responsibility)

Each function should do ONE thing and do it well. If you can't describe what a function does without using "and", split it.

```typescript
// ❌ BAD - Function does too many things
function processImage(file: File): void {
    // Loads file AND converts to ImageData AND applies adjustments
    // AND dithers AND displays result AND saves to cache
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            // ... 50 more lines
        };
        img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
}

// ✅ GOOD - Each function does one thing
async function loadFile(file: File): Promise<ArrayBuffer> {
    return file.arrayBuffer();
}

async function decodeImage(buffer: ArrayBuffer): Promise<ImageBitmap> {
    const blob = new Blob([buffer]);
    return createImageBitmap(blob);
}

function imageToData(image: ImageBitmap): ImageData {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
}

function applyAdjustments(data: ImageData, adj: Adjustments): ImageData {
    return pipe(data,
        d => adjustBrightness(d, adj.brightness),
        d => adjustContrast(d, adj.contrast),
        d => adjustGamma(d, adj.gamma)
    );
}

// Composed together clearly
async function processImage(file: File, adjustments: Adjustments): Promise<ImageData> {
    const buffer = await loadFile(file);
    const bitmap = await decodeImage(buffer);
    const imageData = imageToData(bitmap);
    return applyAdjustments(imageData, adjustments);
}
```

### 5. Functional Over OOP

Prefer pure functions, immutability, and composition over classes and mutation.

```typescript
// ❌ BAD - OOP with mutable state
class ImageProcessor {
    private image: ImageData;
    private brightness: number = 0;
    private contrast: number = 0;

    setImage(img: ImageData): void {
        this.image = img;  // Mutation!
    }

    setBrightness(b: number): void {
        this.brightness = b;  // Mutation!
        this.reprocess();  // Side effect!
    }

    private reprocess(): void {
        // Mutates internal state
    }
}

// ✅ GOOD - Functional with pure functions
// Pure function - same input always gives same output
function adjustBrightness(data: ImageData, brightness: number): ImageData {
    const output = new ImageData(data.width, data.height);
    for (let i = 0; i < data.data.length; i += 4) {
        output.data[i] = clamp(data.data[i] + brightness, 0, 255);
        output.data[i + 1] = clamp(data.data[i + 1] + brightness, 0, 255);
        output.data[i + 2] = clamp(data.data[i + 2] + brightness, 0, 255);
        output.data[i + 3] = data.data[i + 3];
    }
    return output;  // Returns new data, doesn't mutate input
}

// Composition with pipe
const pipe = <T>(...fns: Array<(arg: T) => T>) =>
    (initial: T): T => fns.reduce((acc, fn) => fn(acc), initial);

const processImage = pipe(
    (d: ImageData) => adjustBrightness(d, 10),
    (d: ImageData) => adjustContrast(d, 5),
    (d: ImageData) => adjustGamma(d, 1.2)
);

// Higher-order functions for algorithm selection
const createDitherer = (kernel: number[][]) =>
    (imageData: ImageData): ImageData =>
        applyErrorDiffusion(imageData, kernel);

const floydSteinberg = createDitherer(FLOYD_STEINBERG_KERNEL);
const atkinson = createDitherer(ATKINSON_KERNEL);
```

### 6. Readability & Self-Documenting Code

Code should be readable without comments. Use descriptive names and clear structure.

```typescript
// ❌ BAD - Cryptic names, magic numbers
function proc(d: number[], w: number, h: number): number[] {
    const r = [];
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const p = (i * w + j) * 4;
            const v = d[p] * 0.299 + d[p+1] * 0.587 + d[p+2] * 0.114;
            r.push(v > 127 ? 255 : 0);
        }
    }
    return r;
}

// ✅ GOOD - Self-documenting
const LUMINANCE_WEIGHTS = {
    red: 0.299,
    green: 0.587,
    blue: 0.114
} as const;

const DEFAULT_THRESHOLD = 127;

function rgbToLuminance(red: number, green: number, blue: number): number {
    return (
        red * LUMINANCE_WEIGHTS.red +
        green * LUMINANCE_WEIGHTS.green +
        blue * LUMINANCE_WEIGHTS.blue
    );
}

function thresholdLuminance(luminance: number, threshold = DEFAULT_THRESHOLD): number {
    return luminance > threshold ? 255 : 0;
}

function convertToMonochrome(
    imageData: ImageData,
    threshold = DEFAULT_THRESHOLD
): Uint8Array {
    const { data, width, height } = imageData;
    const pixelCount = width * height;
    const output = new Uint8Array(pixelCount);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
        const dataIndex = pixelIndex * 4;
        const red = data[dataIndex];
        const green = data[dataIndex + 1];
        const blue = data[dataIndex + 2];

        const luminance = rgbToLuminance(red, green, blue);
        output[pixelIndex] = thresholdLuminance(luminance, threshold);
    }

    return output;
}
```

### 7. Configuration Over Code

Add new features by adding data/configuration, not by writing new code.

```typescript
// ❌ BAD - Adding algorithms requires new functions
function getAlgorithm(name: string) {
    switch (name) {
        case 'floyd-steinberg': return floydSteinberg;
        case 'atkinson': return atkinson;
        case 'jarvis': return jarvis;
        // Must edit this switch for every new algorithm!
    }
}

// ✅ GOOD - Configuration-driven
interface AlgorithmConfig {
    name: string;
    category: string;
    kernel?: number[][];
    processor: (data: ImageData, options: AlgorithmOptions) => ImageData;
}

const ALGORITHMS: Record<Algorithm, AlgorithmConfig> = {
    'floyd-steinberg': {
        name: 'Floyd-Steinberg',
        category: 'Error Diffusion',
        kernel: [[0, 0, 7], [3, 5, 1]],
        processor: (data, opts) => errorDiffusion(data, ALGORITHMS['floyd-steinberg'].kernel!, opts)
    },
    'atkinson': {
        name: 'Atkinson',
        category: 'Error Diffusion',
        kernel: [[0, 0, 1, 1], [1, 1, 1, 0], [0, 1, 0, 0]],
        processor: (data, opts) => errorDiffusion(data, ALGORITHMS['atkinson'].kernel!, opts)
    },
    // Adding new algorithm = adding config, not writing new functions
};

// Generic processor uses config
function dither(data: ImageData, algorithm: Algorithm, options: AlgorithmOptions): ImageData {
    const config = ALGORITHMS[algorithm];
    return config.processor(data, options);
}

// UI automatically populated from config
function renderAlgorithmList(): string {
    return Object.entries(ALGORITHMS)
        .map(([id, config]) => `<option value="${id}">${config.name}</option>`)
        .join('');
}
```

### 8. Error Handling

Handle errors gracefully with informative messages. Never swallow errors silently.

```typescript
// ❌ BAD - Silent failure
async function loadImage(file: File): Promise<ImageData | null> {
    try {
        // ...
    } catch {
        return null;  // Caller has no idea what went wrong
    }
}

// ✅ GOOD - Explicit error handling with Result type
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

interface ImageLoadError {
    code: 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'DECODE_FAILED';
    message: string;
    originalError?: Error;
}

async function loadImage(file: File): Promise<Result<ImageData, ImageLoadError>> {
    // Validate format
    if (!SUPPORTED_FORMATS.includes(file.type)) {
        return {
            ok: false,
            error: {
                code: 'INVALID_FORMAT',
                message: `Unsupported format: ${file.type}. Supported: ${SUPPORTED_FORMATS.join(', ')}`
            }
        };
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
        return {
            ok: false,
            error: {
                code: 'FILE_TOO_LARGE',
                message: `File too large: ${formatBytes(file.size)}. Maximum: ${formatBytes(MAX_FILE_SIZE)}`
            }
        };
    }

    try {
        const imageData = await decode(file);
        return { ok: true, value: imageData };
    } catch (e) {
        return {
            ok: false,
            error: {
                code: 'DECODE_FAILED',
                message: 'Failed to decode image file',
                originalError: e instanceof Error ? e : new Error(String(e))
            }
        };
    }
}

// Usage with proper error handling
const result = await loadImage(file);
if (!result.ok) {
    showErrorToUser(result.error.message);
    console.error(result.error);
    return;
}
const imageData = result.value;
```

### 9. Immutability

Never mutate data. Always return new copies.

```typescript
// ❌ BAD - Mutates input
function adjustBrightness(data: ImageData, amount: number): void {
    for (let i = 0; i < data.data.length; i += 4) {
        data.data[i] += amount;      // Mutating input!
        data.data[i + 1] += amount;
        data.data[i + 2] += amount;
    }
}

// ✅ GOOD - Returns new data
function adjustBrightness(input: ImageData, amount: number): ImageData {
    const output = new ImageData(
        new Uint8ClampedArray(input.data),  // Copy the data
        input.width,
        input.height
    );

    for (let i = 0; i < output.data.length; i += 4) {
        output.data[i] = clamp(input.data[i] + amount, 0, 255);
        output.data[i + 1] = clamp(input.data[i + 1] + amount, 0, 255);
        output.data[i + 2] = clamp(input.data[i + 2] + amount, 0, 255);
        output.data[i + 3] = input.data[i + 3];
    }

    return output;
}

// State updates - never mutate, always spread
// ❌ BAD
state.options.serpentine = true;

// ✅ GOOD
setState({
    options: { ...state.options, serpentine: true }
});
```

### 10. Testing Mindset

Write code that's easy to test. Pure functions with clear inputs/outputs are testable.

```typescript
// ❌ BAD - Hard to test (depends on DOM, global state)
function dither(): void {
    const img = document.getElementById('source') as HTMLImageElement;
    const canvas = document.getElementById('output') as HTMLCanvasElement;
    const algo = (document.getElementById('algo') as HTMLSelectElement).value;
    // ... processes and mutates DOM
}

// ✅ GOOD - Easy to test (pure function)
function dither(
    imageData: ImageData,
    algorithm: Algorithm,
    options: AlgorithmOptions
): ImageData {
    // Pure function - can be tested with any input
    return ALGORITHMS[algorithm].processor(imageData, options);
}

// Test example
describe('dither', () => {
    it('floyd-steinberg produces correct output', () => {
        const input = createTestImage(4, 4, [128, 128, 128, 255]);
        const output = dither(input, 'floyd-steinberg', {});

        expect(output.width).toBe(4);
        expect(output.height).toBe(4);
        // Verify dithering pattern
        expect(countBlackPixels(output)).toBeGreaterThan(0);
        expect(countWhitePixels(output)).toBeGreaterThan(0);
    });
});
```

---

## Code Style Guidelines

### Framework Rules
1. **No UI frameworks** - NO React, Vue, Angular, Svelte, or similar
2. **Vanilla TypeScript only** - Use native DOM APIs
3. **Web Components optional** - For reusable widgets like sliders, color pickers

### TypeScript Style
4. **Strict mode** - Enable strict in tsconfig.json
5. **Explicit types** - Type all function parameters and return values
6. **Interfaces over types** - Prefer `interface` for objects, `type` for unions
7. **No `any`** - Use `unknown` if type is truly unknown, then narrow it
8. **Const assertions** - Use `as const` for literal types

### General Style
9. **ES Modules** - Use import/export
10. **ES6+ Classes** - For components and services
11. **Async/await** - For all async operations
12. **Consistent naming** - camelCase for functions/variables, PascalCase for classes/interfaces
13. **Small functions** - Each function does one thing
14. **Error handling** - Try/catch with user-friendly messages

### DOM Patterns
15. **Event delegation** - Attach listeners to parent containers
16. **Custom Events** - For component communication (`dispatchEvent`, `addEventListener`)
17. **Template literals** - For HTML generation (not document.createElement for complex structures)
18. **Data attributes** - For storing state on elements (`data-id`, `data-value`)
19. **Type assertions for DOM** - Use `as HTMLElement` when querySelector result is known

### State Management
20. **Single App class** - Centralized state with event emission
21. **Typed state** - AppState interface defines all state properties
22. **Immutable updates** - Don't mutate state directly, use `setState()`
23. **Event-driven** - Components subscribe to state changes

### Example DO and DON'T:

```typescript
// ❌ DON'T - React-style thinking
function AlgorithmList({ algorithms, selected, onSelect }) {
    return algorithms.map(a =>
        <div onClick={() => onSelect(a.id)}>{a.name}</div>
    );
}

// ❌ DON'T - Using 'any'
function dither(imageData: any, options: any): any {
    // ...
}

// ✅ DO - Vanilla TypeScript with proper types
import type { Algorithm, AlgorithmOptions } from '@types';

interface AlgorithmInfo {
    id: Algorithm;
    name: string;
    category: string;
}

function renderAlgorithmList(
    container: HTMLElement,
    algorithms: AlgorithmInfo[]
): void {
    container.innerHTML = algorithms.map(a => `
        <div class="algorithm" data-id="${a.id}">${a.name}</div>
    `).join('');

    container.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.algorithm');
        if (item?.dataset.id) {
            app.setState({ algorithm: item.dataset.id as Algorithm });
        }
    });
}

// ✅ DO - Typed function with explicit return
async function dither(
    imageData: ImageData,
    algorithm: Algorithm,
    options: AlgorithmOptions
): Promise<ImageData> {
    // TypeScript ensures correct usage
}
```

---

## Testing Requirements

1. **Unit tests** for all dithering algorithms
2. **Visual regression tests** - Compare output to reference images
3. **Performance benchmarks** - Track algorithm speed
4. **Cross-browser testing** - Chrome, Firefox, Safari
5. **Electron testing** - macOS, Linux, Windows

---

## Reference Implementation

The original Ditherista is written in C++/Qt. Key reference files:
- `libdither/src/libdither/` - All dithering algorithms in C
- `src/app/mainwindow*.cpp` - UI logic
- `src/app/enums.h` - Algorithm enumerations

The libdither C code can be compiled to WebAssembly using Emscripten as an alternative to rewriting in Rust.

---

## Success Criteria

### Functional
1. All 100+ dithering algorithms working correctly
2. Output matches original app visually (pixel-perfect where possible)
3. All color matching methods produce correct results
4. Video import/export works with all supported formats
5. Palettes load, save, and edit correctly

### Performance
6. **Threshold dithering:** <10ms for 1080p
7. **Ordered dithering (GPU):** <50ms for 1080p
8. **Error diffusion:** <200ms for 1080p
9. **DBS:** <5 seconds for 512x512
10. **Video processing:** <100ms per frame at 1080p
11. **UI responsiveness:** No blocking during heavy operations
12. **Memory:** Handle 4096x4096 images without crashing

### Platform
13. Works in modern browsers (Chrome, Firefox, Safari, Edge)
14. Electron builds run on macOS (Intel + Apple Silicon), Linux, Windows
15. File size: Web app < 5MB (excluding WASM), Electron < 150MB

### Quality
16. No memory leaks during extended use
17. Graceful error handling (no crashes, user-friendly messages)
18. Cancellable long-running operations with progress feedback

---

## 12. Recommended Libraries

Use these battle-tested libraries instead of writing everything from scratch. Total added size: ~100KB (excluding FFmpeg.wasm for video).

### 12.1 GPU/Image Processing

| Library | Purpose | Size | Install |
|---------|---------|------|---------|
| **GPU.js** | Write JS that runs on GPU | ~50KB | `npm install gpu.js` |
| **twgl.js** | Thin WebGL helper | ~25KB | `npm install twgl.js` |

**GPU.js** is the top recommendation - write normal JavaScript and it compiles to WebGL shaders automatically:

```javascript
import { GPU } from 'gpu.js';

const gpu = new GPU();

// This function runs on GPU with massive parallelism!
const orderedDither = gpu.createKernel(function(pixels, matrix, width, matrixSize) {
    const i = (this.thread.y * width + this.thread.x) * 4;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const mx = this.thread.x % matrixSize;
    const my = this.thread.y % matrixSize;
    const threshold = matrix[my * matrixSize + mx];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    return gray > threshold * 255 ? 255 : 0;
}).setOutput([width, height]);

// Process 1080p image in milliseconds
const result = orderedDither(imageData.data, bayerMatrix, width, 8);
```

### 12.2 Color Science

| Library | Purpose | Size | Install |
|---------|---------|------|---------|
| **culori** | Full color science (LAB, LCH, all spaces) | ~15KB | `npm install culori` |
| **image-q** | Color quantization + dithering | ~20KB | `npm install image-q` |

**culori** handles all color space conversions including CIEDE2000:

```javascript
import { lab, rgb, differenceEuclidean, differenceCiede2000 } from 'culori';

// Convert RGB to LAB
const labColor = lab({ mode: 'rgb', r: 1, g: 0.5, b: 0 });

// Calculate color difference (CIEDE2000)
const deltaE = differenceCiede2000()(color1, color2);

// Find nearest palette color
function findNearest(color, palette, method = 'ciede2000') {
    const diff = method === 'ciede2000' ? differenceCiede2000() : differenceEuclidean();
    return palette.reduce((nearest, candidate) =>
        diff(color, candidate) < diff(color, nearest) ? candidate : nearest
    );
}
```

**image-q** already implements quantization algorithms you need:

```javascript
import { applyPalette, buildPalette } from 'image-q';

// Build optimal palette from image (Median Cut, Wu, or NeuQuant)
const pointContainer = utils.PointContainer.fromImageData(imageData);
const palette = await buildPalette([pointContainer], {
    colorDistanceFormula: 'ciede2000',  // or 'euclidean', 'cie94'
    paletteQuantization: 'wuQuant',      // or 'neuquant', 'rgbquant'
    colors: 16
});

// Apply palette with dithering
const outPointContainer = await applyPalette(pointContainer, palette, {
    colorDistanceFormula: 'ciede2000',
    imageQuantization: 'floyd-steinberg'  // or 'nearest', 'riemersma', 'stucki'
});

const resultImageData = outPointContainer.toImageData();
```

### 12.3 Video Processing

| Library | Purpose | Size | Install |
|---------|---------|------|---------|
| **FFmpeg.wasm** | Full FFmpeg (import any format) | ~25MB | `npm install @ffmpeg/ffmpeg` |
| **mp4-muxer** | Fast MP4 encoding | ~50KB | `npm install mp4-muxer` |
| **webm-muxer** | Fast WebM encoding | ~30KB | `npm install webm-muxer` |

**Strategy:** Use FFmpeg.wasm for IMPORT (handles all codecs), use mp4-muxer for EXPORT (10x faster):

```javascript
// IMPORT with FFmpeg.wasm
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
await ffmpeg.load();
await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

// Extract frames
await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'fps=30', 'frame_%04d.png']);

// Read frames
const frames = [];
for (let i = 1; ; i++) {
    try {
        const data = await ffmpeg.readFile(`frame_${i.toString().padStart(4, '0')}.png`);
        frames.push(data);
    } catch { break; }
}

// EXPORT with mp4-muxer (much faster!)
import { Muxer, ArrayBufferTarget, VideoEncoder } from 'mp4-muxer';

const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
        codec: 'avc',
        width: 1920,
        height: 1080
    },
    fastStart: 'in-memory'
});

const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: console.error
});

encoder.configure({
    codec: 'avc1.640028',
    width: 1920,
    height: 1080,
    bitrate: 5_000_000
});

// Encode dithered frames
for (let i = 0; i < ditheredFrames.length; i++) {
    const frame = new VideoFrame(ditheredFrames[i], {
        timestamp: i * (1_000_000 / 30)  // 30fps
    });
    encoder.encode(frame);
    frame.close();
}

await encoder.flush();
muxer.finalize();

const videoBlob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
```

### 12.4 Web Workers

| Library | Purpose | Size | Install |
|---------|---------|------|---------|
| **Comlink** | Makes workers feel like async functions | ~3KB | `npm install comlink` |

**Comlink** eliminates postMessage/onmessage boilerplate:

```javascript
// worker.js
import { expose } from 'comlink';
import { floydSteinberg } from './algorithms/error-diffusion.js';

const api = {
    async dither(imageData, algorithm, options) {
        switch (algorithm) {
            case 'floyd-steinberg':
                return floydSteinberg(imageData, options);
            // ... other algorithms
        }
    },

    async quantize(imageData, colors, method) {
        // Heavy color quantization
        return result;
    }
};

expose(api);

// main.js
import { wrap } from 'comlink';

const ditherWorker = wrap(new Worker('./worker.js', { type: 'module' }));

// Use like a normal async function!
const result = await ditherWorker.dither(imageData, 'floyd-steinberg', {
    serpentine: true
});

// No postMessage, no onmessage, no serialization worries!
```

### 12.5 File Handling

| Library | Purpose | Size | Install |
|---------|---------|------|---------|
| **browser-fs-access** | Native file dialogs | ~2KB | `npm install browser-fs-access` |
| **StreamSaver.js** | Stream large video files | ~5KB | `npm install streamsaver` |
| **FileSaver.js** | Simple file downloads | ~3KB | `npm install file-saver` |

```javascript
import { fileOpen, fileSave } from 'browser-fs-access';

// Open with native dialog
const file = await fileOpen({
    mimeTypes: ['image/png', 'image/jpeg'],
    description: 'Image files'
});

// Save with native dialog
await fileSave(blob, {
    fileName: 'dithered.png',
    extensions: ['.png']
});

// For large video files, use StreamSaver
import streamSaver from 'streamsaver';

const fileStream = streamSaver.createWriteStream('video.mp4', {
    size: videoSize
});
const writer = fileStream.getWriter();
await writer.write(videoChunk);
await writer.close();
```

### 12.6 UI Architecture (Vanilla JS)

**DO NOT USE frameworks like React, Vue, or Angular.** Use pure Vanilla JS.

| Tool | Purpose | Size | Install |
|------|---------|------|---------|
| **Vanilla JS** | UI framework | 0KB | - |
| **Web Components** | Reusable widgets | 0KB | Native |
| **Custom Events** | Component communication | 0KB | Native |

**Recommended: Vanilla JS** with Web Components for complex widgets:

```javascript
// Custom color swatch component
class ColorSwatch extends HTMLElement {
    static observedAttributes = ['color'];

    connectedCallback() {
        this.style.cssText = `
            display: inline-block;
            width: 24px;
            height: 24px;
            border: 1px solid #333;
            cursor: pointer;
        `;
        this.style.backgroundColor = this.getAttribute('color') || '#000';

        this.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('color-click', {
                detail: { color: this.getAttribute('color') },
                bubbles: true
            }));
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'color') {
            this.style.backgroundColor = newValue;
        }
    }
}

customElements.define('color-swatch', ColorSwatch);

// Usage: <color-swatch color="#ff0000"></color-swatch>
```

**Vanilla TypeScript App Architecture Pattern:**

```typescript
// src/types/events.ts
export interface StateChangeDetail<T> {
    oldState: T;
    newState: T;
    changes: Partial<T>;
}

export interface AppEventMap {
    'statechange': CustomEvent<StateChangeDetail<AppState>>;
}

// src/app.ts - Main application state and event bus
import type { AppState, Algorithm, AlgorithmOptions, StateChangeDetail, AppEventMap } from '@/types';

const initialState: AppState = {
    sourceImage: null,
    ditheredImage: null,
    originalFileName: null,
    mode: 'mono',
    algorithm: 'floyd-steinberg',
    options: { serpentine: true },
    palette: { name: 'Mono', colors: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }] },
    colorMatch: 'ciede2000',
    quantization: 'median-cut',
    adjustments: { brightness: 0, contrast: 0, gamma: 1.0 },
    videoFrames: null,
    currentFrame: 0,
    isProcessingVideo: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    showOriginal: false
};

class App extends EventTarget {
    private state: AppState;

    constructor() {
        super();
        this.state = { ...initialState };
    }

    setState(updates: Partial<AppState>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };

        this.dispatchEvent(new CustomEvent<StateChangeDetail<AppState>>('statechange', {
            detail: { oldState, newState: this.state, changes: updates }
        }));
    }

    getState(): Readonly<AppState> {
        return this.state;
    }

    // Type-safe event listener
    on<K extends keyof AppEventMap>(
        type: K,
        listener: (event: AppEventMap[K]) => void
    ): void {
        this.addEventListener(type, listener as EventListener);
    }

    off<K extends keyof AppEventMap>(
        type: K,
        listener: (event: AppEventMap[K]) => void
    ): void {
        this.removeEventListener(type, listener as EventListener);
    }
}

// Global app instance
export const app = new App();

// src/ui/sidebar.ts - Vanilla TypeScript component example
import { app } from '@/app';
import type { Algorithm } from '@/types';

interface AlgorithmInfo {
    id: Algorithm;
    name: string;
    category: string;
}

const algorithms: AlgorithmInfo[] = [
    { id: 'floyd-steinberg', name: 'Floyd-Steinberg', category: 'Error Diffusion' },
    { id: 'ordered-bayer8', name: 'Bayer 8x8', category: 'Ordered' },
    // ... more algorithms
];

export function initSidebar(container: HTMLElement): void {
    // Create DOM
    container.innerHTML = `
        <div class="sidebar">
            <input type="search" class="search" placeholder="Search algorithms...">
            <div class="algorithm-list"></div>
        </div>
    `;

    const list = container.querySelector<HTMLElement>('.algorithm-list')!;
    const search = container.querySelector<HTMLInputElement>('.search')!;

    // Render algorithm list
    function render(filter = ''): void {
        const filtered = algorithms.filter(a =>
            a.name.toLowerCase().includes(filter.toLowerCase())
        );

        list.innerHTML = filtered.map(algo => `
            <div class="algorithm-item" data-id="${algo.id}">
                <span class="name">${algo.name}</span>
                <span class="category">${algo.category}</span>
            </div>
        `).join('');

        // Update selection
        const currentAlgo = app.getState().algorithm;
        list.querySelector(`[data-id="${currentAlgo}"]`)?.classList.add('selected');
    }

    // Event listeners
    search.addEventListener('input', () => render(search.value));

    list.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.algorithm-item');
        if (item?.dataset.id) {
            app.setState({ algorithm: item.dataset.id as Algorithm });
        }
    });

    // React to state changes
    app.on('statechange', (e) => {
        if ('algorithm' in e.detail.changes) {
            list.querySelectorAll('.algorithm-item').forEach(el => {
                el.classList.toggle('selected', el.getAttribute('data-id') === e.detail.newState.algorithm);
            });
        }
    });

    render();
}

// src/ui/viewport.ts - Canvas viewport with types
import { app } from '@/app';

interface ViewportControls {
    canvas: HTMLCanvasElement;
    render: () => void;
    setZoom: (zoom: number) => void;
    resetView: () => void;
}

export function initViewport(container: HTMLElement): ViewportControls {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    container.appendChild(canvas);

    let zoom = 1;
    let panX = 0;
    let panY = 0;

    function render(): void {
        const { ditheredImage, sourceImage, showOriginal } = app.getState();
        const image = showOriginal ? sourceImage : (ditheredImage || sourceImage);
        if (!image) return;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);
        ctx.putImageData(image, 0, 0);
        ctx.restore();
    }

    // Zoom with wheel
    canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoom = Math.max(0.1, Math.min(5, zoom * delta));
        app.setState({ zoom });
        render();
    });

    // Pan with drag
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (!dragging) return;
        panX += e.clientX - lastX;
        panY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        app.setState({ panX, panY });
        render();
    });

    canvas.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mouseleave', () => { dragging = false; });

    // Double-click to reset
    canvas.addEventListener('dblclick', () => {
        zoom = 1;
        panX = 0;
        panY = 0;
        app.setState({ zoom, panX, panY });
        render();
    });

    // React to image changes
    app.on('statechange', (e) => {
        const imageChanged = 'ditheredImage' in e.detail.changes ||
                            'sourceImage' in e.detail.changes ||
                            'showOriginal' in e.detail.changes;
        if (imageChanged) {
            render();
        }
    });

    return {
        canvas,
        render,
        setZoom: (z: number) => { zoom = z; render(); },
        resetView: () => { zoom = 1; panX = 0; panY = 0; render(); }
    };
}

// src/main.ts - Initialize everything
import { app } from './app';
import { initSidebar } from './ui/sidebar';
import { initViewport } from './ui/viewport';
import { initAdjustments } from './ui/adjustments';
import { initPalette } from './ui/palette';
import { dither } from './engine/dither';

function getRequiredElement(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el;
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI components
    initSidebar(getRequiredElement('sidebar'));
    const viewport = initViewport(getRequiredElement('viewport'));
    initAdjustments(getRequiredElement('adjustments'));
    initPalette(getRequiredElement('palette'));

    // Listen for changes that require re-dithering
    const ditherTriggers: (keyof typeof app.getState)[] = [
        'algorithm', 'options', 'palette', 'adjustments', 'sourceImage'
    ];

    app.on('statechange', async (e) => {
        const shouldDither = ditherTriggers.some(key => key in e.detail.changes);

        if (shouldDither && e.detail.newState.sourceImage) {
            const state = app.getState();
            const result = await dither(
                state.sourceImage!,
                state.algorithm,
                state.options,
                state.palette,
                state.adjustments
            );
            app.setState({ ditheredImage: result });
        }
    });
});
```

This pattern provides:
- **Centralized state** in the `App` class
- **Event-driven updates** via `CustomEvent`
- **Decoupled components** that listen for relevant changes
- **No framework overhead** - just native DOM and events

### 12.7 IMPORTANT: image-q as Starting Point

The **image-q** library already implements many features you need:

| Feature | image-q Support |
|---------|-----------------|
| Floyd-Steinberg dithering | ✅ Yes |
| Stucki, Atkinson, etc. | ✅ Yes |
| Ordered/Bayer dithering | ✅ Yes |
| Riemersma dithering | ✅ Yes |
| NeuQuant quantization | ✅ Yes |
| Median Cut quantization | ✅ Yes |
| Wu quantization | ✅ Yes |
| CIEDE2000 color matching | ✅ Yes |
| CIE94 color matching | ✅ Yes |
| Euclidean/Manhattan | ✅ Yes |

**Recommendation:** Start with image-q for the algorithms it already has, then add the missing ones (DBS, pattern dithering, dot diffusion, etc.).

### 12.8 Complete package.json

```json
{
    "name": "ditherista",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "typecheck": "tsc --noEmit",
        "lint": "tsc --noEmit && echo 'Types OK'",
        "preview": "vite preview",
        "electron:dev": "vite build && electron .",
        "electron:build": "vite build && electron-builder"
    },
    "dependencies": {
        "gpu.js": "^2.16.0",
        "culori": "^4.0.0",
        "image-q": "^4.0.0",
        "@ffmpeg/ffmpeg": "^0.12.0",
        "@ffmpeg/util": "^0.12.0",
        "mp4-muxer": "^4.0.0",
        "comlink": "^4.4.0",
        "browser-fs-access": "^0.35.0",
        "file-saver": "^2.0.5"
    },
    "devDependencies": {
        "typescript": "^5.3.0",
        "vite": "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/file-saver": "^2.0.7",
        "electron": "^28.0.0",
        "electron-builder": "^24.0.0"
    }
}
```

---

## Resources

- [Original Ditherista](https://github.com/robertkist/ditherista) - Reference implementation
- [libdither](https://github.com/robertkist/libdither) - Core dithering library in C
- [Dithering Algorithms](https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html) - Algorithm explanations
- [Color Quantization](https://www.researchgate.net/publication/220502178_On_the_Quantization_of_Color_Images) - Research papers
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - Video processing
- [Electron](https://www.electronjs.org/) - Desktop packaging
- [GPU.js](https://gpu.rocks/) - GPU acceleration
- [culori](https://culorijs.org/) - Color science
- [image-q](https://github.com/ibezkrovnyi/image-quantization) - Quantization library
- [Comlink](https://github.com/GoogleChromeLabs/comlink) - Web Worker utility
- [mp4-muxer](https://github.com/nicassio/mp4-muxer) - Fast video encoding

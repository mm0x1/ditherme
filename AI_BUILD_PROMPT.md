# ditherme Rebuild - AI Agent Prompt

## Session Summary (For Context Continuity)

### Project Status: Phase 5 (Video) Complete
This is a dithering application that converts images and videos into dithered artwork. The core functionality is working with 100+ algorithms available via WASM, and video support is now available.

### What's Been Done
1. **Phase 1 (Complete)**: Core foundation - project setup, Canvas viewport, image loading, threshold dithering, image adjustments
2. **Phase 2 (Complete via WASM)**: All dithering algorithms - error diffusion, ordered, Riemersma, pattern, dot diffusion, DBS, grid, etc.
3. **Phase 3 (Complete)**: Color support - palettes, color matching, quantization, palette editor
4. **Phase 4 (Complete)**: WebAssembly integration using libdither C library compiled with Emscripten
5. **Phase 5 (Complete)**: Video support - WebCodecs + FFmpeg.wasm, timeline UI, parallel frame processing, export to MP4/WebM/GIF

### Key Technical Decisions
- **WASM approach**: Compiled libdither (MIT-licensed C library) to WebAssembly instead of manual JS implementation
- **Gamma correction fix**: `correctGamma = 0` in WASM bindings - input is already sRGB
- **Buffer zeroing**: Output buffer zeroed before each dither call to prevent corruption
- **Video architecture**: WebCodecs for modern browsers with FFmpeg.wasm fallback for Safari
- **Memory management**: On-demand frame extraction with LRU cache (50 frames, 500MB limit)
- **Parallel processing**: Worker pool for frame dithering (uses navigator.hardwareConcurrency)

### Critical Files
- `src/engine/wasm-dither.ts` - TypeScript bindings for WASM module
- `src/algorithms/index.ts` - Algorithm router with WASM integration
- `src/engine/dither.ts` - Dithering orchestration
- `wasm/build.sh` - Build script for compiling libdither to WASM
- `public/wasm/libdither.{js,wasm}` - Compiled WASM module
- `src/engine/video/` - Video engine (extractor, encoder, manager, cache)
- `src/workers/` - Worker pool and video processor worker
- `src/ui/video/` - Timeline, progress modal, export dialog

### Remaining Phases
- **Phase 6**: Polish & features (caching, batch processing, settings)
- **Phase 7**: Electron packaging

---

## Project Overview

Build a professional cross-platform dithering application called **ditherme** that runs both as a web app and desktop application. The app converts images and videos into dithered artwork using 100+ dithering algorithms with full color palette control.

**Target Stack:**
- **Language:** TypeScript (strict but practical)
- **Frontend:** Vanilla TypeScript + Canvas API + WebGL (for GPU acceleration)
- **UI Framework:** None - Pure Vanilla TS (like Photopea's approach)
- **Performance-Critical Code:** WebAssembly (compiled from C via Emscripten)
- **Desktop Packaging:** Electron (for downloadable offline executables)
- **Build Tool:** Vite (zero-config TypeScript support)

**Platforms:** macOS, Linux, Windows (in that priority order)

**IMPORTANT - No UI Frameworks:**
Do NOT use React, Vue, Angular, or similar frameworks. Use plain TypeScript with native DOM APIs.

---

## Core Architecture

### File Structure
```
ditherme/
├── src/
│   ├── index.html
│   ├── main.ts                      # App initialization
│   ├── app.ts                       # App state and event bus
│   ├── types/                       # TypeScript type definitions
│   ├── ui/                          # UI components
│   ├── engine/
│   │   ├── dither.ts                # Dithering orchestration
│   │   ├── wasm-dither.ts           # WASM bindings for libdither
│   │   ├── color.ts                 # Color space conversions
│   │   └── adjustments.ts           # Image adjustments
│   ├── algorithms/
│   │   ├── index.ts                 # Algorithm registry and router
│   │   ├── error-diffusion.ts       # JS fallback implementations
│   │   ├── ordered.ts
│   │   └── threshold.ts
│   ├── data/
│   │   ├── matrices/                # Dither matrices data
│   │   └── palettes/                # Built-in palettes
│   ├── workers/
│   ├── utils/
│   └── styles/
├── wasm/
│   ├── build.sh                     # WASM build script
│   └── libdither/                   # libdither C source (git clone)
├── public/
│   └── wasm/
│       ├── libdither.js             # Emscripten JS glue
│       └── libdither.wasm           # Compiled WASM module
└── package.json
```

---

## Feature Specification

### 1. Dithering Algorithms (All 100+ Implemented via WASM)

#### 1.1 Error Diffusion (19 variants)
Floyd-Steinberg, Jarvis-Judice-Ninke, Stucki, Burkes, Sierra (3 variants), Atkinson, Stevenson-Arce, Shiau-Fan (3 variants), Fake Floyd-Steinberg, XOT, Diagonal, Diffusion 1D/2D, Steve Pigeon, Robert Kist

#### 1.2 Ordered Dithering (45+ matrices)
Bayer (2x2 through 32x32), Blue Noise, Clustered Dot (11 variants), Dispersed Dots, Non-Rectangular, Ulichney variants, Diagonal, ImageMagick patterns, Variable, Interleaved Gradient

#### 1.3 Riemersma Dithering (8 curves)
Hilbert, Hilbert Modified, Peano, Fass0/1/2, Gosper, Fass Spiral

#### 1.4 Pattern Dithering (6 patterns)
Pattern 2x2, 3x3 (3 variants), 4x4, 5x2

#### 1.5 Dot Diffusion (9 variants)
Knuth, Mini-Knuth, Optimized Knuth, Mese-Vaidyanathan, Guo-Liu, Spiral, Inverted Spiral

#### 1.6 Dot Lippens (6 variants)
Li1, Li2, Li3, Guo, Mese, Knuth

#### 1.7 Variable Error Diffusion
Ostromoukhov, Zhou-Fang

#### 1.8 Other Algorithms
Threshold, DBS (Direct Binary Search), Grid, Kacker-Allebach

### 2. Color Matching Methods (10 modes)
Luminance, sRGB, Linear, HSV, sRGB CCIR, Linear CCIR, LAB76, LAB94, LAB2000 (CIEDE2000), Tetrapal

### 3. Color Quantization
Median Cut, Wu, KD-Tree

### 4. Palette System
14 built-in presets (Mono, CGA, EGA, Mac 16, Pico-8, C64, NES, Game Boy, Grayscale variants, Web Safe)
Custom palette editor (2-16 colors)
Auto-generate from image

### 5. Image Adjustments
Brightness (-100 to +100), Contrast (-100 to +100), Gamma (0.1 to 3.0), Saturation (color mode), Black/White point clipping

### 6. Additional Features
- Pixel scale (1x-16x block size)
- Levels/posterization (reduce palette to N colors)

---

## Implementation Status

### Phase 1: Core Foundation ✅ COMPLETE
- ✅ Project structure
- ✅ Canvas viewport with zoom/pan
- ✅ Image loading (drag/drop, file picker)
- ✅ Basic threshold dithering
- ✅ Image adjustments (brightness, contrast, gamma)

### Phase 2: Dithering Algorithms ✅ COMPLETE (via WASM)
- ✅ Error diffusion (all 19 variants)
- ✅ Ordered dithering (all 45+ matrices)
- ✅ Riemersma (all 8 curves)
- ✅ Pattern dithering (all 6 patterns)
- ✅ Dot diffusion (all 9 variants)
- ✅ Dot Lippens (all 6 variants)
- ✅ Variable error diffusion (Ostromoukhov, Zhou-Fang)
- ✅ DBS, Grid, Kacker-Allebach
- ✅ Algorithm parameter UI

### Phase 3: Color Support ✅ COMPLETE
- ✅ Color palettes (14 built-in presets)
- ✅ Color matching methods (Euclidean, CIE76, CIE94, CIEDE2000, Luminance)
- ✅ Color quantization (median-cut)
- ✅ Palette editor UI
- ✅ Color dithering modes
- ✅ Custom palette editor
- ✅ Auto-generate palette from image
- ✅ Pixel scale (1x-16x)
- ✅ Levels/posterization

### Phase 4: WebAssembly Optimization ✅ COMPLETE
- ✅ Compile libdither to WASM using Emscripten
- ✅ TypeScript bindings (wasm-dither.ts)
- ✅ Async dithering with WASM
- ✅ Fallback to JS for unsupported algorithms
- ✅ Fixed gamma correction issue (correctGamma = 0)
- ✅ Fixed buffer corruption (zeroing output buffer)

### Phase 5: Video Support ✅ COMPLETE
- ✅ Integrate FFmpeg.wasm (with WebCodecs for modern browsers)
- ✅ Video loading and frame extraction (WebCodecs + FFmpeg backends)
- ✅ Timeline UI (play/pause, scrub, keyboard shortcuts)
- ✅ Frame-by-frame dithering (worker pool for parallel processing)
- ✅ Video export (MP4, WebM, GIF formats)

### Phase 6: Polish & Features ✅ COMPLETE
- ⏳ Caching system
- ⏳ Batch processing
- ⏳ Settings/preferences
- ⏳ Help documentation
- Mark WASM algorithms in the UI with "WASM" UI tag and tooltip upon hover detailing potential issues and usages

### Phase 7: Electron Packaging ✅ COMPLETE
- ⏳ Electron main process
- ⏳ Native menus and dialogs
- ⏳ Auto-updater
- ⏳ Build scripts for all platforms

### Phase 8: Video Preview Performance (TODO - Research Required)
**Problem:** When a video is loaded and dithering settings are changed, the preview update is very slow. Users must wait a long time to see the effect of parameter changes, making iterative adjustments frustrating.

**Research Tasks:**
- Profile the current video frame dithering pipeline to identify bottlenecks
- Investigate why preview updates are slow (is it frame extraction, dithering, rendering, or all three?)
- Analyze current caching strategy for video frames - is the dithered frame cache being invalidated too aggressively?
- Benchmark WASM dithering performance on single frames vs batch processing
- Investigate if WebGL could accelerate preview rendering

**Potential Solutions to Explore:**
- Implement preview-quality mode (lower resolution for real-time feedback, full resolution on demand)
- Add debouncing/throttling specifically for video mode parameter changes
- Pre-compute dithered frames for nearby settings (predictive caching)
- Use OffscreenCanvas in workers for parallel frame processing during preview
- Implement progressive rendering (show partial results while processing)
- Consider WebGPU for GPU-accelerated dithering (ordered dithering especially)

**Success Criteria:**
- Settings changes should show visual feedback within 200ms for preview
- Full-quality render can take longer but should show progress indicator
- No stuttering or UI freezing during parameter adjustment

### Phase 9: Scripting API (TODO - Feature)
**Overview:** Add an HTTP API that runs when the application is active, allowing external scripts and tools to interface with ditherme programmatically. This enables automation, batch workflows, integration with other tools, and custom scripting.

**Core API Features:**
- RESTful HTTP API running on configurable localhost port (e.g., `http://localhost:7842`)
- API discovery endpoint (`/api/info`) listing available endpoints and capabilities
- An "API Documentation" menu bar button that leads to the api docs

**Endpoints to Implement:**
- `GET /api/status` - Application status, current settings, loaded image info
- `POST /api/load` - Load image/video from file path or base64 data
- `GET /api/algorithms` - List all available algorithms with parameters
- `POST /api/settings` - Update dithering settings (algorithm, palette, adjustments)
- `GET /api/settings` - Get current settings
- `POST /api/dither` - Trigger dithering with optional settings override
- `GET /api/result` - Get dithered result as base64 or download
- `POST /api/export` - Export with specific format/quality settings
- `GET /api/palettes` - List available palettes
- `POST /api/palette` - Set custom palette
- `POST /api/batch` - Queue batch processing job
- `GET /api/batch/:id` - Get batch job status/results

**WebSocket Events:**
- `progress` - Dithering/export progress updates

**Security Considerations:**
- API only binds to localhost by default
- Configurable in settings (enable/disable, port, auth)

**Use Cases:**
- Shell scripts for batch processing directories of images
- Integration with image editing workflows (Photoshop actions, etc.)
- Automated testing of dithering algorithms
- Building custom UIs or plugins that use ditherme as a backend
- Remote control from other applications

**Implementation Notes:**
- Use native `http` module in Electron, or lightweight server like `fastify` for web version. Choose the method that uses the least duplicate code. Ask for condfirmation after you are done researching.
- API should work in both web and Electron modes
- Document API with OpenAPI/Swagger spec and proper type documentation
- Use a seperate API module to house the API. Be DRY

---

## Code Quality Principles

### 1. DRY (Don't Repeat Yourself)
Every piece of knowledge should have a single, unambiguous representation.

### 2. Design by Contract
Functions should have clear preconditions, postconditions, and invariants. Use TypeScript to enforce contracts.

### 3. Decoupling & Separation of Concerns
Modules should be independent and communicate through well-defined interfaces.

### 4. Small Functions (Single Responsibility)
Each function should do ONE thing and do it well.

### 5. Functional Over OOP
Prefer pure functions, immutability, and composition over classes and mutation.

### 6. Readability & Self-Documenting Code
Code should be readable without comments. Use descriptive names and clear structure.

### 7. Configuration Over Code
Add new features by adding data/configuration, not by writing new code.

### 8. Error Handling
Handle errors gracefully with informative messages. Never swallow errors silently.

### 9. Immutability
Never mutate data. Always return new copies.

### 10. Testing Mindset
Write code that's easy to test. Pure functions with clear inputs/outputs are testable.

---

## Code Style Guidelines

### Framework Rules
1. **No UI frameworks** - NO React, Vue, Angular, Svelte
2. **Vanilla TypeScript only** - Use native DOM APIs
3. **Web Components optional** - For reusable widgets

### TypeScript Style
4. **Strict mode** - Enable strict in tsconfig.json
5. **Explicit types** - Type all function parameters and return values
6. **No `any`** - Use `unknown` if type is truly unknown

### General Style
7. **ES Modules** - Use import/export
8. **Async/await** - For all async operations
9. **Small functions** - Each function does one thing
10. **Error handling** - Try/catch with user-friendly messages

### State Management
11. **Single App class** - Centralized state with event emission
12. **Typed state** - AppState interface defines all state properties
13. **Immutable updates** - Don't mutate state directly, use `setState()`
14. **Event-driven** - Components subscribe to state changes

---

## Performance Targets

| Operation | Image Size | Target Time | Acceptable Time |
|-----------|-----------|-------------|-----------------|
| Threshold | 1080p | <10ms | <50ms |
| Ordered (GPU) | 1080p | <20ms | <100ms |
| Ordered (CPU) | 1080p | <50ms | <200ms |
| Floyd-Steinberg | 1080p | <100ms | <300ms |
| Error Diffusion (any) | 1080p | <150ms | <500ms |
| Riemersma | 1080p | <200ms | <600ms |
| DBS | 512x512 | <3000ms | <10000ms |

---

## WASM Integration Details

### Building WASM
```bash
cd wasm && ./build.sh
```

This compiles libdither to `public/wasm/libdither.{js,wasm}`.

### Key WASM Functions Used
- `_DitherImage_new(width, height)` - Create image buffer
- `_DitherImage_set_pixel(ptr, x, y, r, g, b, correctGamma)` - Set pixel (correctGamma=0!)
- `_DitherImage_get_pixel(ptr, x, y)` - Get pixel
- `_DitherImage_free(ptr)` - Free image buffer
- `_dither_*()` - Individual dithering algorithm functions

### Important WASM Notes
1. **Gamma correction**: Set `correctGamma = 0` when calling `_DitherImage_set_pixel`. Input is already sRGB.
2. **Buffer zeroing**: Zero the output buffer before each dither call to prevent corruption.
3. **Memory management**: Always free allocated buffers with `_DitherImage_free`.

---

## Resources

- [Original ditherme](https://github.com/robertkist/ditherme) - Reference implementation
- [libdither](https://github.com/robertkist/libdither) - Core dithering library in C (compiled to WASM)
- [Dithering Algorithms](https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html) - Algorithm explanations
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - Video processing (for Phase 5)
- [Electron](https://www.electronjs.org/) - Desktop packaging (for Phase 7)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Web dev server (Vite, port 5173)
npm run dev:electron     # Electron dev with hot reload
npm run build            # Web build (tsc + vite → dist/)
npm run build:electron   # Electron build for current platform
npm run typecheck        # TypeScript type-check only (no emit)
npm run typecheck:all    # Type-check web and Electron sources
npm run preview          # Preview production web build
```

```bash
cd wasm && ./build.sh    # Rebuild WASM (libdither C → public/wasm/)
```

Automated tests run with `npm test`. Verification also includes `npm run typecheck:all`, the production web/Electron builds, and the manual testing checklist in `AGENT_REFERENCE.md`.

## Architecture

**ditherme** is a vanilla TypeScript dithering app for images/video. The web app is the primary product and the cross-platform Electron desktop app is an optional add-on. No UI framework — all DOM manipulation is native.

### State

All state lives in a singleton `app` (`src/app.ts`) that extends `EventTarget`. State is read-only via `app.getState()` and updated exclusively via `app.setState()`. Never mutate state directly.

```typescript
app.setState({ algorithm: 'floyd-steinberg' }, true); // true = push undo history
app.on('statechange', (e) => { /* e.detail.changes, e.detail.previousState */ });
```

### Dithering Pipeline (`src/engine/dither.ts`)

1. `triggerDither()` is called on any settings change — debounced 50ms
2. Check `imageCache` (keyed by settings hash); skip processing on hit
3. On cache miss: `applyAdjustments` → `downscaleImage` → `reducePalette` → `ditherAsync` → `upscaleImage`
4. `ditherAsync` routes to WASM (`src/engine/wasm-dither.ts`) or JS fallback
5. Result cached, `dithercomplete` event emitted

### WASM Integration

- Source: `wasm/libdither/` — compiled to `public/wasm/libdither.{js,wasm}`
- **Critical**: Set `correctGamma = 0` (input is already sRGB)
- **Critical**: Zero output buffer before each dither call
- **Critical**: Always free buffers with `_DitherImage_free`
- WASM loads async on startup; JS implementations are always available as fallback

### Video Processing (`src/engine/video/`)

- **Extraction**: WebCodecs decoder for all browsers that support it; FFmpeg.wasm fallback for others. Source frames are indexed by a CTS→index map built from actual mp4box sample timestamps — do NOT use frame-rate-based index calculation (breaks on VFR video).
- **Dithering**: Worker pool (`src/workers/worker-pool.ts`) processes frames in parallel. Dithered frames are cached in `FrameCache` keyed by settings hash.
- **Encoding**: Separate capability detection for encoder vs decoder (`getEncoderCapability()` vs `getVideoCapability()`). Safari's WebCodecs encoder silently stalls — detected via `bitrateMode: 'quantizer'` TypeError, routes to FFmpeg.wasm encoder. MP4 output is remuxed through FFmpeg to fix Chromium's SPS for DaVinci Resolve compatibility.
- **Playback**: Timeline playback is gated on frame render completion (`waitingForRender` flag). The viewport calls `timeline.notifyFrameRendered()` after each frame is drawn. Prefetch is limited to 3 frames ahead to avoid flooding the worker queue.

### Electron (`electron/`)

- `main.ts` — window creation, app lifecycle
- `preload.ts` — IPC bridge (context isolation)
- `api-server.ts` — parked scripting API implementation, not wired into the alpha app
- Same renderer code as web version

## Key Conventions

- **No UI frameworks** — vanilla TS + native DOM APIs only
- **No `any`** — strict TypeScript throughout; use `unknown` if type is uncertain
- **Functional style** — prefer pure functions over classes
- Algorithm IDs: `kebab-case` (e.g., `floyd-steinberg`, `ordered-bayer8`)
- Init functions: `init*()` prefix; event handlers: `handle*()` prefix

## Adding Things

**New algorithm**: Add ID to `src/types/algorithms.ts`, register in `src/algorithms/index.ts`, add routing in `dispatchDither()`.

**New state**: Add to `AppState` in `src/types/state.ts`, add default in `src/app.ts` constructor, update via `app.setState()`.

**New dialog**: Follow the `Promise`-based pattern from any file in `src/ui/*-dialog.ts`. Append modal to `document.body`, handle Escape and backdrop click.

**New localStorage persistence**: Follow `src/utils/settings.ts` — extend `EventTarget`, load in constructor, call `localStorage.setItem` + `dispatchEvent` in a private `save()`.

## CSS

Single file: `src/styles/main.css`. CSS variables for theming on `:root`. BEM-ish class naming. Modal classes: `.modal`, `.modal-content`, `.modal-actions`.

## Full Reference

See `AGENT_REFERENCE.md` for complete event reference, localStorage keys, UI element IDs, and an expanded testing checklist.

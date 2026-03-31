# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Web dev server (Vite, port 5173)
npm run dev:electron     # Electron dev with hot reload
npm run build            # Web build (tsc + vite → dist/)
npm run build:electron   # Electron build for current platform
npm run typecheck        # TypeScript type-check only (no emit)
npm run preview          # Preview production web build
```

```bash
cd wasm && ./build.sh    # Rebuild WASM (libdither C → public/wasm/)
```

There are no automated tests. Verification is done via `npm run typecheck` and the manual testing checklist in `AGENT_REFERENCE.md`.

## Architecture

**ditherme** is a vanilla TypeScript dithering app for images/video. It runs as both a web app (Vite) and a cross-platform Electron desktop app. No UI framework — all DOM manipulation is native.

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

- **WebCodecs** API used in Chrome/Edge; **FFmpeg.wasm** fallback for Safari
- Frames are extracted, cached (hash-based), dithered via worker pool, then re-encoded

### Electron (`electron/`)

- `main.ts` — window creation, app lifecycle
- `preload.ts` — IPC bridge (context isolation)
- `api-server.ts` — HTTP API server on `localhost:7842`
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

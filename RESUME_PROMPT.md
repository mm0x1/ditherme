# Ditherista Development Resume Prompt

## Project Overview

Ditherista is a professional dithering application built with vanilla TypeScript + Canvas API. It converts images into dithered artwork using 100+ dithering algorithms with full color palette control.

**Stack:** TypeScript, Vanilla JS (no frameworks), Canvas API, Vite

## Current Status

### Completed Phases

**Phase 1: Core Foundation ✅**
- Project structure, Canvas viewport with zoom/pan, image loading (drag/drop, file picker), threshold dithering, image adjustments (brightness, contrast, gamma, saturation, black/white point)

**Phase 2: Dithering Algorithms (Partial) ✅**
- Error diffusion (Floyd-Steinberg + 11 kernels)
- Ordered dithering (Bayer 2x2 through 32x32)
- Algorithm parameter UI (serpentine, jitter, threshold)
- Pending: Riemersma, Pattern, Dot Diffusion, DBS

**Phase 3: Color Support ✅**
- 14 built-in palettes (Mono, CGA, EGA, Pico-8, C64, Game Boy, etc.)
- Color matching methods (Euclidean, CIE76, CIE94, CIEDE2000, Luminance)
- Color quantization (median-cut)
- Custom palette editor (2-16 colors with Coloris color picker)
- Auto-generate palette from image
- Pixel Scale (1x-16x integer block size)
- Levels/posterization (reduce palette to N colors)

### Pending Phases

**Phase 4: WebAssembly Optimization** - Not started
**Phase 5: Video Support** - Not started
**Phase 6: Polish & Features** - Not started
**Phase 7: Electron Packaging** - Not started

## Key Files

| File | Purpose |
|------|---------|
| `AI_BUILD_PROMPT.md` | Full specification with all algorithms, features, architecture |
| `BUGS.md` | Bug tracker with fixed issues |
| `src/app.ts` | Central state management (AppState, events) |
| `src/main.ts` | App initialization |
| `src/types/` | TypeScript interfaces (state.ts, algorithms.ts, palette.ts, options.ts) |
| `src/engine/dither.ts` | Dithering orchestration, pixel scale, levels |
| `src/engine/adjustments.ts` | Brightness, contrast, gamma, saturation, black/white point |
| `src/engine/color.ts` | Color space conversions, matching algorithms |
| `src/algorithms/` | Dithering implementations (error-diffusion.ts, ordered.ts, threshold.ts) |
| `src/ui/` | UI components (sidebar.ts, viewport.ts, adjustments.ts, palette.ts) |
| `src/data/matrices/` | Bayer and other dither matrices |
| `src/data/palettes/presets.ts` | Built-in palette definitions |
| `src/utils/quantize.ts` | Median-cut color quantization |
| `index.html` | Main HTML with all UI structure |

## Recent Bug Fixes

1. **Fractional Pixel Scale Ghosting** - Fixed by restricting to integers only
2. **Grey Dithering in Dark Areas** - Added optional Black/White Point sliders
3. **Levels Only Using 2 Colors** - Fixed mono algorithms to use full palette
4. **Color Match Not Working** - Fixed by passing colorMatchMethod to algorithms
5. **Safari Color Picker** - Fixed Coloris positioning issue

## Architecture Notes

- **State Management:** Centralized in `app.ts` via `App` class extending EventTarget
- **Event-Driven:** Components subscribe to `statechange` events
- **Processing Pipeline:** Source image → Adjustments → Pixel Scale (downscale) → Dither → Upscale → Display
- **Mono vs Color:** Separate algorithm paths; mono uses luminance, color uses full RGB with palette matching

## Commands

```bash
npm run dev    # Start development server
npm run build  # Production build
npm run lint   # TypeScript checking
```

## Next Steps

Choose from:
1. **Phase 2 completion:** Implement remaining algorithms (Riemersma, Pattern, Dot Diffusion, DBS)
2. **Phase 4:** WebAssembly optimization for performance
3. **Phase 5:** Video support with FFmpeg.wasm
4. **Phase 6:** Polish (caching, batch processing, keyboard shortcuts)
5. **Bug fixes:** Check BUGS.md or report new issues

## Instructions for AI

1. Read `AI_BUILD_PROMPT.md` for full specification
2. Check `BUGS.md` for known issues
3. Use TodoWrite tool to track multi-step tasks
4. Follow existing code patterns (functional style, typed events, pure functions)
5. Test changes with `npm run dev`

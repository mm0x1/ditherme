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

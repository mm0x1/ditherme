# dithertoy

A cross-platform dithering application for images and videos.

![dithertoy screenshot](thumbnails/screenshot.png)

## Background

This project was inspired by [Ditherista](https://github.com/robertkist/ditherista), an excellent dithering application. However, Ditherista's video support was pending via a PR, and I had difficulty building it to work on my Linux machine. I ended up vibe coding this because I really wanted an offline dithering application with video support, and it was fun to make.

This is a hobby project and not meant for professional use.

## Features

- **Image & Video Support** - Dither images or videos with real-time preview
- **90+ Dithering Algorithms**
  - Error Diffusion (Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Stucki, Sierra, etc.)
  - Ordered (Bayer matrices 2x2 to 32x32, Blue Noise, Clustered Dot)
  - Riemersma (Hilbert, Peano, Gosper, Fass curves)
  - Pattern, Dot Diffusion, Variable Error Diffusion
  - Direct Binary Search, Grid, Kacker-Allebach
- **Preset Palettes** - Mono, Grayscale, CGA, EGA, Pico-8, Game Boy, Commodore 64, NES, Web Safe 216, and more
- **Custom Palettes** - Create and save your own color palettes
- **Image Adjustments** - Brightness, contrast, gamma, saturation, black/white point
- **Batch Processing** - Process multiple images at once
- **WASM Acceleration** - Faster processing for supported algorithms
- **Cross-Platform** - Runs on macOS, Linux, and Windows (Electron app)
- **Web Version** - Also available as a browser-based application

## Installation

Download the latest release for your platform from the [Releases](https://github.com/mm0x1/ditherme/releases) page.

## Development

```bash
# Install dependencies
npm install

# Run web version
npm run dev

# Run Electron version
npm run dev:electron

# Build for current platform
npm run build:electron
```

## License

MIT

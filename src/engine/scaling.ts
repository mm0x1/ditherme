/**
 * Shared image scaling utilities used by both the main dither engine and video worker.
 */

/**
 * Downscale image by a factor using box averaging (for pixel scale effect)
 */
export function downscaleImage(input: ImageData, scale: number): ImageData {
    if (scale <= 1) return input;

    const newWidth = Math.max(1, Math.floor(input.width / scale));
    const newHeight = Math.max(1, Math.floor(input.height / scale));

    const output = new ImageData(newWidth, newHeight);
    const outData = output.data;
    const inData = input.data;

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = 0; dy < scale; dy++) {
                for (let dx = 0; dx < scale; dx++) {
                    const sx = x * scale + dx;
                    const sy = y * scale + dy;
                    if (sx < input.width && sy < input.height) {
                        const idx = (sy * input.width + sx) * 4;
                        r += inData[idx];
                        g += inData[idx + 1];
                        b += inData[idx + 2];
                        a += inData[idx + 3];
                        count++;
                    }
                }
            }

            const outIdx = (y * newWidth + x) * 4;
            if (count > 0) {
                outData[outIdx] = Math.round(r / count);
                outData[outIdx + 1] = Math.round(g / count);
                outData[outIdx + 2] = Math.round(b / count);
                outData[outIdx + 3] = Math.round(a / count);
            }
        }
    }

    return output;
}

/**
 * Upscale image to target dimensions using nearest-neighbor (for blocky pixel effect)
 */
export function upscaleImage(input: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const output = new ImageData(targetWidth, targetHeight);
    const outData = output.data;
    const inData = input.data;

    const scaleX = input.width / targetWidth;
    const scaleY = input.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const sx = Math.floor(x * scaleX);
            const sy = Math.floor(y * scaleY);
            const srcIdx = (sy * input.width + sx) * 4;
            const dstIdx = (y * targetWidth + x) * 4;

            outData[dstIdx] = inData[srcIdx];
            outData[dstIdx + 1] = inData[srcIdx + 1];
            outData[dstIdx + 2] = inData[srcIdx + 2];
            outData[dstIdx + 3] = inData[srcIdx + 3];
        }
    }

    return output;
}

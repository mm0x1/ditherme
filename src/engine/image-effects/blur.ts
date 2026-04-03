export async function blurImageData(input: ImageData, radius: number): Promise<ImageData> {
    if (radius <= 0) return input;
    const canvas = new OffscreenCanvas(input.width, input.height);
    const ctx = canvas.getContext('2d')!;
    ctx.filter = `blur(${Math.round(radius)}px)`;
    const bitmap = await createImageBitmap(input);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, input.width, input.height);
}

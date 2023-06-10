import { hsv, rgb } from "color-convert";

export type Pixel = [number, number, number];

// export const IS_WORKER =
// typeof global.WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;

export function resizeImage(
  img: HTMLImageElement,
  width: number,
  height: number
): ImageData {
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (OffscreenCanvas) {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
  }
  if (ctx) {
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } else {
    return new ImageData(1, 1);
  }
}

/**
 * 将过亮和过暗的颜色的明度进行限制，有助于作为背景配色时保证文字便于阅读
 * @param color 需要进行变换的颜色
 * @returns 返回一个经过调整的颜色
 */
export const normalizeColor = (color: Pixel): Pixel => {
  const hsvColor = rgb.hsv.raw(color);

  hsvColor[2] = Math.min(80, Math.max(20, hsvColor[2]));

  return hsv.rgb(hsvColor);
};

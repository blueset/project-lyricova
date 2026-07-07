import type { Tag } from "@/frontendUtils/restTypes";

/**
 * Tag colour gradients, interpolated in the OKLCH colour space.
 *
 * `generateColorGradient` emits a CSS string, so it can lean on the native
 * `color-interpolation-method` (`linear-gradient(in oklch …)`) and let the
 * browser do the interpolation. `generateColorGradientFunction` feeds a
 * `<canvas>` `fillStyle`, which needs a concrete colour value per position, so
 * it samples the gradient via a small self-contained OKLCH implementation.
 * Either way, no external colour library is needed.
 */

const LIGHTEN_L = 0.15;

/**
 * CSS gradient string, interpolated natively in OKLCH.
 *
 * Used for plain CSS backgrounds (including a server component), so it must stay
 * SSR-safe: the multi-tag path just joins the raw colours and lets the browser
 * interpolate; the single-tag path derives a lighter stop with relative-colour
 * syntax so no colour parsing happens here.
 */
export function generateColorGradient(
  tags: Pick<Tag, "color">[],
  forceGradient = true
) {
  if (tags.length === 0) return "";
  if (tags.length === 1 && !forceGradient) return tags[0].color;
  const stops =
    tags.length === 1
      ? [
          tags[0].color,
          `oklch(from ${tags[0].color} calc(l + ${LIGHTEN_L}) c h)`,
        ]
      : tags.map((tag) => tag.color);
  return `linear-gradient(in oklch to right, ${stops.join(", ")})`;
}

/**
 * Sampler returning the OKLCH-interpolated `rgb(…)` colour at `pos` (0–1).
 *
 * Needed because the consumer paints onto a `<canvas>` and requires a concrete
 * colour value per position.
 */
export function generateColorGradientFunction(
  tags: Pick<Tag, "color">[],
  forceGradient = true
): (pos: number) => string {
  if (tags.length === 0) return () => "white";
  if (tags.length === 1 && !forceGradient) return () => tags[0].color;
  const colors = toOklchStops(tags, forceGradient);
  const segments = colors.length - 1;
  return (pos: number) => {
    const scaled = pos * segments;
    const idx = Math.min(Math.max(Math.floor(scaled), 0), segments - 1);
    return oklchToRgbString(mixOklch(colors[idx], colors[idx + 1], scaled - idx));
  };
}

// --- OKLCH helpers (self-contained; used by the JS-side consumers above) ---

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function toOklchStops(
  tags: Pick<Tag, "color">[],
  forceGradient: boolean
): Oklch[] {
  const colors = tags.map((tag) => rgbToOklch(parseColor(tag.color)));
  if (forceGradient && colors.length === 1) {
    colors.push({ ...colors[0], l: Math.min(1, colors[0].l + LIGHTEN_L) });
  }
  return colors;
}

function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  return {
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: mixHue(a.h, b.h, t),
  };
}

// Interpolate hue along the shorter arc, matching colorjs.io's `hue: "shorter"`.
function mixHue(a: number, b: number, t: number): number {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  return (((a + delta * t) % 360) + 360) % 360;
}

function rgbToOklch([r, g, b]: [number, number, number]): Oklch {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToRgbString({ l: L, c, h }: Oklch): string {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);

  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function to255(c: number): number {
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const parseCache = new Map<string, [number, number, number]>();
let parseCtx: CanvasRenderingContext2D | null | undefined;

/**
 * Parse any CSS colour to [r, g, b] (0–255). Hex is handled directly (also
 * SSR-safe); other formats fall back to a memoised throwaway canvas in the
 * browser. These helpers only run in client components, so the canvas is
 * available; the hex fast-path covers the common tag-colour case regardless.
 */
function parseColor(css: string): [number, number, number] {
  const cached = parseCache.get(css);
  if (cached) return cached;

  const trimmed = css.trim();
  let rgb = parseHex(trimmed);
  if (!rgb && typeof document !== "undefined") {
    if (parseCtx === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      parseCtx = canvas.getContext("2d");
    }
    if (parseCtx) {
      parseCtx.clearRect(0, 0, 1, 1);
      parseCtx.fillStyle = "#000";
      parseCtx.fillStyle = trimmed;
      parseCtx.fillRect(0, 0, 1, 1);
      const data = parseCtx.getImageData(0, 0, 1, 1).data;
      rgb = [data[0], data[1], data[2]];
    }
  }
  const result = rgb ?? [0, 0, 0];
  parseCache.set(css, result);
  return result;
}

function parseHex(css: string): [number, number, number] | null {
  if (!HEX_RE.test(css)) return null;
  let hex = css.slice(1);
  if (hex.length <= 4) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

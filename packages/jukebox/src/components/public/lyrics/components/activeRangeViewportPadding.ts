import type { LyricsViewportPadding } from "./lyricsLayoutProjection";

const ROW_TOP_PADDING_PX = 16;
const MASK_START_FRACTION = 0.7;
const MASK_GUARD_FRACTION = 0.2;

function futureLineGuard(fontSize: number, viewportHeight: number): number {
  const safeFontSize = Number.isFinite(fontSize) ? Math.max(0, fontSize) : 0;
  const safeViewportHeight = Number.isFinite(viewportHeight)
    ? Math.max(0, viewportHeight)
    : 0;
  if (safeViewportHeight === 0) return 0;

  return (
    ROW_TOP_PADDING_PX +
    safeFontSize +
    safeViewportHeight * MASK_START_FRACTION * MASK_GUARD_FRACTION
  );
}

/** Reserve one future main-text line above a layout's bottom fade. */
export function bottomFutureLineViewportPadding(
  fontSize: number,
  viewportHeight: number,
): LyricsViewportPadding {
  return {
    top: 0,
    bottom: futureLineGuard(fontSize, viewportHeight),
  };
}

/** Reserve matching past/future context around a center-aligned lyric range. */
export function centeredFutureLineViewportPadding(
  fontSize: number,
  viewportHeight: number,
): LyricsViewportPadding {
  const guard = futureLineGuard(fontSize, viewportHeight);
  return { top: guard, bottom: guard };
}

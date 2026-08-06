import type { ClusterTransform, FillDirection } from "./canvasGlyphGeometry";

/**
 * Deterministic per-cluster entrance animation for the Glyph Canvas renderer.
 *
 * The renderer paints each safe shaped cluster as an independently
 * transformable unit (see `canvasGlyphRenderer.ts`), but never splits a shaped
 * cluster. This module maps a single scalar `progress` (derived from the same
 * `PlaybackSnapshot` that drives the karaoke fill - never from wall-clock time
 * or React state) to a modest translate/scale/opacity entrance, proving that
 * clusters can animate independently without re-shaping.
 *
 * Everything is pure and deterministic: the same `progress` always yields the
 * same transform, `progress <= 0` is the fully-entering pose, and
 * `progress >= 1` is the identity (settled) pose.
 */

export interface ClusterEntranceStyle {
  /** Cluster opacity in `[0, 1]`. */
  opacity: number;
  /** Independent translate/scale to apply to the cluster. */
  transform: ClusterTransform;
}

export interface ClusterEntranceOptions {
  /** Vertical rise distance (cluster-local screen px) at `progress = 0`. Default `0.35em`-ish. */
  translateY?: number;
  /** Horizontal slide distance (px) from the fill side at `progress = 0`. Default small. */
  translateX?: number;
  /** Scale at `progress = 0` (grows to `1`). Default `0.94`. */
  minScale?: number;
  /** Opacity at `progress = 0` (grows to `1`). Default `0.2`. */
  minOpacity?: number;
}

const DEFAULTS: Required<ClusterEntranceOptions> = {
  translateY: 12,
  translateX: 6,
  minScale: 0.94,
  minOpacity: 0.2,
};

/** Clamps to `[0, 1]`, mapping `NaN` to `0`. */
function clamp01(value: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Smoothstep easing (`3t^2 - 2t^3`) over a clamped `[0, 1]` input. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Computes a cluster's entrance {@link ClusterEntranceStyle} for a given
 * `progress` in `[0, 1]`.
 *
 * The cluster starts slightly below its final position (rising up), nudged in
 * from the direction the karaoke fill flows from (so LTR clusters slide in
 * from the left, RTL from the right - honoring the cluster's bidi fill
 * direction), scaled down and faded, and eases to the identity pose as
 * `progress -> 1`. Distances/scale/opacity are modest by default and fully
 * configurable.
 */
export function clusterEntrance(
  progress: number,
  fillDirection: FillDirection = "ltr",
  options: ClusterEntranceOptions = {},
): ClusterEntranceStyle {
  const { translateY, translateX, minScale, minOpacity } = {
    ...DEFAULTS,
    ...options,
  };
  const eased = smoothstep(progress);
  const remaining = 1 - eased;

  // Slide in from the fill's leading side: LTR fills grow left->right, so the
  // cluster enters from the left (negative x); RTL enters from the right.
  const xSign = fillDirection === "rtl" ? 1 : -1;

  return {
    opacity: minOpacity + (1 - minOpacity) * eased,
    transform: {
      translate: {
        x: xSign * translateX * remaining,
        // Screen space is y-down, so a positive y starts the cluster *below*
        // its baseline and it rises to 0.
        y: translateY * remaining,
      },
      scale: minScale + (1 - minScale) * eased,
    },
  };
}

export interface ClusterEntranceProgressParams {
  /** Continuous revealed logical offset (fractional UTF-16 units). */
  revealed: number;
  /** Cluster logical start (UTF-16). */
  clusterStartUtf16: number;
  /**
   * How far ahead of the reveal front (in UTF-16 units) a cluster begins its
   * entrance. Larger values start the animation earlier. Must be `> 0`.
   */
  lead: number;
}

/**
 * Derives a cluster's entrance `progress` from the shared revealed offset: a
 * cluster begins entering `lead` UTF-16 units *before* the reveal front
 * reaches its start and is fully settled by the time the front arrives. This
 * ties the entrance to the same snapshot-driven reveal as the karaoke fill,
 * with no independent timing source, while still animating each cluster
 * independently.
 */
export function clusterEntranceProgress(
  params: ClusterEntranceProgressParams,
): number {
  const { revealed, clusterStartUtf16, lead } = params;
  if (!(lead > 0)) return revealed >= clusterStartUtf16 ? 1 : 0;
  return clamp01((revealed - (clusterStartUtf16 - lead)) / lead);
}

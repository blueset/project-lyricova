export interface WebAudioPlaybackSegment {
  contextTime: number;
  progress: number;
  rate: number;
  endContextTime?: number;
}

/**
 * Convert a performance-clock instant to the AudioContext time being presented.
 */
export function outputContextTimeAtPerformanceTime(
  timestamp: AudioTimestamp,
  performanceTime: number,
): number | null {
  const contextTime = timestamp.contextTime;
  const outputPerformanceTime = timestamp.performanceTime;
  if (
    typeof contextTime !== "number" ||
    typeof outputPerformanceTime !== "number" ||
    !Number.isFinite(contextTime) ||
    !Number.isFinite(outputPerformanceTime) ||
    !Number.isFinite(performanceTime)
  ) {
    return null;
  }

  return contextTime + (performanceTime - outputPerformanceTime) / 1000;
}

/**
 * Resolve media progress on the piecewise playback timeline at a context time.
 */
export function playbackProgressAtContextTime(
  segments: readonly WebAudioPlaybackSegment[],
  contextTime: number,
): number | null {
  if (segments.length === 0 || !Number.isFinite(contextTime)) return null;

  for (let index = segments.length - 1; index >= 0; index--) {
    const segment = segments[index]!;
    if (contextTime < segment.contextTime) continue;

    const effectiveContextTime = Math.min(
      contextTime,
      segment.endContextTime ?? Infinity,
    );
    return (
      segment.progress +
      (effectiveContextTime - segment.contextTime) * segment.rate
    );
  }

  return segments[0]!.progress;
}

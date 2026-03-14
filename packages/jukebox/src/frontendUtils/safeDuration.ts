/**
 * Validates and returns a safe positive duration from start/end times.
 * Logs a console error if the duration is non-positive or NaN.
 *
 * @param start - Start time in seconds
 * @param end - End time in seconds
 * @param minDuration - Minimum duration to clamp to (default: 0.1)
 * @param context - Optional context object logged alongside errors
 * @returns A duration guaranteed to be at least `minDuration` and not NaN
 */
export function safeDuration(
  start: number,
  end: number,
  minDuration = 0.1,
  context?: Record<string, unknown>,
): number {
  const raw = end - start;
  if (isNaN(raw)) {
    console.error("Invalid duration: result is NaN", {
      start,
      end,
      ...context,
    });
    return minDuration;
  }
  if (raw <= 0) {
    console.error(
      "Invalid duration: end time should be greater than start time",
      { start, end, ...context },
    );
  }
  return Math.max(minDuration, raw);
}

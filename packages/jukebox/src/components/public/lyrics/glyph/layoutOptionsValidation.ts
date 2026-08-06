import { RubyLayoutOptionsError } from "./types";

/**
 * Asserts `value` is a finite, strictly positive number (used for
 * `fontSize`/`rubyFontSize`: a non-positive or non-finite size can't be
 * shaped and must never silently propagate as `NaN`/`Infinity` into
 * downstream advance/position math).
 */
export function assertFinitePositiveSize(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RubyLayoutOptionsError(
      `${name} must be a finite, positive number (got ${value}).`,
    );
  }
}

/**
 * Asserts `value` is a finite, non-negative number (used for `rubyGap`: `0`
 * is valid - no extra gap - but a negative or non-finite gap must never
 * silently propagate into line metrics).
 */
export function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RubyLayoutOptionsError(
      `${name} must be a finite, non-negative number (got ${value}).`,
    );
  }
}

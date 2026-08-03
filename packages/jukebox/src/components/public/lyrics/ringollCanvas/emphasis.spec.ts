import { describe, expect, it } from "vitest";
import {
  BASE_FLOAT_RISE_EM,
  BASE_FLOAT_RISE_MINOR_EM,
  BOB_AMPLITUDE_EM,
  BOB_AMPLITUDE_MINOR_EM,
  baseFloatOffsetEm,
  charEmphasis,
  cubicBezier,
  emphasisBobOffsetEm,
  emphasisEnvelope,
  emphasisParams,
  shouldEmphasize,
} from "./emphasis";

describe("shouldEmphasize", () => {
  it("gates on the 1000 ms (1 s) duration boundary, inclusively", () => {
    // duration is in seconds; the trigger is 1 s. Use a 2-7 char non-CJK word.
    expect(shouldEmphasize({ duration: 1 }, "word")).toBe(true);
    expect(shouldEmphasize({ duration: 0.999 }, "word")).toBe(false);
  });

  it("applies the 2-7 character window to non-CJK words", () => {
    expect(shouldEmphasize({ duration: 2 }, "a")).toBe(false); // length 1
    expect(shouldEmphasize({ duration: 2 }, "ab")).toBe(true); // length 2
    expect(shouldEmphasize({ duration: 2 }, "abcdefg")).toBe(true); // length 7
    expect(shouldEmphasize({ duration: 2 }, "abcdefgh")).toBe(false); // length 8
  });

  it("exempts CJK / kana / Hangul words from the length window", () => {
    expect(shouldEmphasize({ duration: 2 }, "強")).toBe(true); // Han, length 1
    expect(shouldEmphasize({ duration: 2 }, "こんにちは")).toBe(true); // kana
    expect(shouldEmphasize({ duration: 2 }, "한")).toBe(true); // Hangul, length 1
    // Still gated on duration even when CJK.
    expect(shouldEmphasize({ duration: 0.5 }, "強")).toBe(false);
  });

  it("can bypass the length window via requireLengthWindow: false", () => {
    expect(
      shouldEmphasize({ duration: 2 }, "abcdefgh", {
        requireLengthWindow: false,
      }),
    ).toBe(true);
    expect(
      shouldEmphasize({ duration: 2 }, "a", { requireLengthWindow: false }),
    ).toBe(true);
  });
});

describe("emphasisParams", () => {
  it("matches the worked example at du = 1000 (not last)", () => {
    const { amount, blur, durationMs } = emphasisParams(1000, false);
    expect(amount).toBeCloseTo(0.075, 10); // 0.5^3 * 0.6
    expect(blur).toBeCloseTo((1 / 3) ** 3 * 0.5, 10); // ~= 0.0185
    expect(durationMs).toBe(1000);
  });

  it("reaches amount 0.6 at du = 2000", () => {
    const { amount, durationMs } = emphasisParams(2000, false);
    expect(amount).toBeCloseTo(0.6, 10); // shape(1) * 0.6
    expect(durationMs).toBe(2000);
  });

  it("matches the worked example at du = 4000 (sqrt branch)", () => {
    const { amount, blur } = emphasisParams(4000, false);
    expect(amount).toBeCloseTo(Math.sqrt(2) * 0.6, 10); // ~= 0.848
    expect(blur).toBeCloseTo(Math.sqrt(4 / 3) * 0.5, 10); // ~= 0.577
  });

  it("saturates amount at 1.2 and blur at 0.8", () => {
    const { amount, blur } = emphasisParams(100000, false);
    expect(amount).toBe(1.2);
    expect(blur).toBe(0.8);
  });

  it("boosts a line's last word (amount x1.6, blur x1.5, du x1.2)", () => {
    const base = emphasisParams(1000, false);
    const last = emphasisParams(1000, true);
    expect(last.amount).toBeCloseTo(base.amount * 1.6, 10);
    expect(last.blur).toBeCloseTo(base.blur * 1.5, 10);
    expect(last.durationMs).toBe(1200);
  });

  it("clamps du up to at least 1000 ms before use", () => {
    expect(emphasisParams(500, false).durationMs).toBe(1000);
    expect(emphasisParams(500, true).durationMs).toBe(1200); // 1000 * 1.2
  });
});

describe("emphasisEnvelope", () => {
  it("is a 0 -> 1 -> 0 pulse peaking at x = 0.5", () => {
    expect(emphasisEnvelope(0)).toBe(0);
    expect(emphasisEnvelope(0.5)).toBe(1);
    expect(emphasisEnvelope(1)).toBe(0);
  });

  it("rises monotonically to the peak, then falls monotonically", () => {
    // Sample points chosen not to straddle the 0.5 peak.
    const rising = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    for (let i = 1; i < rising.length; i += 1) {
      expect(emphasisEnvelope(rising[i])).toBeGreaterThan(
        emphasisEnvelope(rising[i - 1]),
      );
    }
    const falling = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
    for (let i = 1; i < falling.length; i += 1) {
      expect(emphasisEnvelope(falling[i])).toBeLessThan(
        emphasisEnvelope(falling[i - 1]),
      );
    }
  });

  it("stays within [0, 1] and is symmetric-ish about the peak", () => {
    for (let x = 0; x <= 1.00001; x += 0.05) {
      const e = emphasisEnvelope(x);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
    // Mirrored samples are both high (near the peak) rather than identical.
    expect(emphasisEnvelope(0.25)).toBeGreaterThan(0.3);
    expect(emphasisEnvelope(0.75)).toBeGreaterThan(0.3);
  });

  it("resolves to 0 outside [0, 1]", () => {
    expect(emphasisEnvelope(-0.5)).toBe(0);
    expect(emphasisEnvelope(1.5)).toBe(0);
  });
});

describe("cubicBezier", () => {
  it("is the identity for cubicBezier(0, 0, 1, 1)", () => {
    const identity = cubicBezier(0, 0, 1, 1);
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(identity(x)).toBeCloseTo(x, 6);
    }
  });

  it("pins the exact endpoints for a non-linear curve", () => {
    const ease = cubicBezier(0, 0, 0.58, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("is monotonically increasing", () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    let previous = -Infinity;
    for (let x = 0; x <= 1.00001; x += 0.05) {
      const y = ease(x);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });

  it("returns 0.5 at the midpoint of a point-symmetric ease-in-out", () => {
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  it("rejects x control points outside [0, 1]", () => {
    expect(() => cubicBezier(1.2, 0, 0.5, 1)).toThrow(RangeError);
    expect(() => cubicBezier(0, 0, -0.1, 1)).toThrow(RangeError);
  });
});

describe("charEmphasis", () => {
  const params = emphasisParams(2000, false); // amount 0.6, du 2000
  const n = 4;

  it("is at rest before the character's window opens", () => {
    const rest = charEmphasis(params, 0, n, -1000, 0);
    expect(rest.scale).toBe(1);
    expect(rest.offsetXEm).toBeCloseTo(0, 10); // may be IEEE -0
    expect(rest.offsetYEm).toBeCloseTo(0, 10); // may be IEEE -0
    expect(rest.glowAlpha).toBeCloseTo(0, 10);
  });

  it("reaches its documented peak pose at x = 0.5", () => {
    // Character 0 peaks at wordStart + du/2 = 1000.
    const peak = charEmphasis(params, 0, n, 1000, 0);
    expect(peak.scale).toBeCloseTo(1 + 0.1 * params.amount, 6);
    expect(peak.offsetYEm).toBeCloseTo(-0.025 * params.amount, 6);
    expect(peak.glowAlpha).toBeCloseTo(params.blur, 6);
  });

  it("spreads glyphs outward from the word centre", () => {
    // At each glyph's own peak, left-of-centre drifts left, right drifts right.
    const leftPeak = charEmphasis(params, 0, n, 1000, 0); // i=0, left
    const rightStagger = (params.durationMs / (2.5 * n)) * (n - 1);
    const rightPeak = charEmphasis(
      params,
      n - 1,
      n,
      rightStagger + params.durationMs / 2,
      0,
    ); // i=3, right
    expect(leftPeak.offsetXEm).toBeLessThan(0);
    expect(rightPeak.offsetXEm).toBeGreaterThan(0);
  });

  it("staggers characters so later ones peak later", () => {
    // Peak time for character i is stagger_i + du/2; assert it increases with i
    // by checking each glyph is at (near) full envelope at its own peak time.
    let previousPeakTime = -Infinity;
    for (let i = 0; i < n; i += 1) {
      const stagger = (params.durationMs / (2.5 * n)) * i;
      const peakTime = stagger + params.durationMs / 2;
      expect(peakTime).toBeGreaterThan(previousPeakTime);
      previousPeakTime = peakTime;
      expect(charEmphasis(params, i, n, peakTime, 0).scale).toBeCloseTo(
        1 + 0.1 * params.amount,
        6,
      );
    }
    // At a fixed moment during the rise, earlier glyphs lead later ones.
    const alphas = Array.from(
      { length: n },
      (_, i) => charEmphasis(params, i, n, 1000, 0).glowAlpha,
    );
    for (let i = 1; i < n; i += 1) {
      expect(alphas[i]).toBeLessThan(alphas[i - 1]);
    }
  });

  it("holds the glow radius constant (only the alpha pulses)", () => {
    const expected = Math.min(0.3, params.blur * 0.3);
    expect(charEmphasis(params, 0, n, 1000, 0).glowRadiusEm).toBeCloseTo(
      expected,
      6,
    );
    expect(charEmphasis(params, 0, n, -1000, 0).glowRadiusEm).toBeCloseTo(
      expected,
      6,
    );
  });

  it("keeps every output finite for a degenerate zero or negative durationMs", () => {
    // charEmphasis divides by du (and 2.5*n). clamp01 sanitises the resulting
    // Infinity/NaN phase, so even a hand-built params can never emit a
    // non-finite pose that would poison the canvas transform.
    for (const du of [0, -2000]) {
      const degenerate = { amount: 0.6, blur: 0.5, durationMs: du };
      for (let i = 0; i < n; i += 1) {
        for (const t of [-1000, 0, 1000, 5000]) {
          const pose = charEmphasis(degenerate, i, n, t, 0);
          expect(Number.isFinite(pose.scale)).toBe(true);
          expect(Number.isFinite(pose.offsetXEm)).toBe(true);
          expect(Number.isFinite(pose.offsetYEm)).toBe(true);
          expect(Number.isFinite(pose.glowAlpha)).toBe(true);
          expect(Number.isFinite(pose.glowRadiusEm)).toBe(true);
        }
      }
    }
  });
});

describe("baseFloatOffsetEm", () => {
  it("is 0 at wordStart and reaches full amplitude at wordStart + max(1000, duration)", () => {
    // Difference-based: a non-zero wordStart shifts the whole curve.
    expect(baseFloatOffsetEm(500, 500, 2000)).toBeCloseTo(0, 10); // at wordStart
    expect(baseFloatOffsetEm(2500, 500, 2000)).toBeCloseTo(-0.05, 6); // at end
  });

  it("increases monotonically in magnitude toward the lift", () => {
    let previous = Infinity;
    for (let t = 0; t <= 2000; t += 200) {
      const y = baseFloatOffsetEm(t, 0, 2000);
      expect(y).toBeLessThanOrEqual(previous);
      previous = y;
    }
  });

  it("uses an ease-out curve (past halfway down by the temporal midpoint)", () => {
    // ease-out is fast then slow, so at t = du/2 it is already more than half
    // of the -0.05 em travel.
    expect(baseFloatOffsetEm(1000, 0, 2000)).toBeLessThan(-0.025);
  });

  it("is a persistent one-way lift: it holds at full amplitude and never returns to 0", () => {
    const atEnd = baseFloatOffsetEm(2000, 0, 2000);
    const wellAfter = baseFloatOffsetEm(10_000, 0, 2000);
    const muchLater = baseFloatOffsetEm(1_000_000, 0, 2000);
    expect(atEnd).toBeCloseTo(-0.05, 6);
    expect(wellAfter).toBeCloseTo(-0.05, 6);
    expect(muchLater).toBeCloseTo(-0.05, 6);
    // Crucially it does NOT decay back toward 0 like a 0 -> 1 -> 0 envelope.
    expect(wellAfter).toBeCloseTo(atEnd, 10);
    expect(muchLater).toBeCloseTo(atEnd, 10);
  });

  it("rests at 0 before the word starts", () => {
    expect(baseFloatOffsetEm(-500, 0, 2000)).toBeCloseTo(0, 10); // may be IEEE -0
  });

  it("floors the float duration at 1000 ms, so short words still take 1000 ms", () => {
    // A 200 ms word is only ~1/5 through the 1000 ms floor at its own end.
    expect(baseFloatOffsetEm(200, 0, 200)).toBeGreaterThan(-0.05); // not full yet
    expect(baseFloatOffsetEm(200, 0, 200)).toBeLessThan(0); // but already rising
    // Full amplitude is reached only at the 1000 ms floor.
    expect(baseFloatOffsetEm(1000, 0, 200)).toBeCloseTo(-0.05, 6);
  });

  it("defaults to the 0.05 em amplitude and lets minor/background lines override to 0.1 em", () => {
    expect(baseFloatOffsetEm(2000, 0, 2000)).toBeCloseTo(
      -BASE_FLOAT_RISE_EM,
      6,
    );
    expect(
      baseFloatOffsetEm(2000, 0, 2000, {
        amplitudeEm: BASE_FLOAT_RISE_MINOR_EM,
      }),
    ).toBeCloseTo(-BASE_FLOAT_RISE_MINOR_EM, 6);
    // The minor amplitude is exactly double at any shared progress.
    const normal = baseFloatOffsetEm(700, 0, 2000);
    const minor = baseFloatOffsetEm(700, 0, 2000, {
      amplitudeEm: BASE_FLOAT_RISE_MINOR_EM,
    });
    expect(minor).toBeCloseTo(2 * normal, 10);
  });

  it("uses an unambiguous sign convention: the lift is negative (up is -y)", () => {
    // Screen/canvas space is y-down, so an upward lift is negative y, and the
    // value is never positive.
    expect(baseFloatOffsetEm(2000, 0, 2000)).toBeLessThan(0);
    for (let t = -500; t <= 3000; t += 250) {
      expect(baseFloatOffsetEm(t, 0, 2000)).toBeLessThanOrEqual(0);
    }
  });

  it("preserves persistence and the sign convention under the minor override", () => {
    const opts = { amplitudeEm: BASE_FLOAT_RISE_MINOR_EM };
    // Reaches the doubled amplitude at the floor and then holds it forever
    // (never decaying back toward 0).
    expect(baseFloatOffsetEm(2000, 0, 2000, opts)).toBeCloseTo(-0.1, 6);
    expect(baseFloatOffsetEm(1_000_000, 0, 2000, opts)).toBeCloseTo(-0.1, 6);
    // Sign convention still holds: never positive across the whole timeline.
    for (let t = -500; t <= 3000; t += 250) {
      expect(baseFloatOffsetEm(t, 0, 2000, opts)).toBeLessThanOrEqual(0);
    }
  });
});

describe("emphasisBobOffsetEm", () => {
  const params = emphasisParams(1000, false); // du 1000

  it("is already dipping at wordStart because it began 400 ms earlier", () => {
    // The scale/glow clock only starts at wordStart, but the bob is underway.
    expect(emphasisBobOffsetEm(params, 0, 0)).toBeLessThan(0);
  });

  it("peaks at -0.05 em, and that peak leads the scale/glow peak", () => {
    // Bob peak: (wordStart - 400) + 0.7*du = 300. Scale peak (char 0): du/2 = 500.
    const bobPeakTime = -400 + 0.7 * params.durationMs;
    expect(bobPeakTime).toBeLessThan(params.durationMs / 2);
    expect(emphasisBobOffsetEm(params, bobPeakTime, 0)).toBeCloseTo(-0.05, 6);
  });

  it("rests at 0 before it starts and after it ends", () => {
    expect(emphasisBobOffsetEm(params, -400, 0)).toBeCloseTo(0, 10); // at start
    expect(emphasisBobOffsetEm(params, -1000, 0)).toBeCloseTo(0, 10); // before
    const end = -400 + 1.4 * params.durationMs;
    expect(emphasisBobOffsetEm(params, end, 0)).toBeCloseTo(0, 6); // after end
  });

  it("guards a zero or negative durationMs to a finite 0", () => {
    // du is the phase denominator (1.4 * du); a hand-built params of 0 would
    // divide to Infinity/NaN, so the helper short-circuits to 0 instead.
    for (const du of [0, -1000]) {
      const degenerate = { amount: 0.6, blur: 0.5, durationMs: du };
      for (const t of [-500, 0, 300, 1000, 5000]) {
        const y = emphasisBobOffsetEm(degenerate, t, 0);
        expect(Number.isFinite(y)).toBe(true);
        expect(y).toBe(0);
      }
    }
  });

  it("defaults to 0.05 em and lets minor/background lines override to 0.1 em", () => {
    // Bob peak phase: (wordStart - 400) + 0.7 * du. Default reaches the normal
    // amplitude there; the override reaches the doubled one.
    const bobPeakTime = -400 + 0.7 * params.durationMs;
    expect(emphasisBobOffsetEm(params, bobPeakTime, 0)).toBeCloseTo(
      -BOB_AMPLITUDE_EM,
      6,
    );
    expect(
      emphasisBobOffsetEm(params, bobPeakTime, 0, {
        amplitudeEm: BOB_AMPLITUDE_MINOR_EM,
      }),
    ).toBeCloseTo(-BOB_AMPLITUDE_MINOR_EM, 6);
    // Exactly double at any shared phase, not only at the peak.
    const someTime = 120;
    const normal = emphasisBobOffsetEm(params, someTime, 0);
    const minor = emphasisBobOffsetEm(params, someTime, 0, {
      amplitudeEm: BOB_AMPLITUDE_MINOR_EM,
    });
    expect(normal).toBeLessThan(0); // the shared phase is genuinely active
    expect(minor).toBeCloseTo(2 * normal, 10);
  });

  it("preserves the sign convention and the leading peak under the minor override", () => {
    const opts = { amplitudeEm: BOB_AMPLITUDE_MINOR_EM };
    // The peak time is set by the phase, not the amplitude, so it still leads
    // the scale/glow clock (char 0 peaks at du/2).
    const bobPeakTime = -400 + 0.7 * params.durationMs;
    expect(bobPeakTime).toBeLessThan(params.durationMs / 2);
    expect(emphasisBobOffsetEm(params, bobPeakTime, 0, opts)).toBeCloseTo(
      -BOB_AMPLITUDE_MINOR_EM,
      6,
    );
    // Sign convention holds under the override: never positive.
    for (let t = -600; t <= 3200; t += 200) {
      expect(emphasisBobOffsetEm(params, t, 0, opts)).toBeLessThanOrEqual(0);
    }
  });
});

describe("vertical offset composition", () => {
  it("sums base float, emphasis offsetY, and the lead bob for an emphasised word", () => {
    const durationMs = 2000;
    const params = emphasisParams(durationMs, false);
    const n = 3;
    const wordStartMs = 0;
    const timeMs = 900; // a moment where all three are active

    const base = baseFloatOffsetEm(timeMs, wordStartMs, durationMs);
    const emphasisY = charEmphasis(params, 0, n, timeMs, wordStartMs).offsetYEm;
    const bob = emphasisBobOffsetEm(params, timeMs, wordStartMs);

    // Three independent, non-zero upward (negative) contributions.
    expect(base).toBeLessThan(0);
    expect(emphasisY).toBeLessThan(0);
    expect(bob).toBeLessThan(0);

    // The renderer applies their arithmetic sum (composite: "add"), not any one
    // of them: removing any two terms must leave exactly the third.
    const total = base + emphasisY + bob;
    expect(total - (emphasisY + bob)).toBeCloseTo(base, 12);
    expect(total - (base + bob)).toBeCloseTo(emphasisY, 12);
    expect(total - (base + emphasisY)).toBeCloseTo(bob, 12);

    // Stacking lifts further than any single contribution alone.
    expect(total).toBeLessThan(base);
    expect(total).toBeLessThan(emphasisY);
    expect(total).toBeLessThan(bob);
  });

  it("reduces to the base float alone for a non-emphasised word", () => {
    // A non-emphasised word contributes no emphasis offsetY and no bob (the
    // caller still adds them, they are simply absent), so its persistent lift
    // is exactly the base float.
    const durationMs = 700; // < 1000 ms: not emphasised
    expect(baseFloatOffsetEm(1000, 0, durationMs)).toBeCloseTo(
      -BASE_FLOAT_RISE_EM,
      6,
    );
  });
});

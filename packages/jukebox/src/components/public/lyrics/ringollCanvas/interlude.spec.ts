import { describe, expect, it } from "vitest";
import {
  activeInterlude,
  easeInOutBack,
  easeOutExpo,
  findInterludeGaps,
  interludeAnchorOffsetPx,
  interludeDotsState,
  INTERLUDE_ANCHOR_OFFSET_RATIO,
  INTERLUDE_DOT_COUNT,
  INTERLUDE_DOT_DIAMETER,
  INTERLUDE_DOT_GAP_EM,
  INTERLUDE_DOT_SIZE_MULTIPLIER,
  INTERLUDE_LOOKAHEAD_SECONDS,
  INTERLUDE_TARGET_BREATHE_MS,
  MIN_INTERLUDE_GAP_SECONDS,
  type InterludeGap,
  type InterludeLine,
} from "./interlude";

// --- White-box helpers replicating only the sub-factors we isolate in tests.
// These let us assert breathing/grow-in/flourish contributions independently
// without mirroring the whole implementation.
const breatheDurationMs = (D: number): number => D / Math.ceil(D / 1500);
const breathingScale = (d: number, D: number): number =>
  Math.sin(1.5 * Math.PI - (d / breatheDurationMs(D)) * 2) / 20 + 1;

describe("easeOutExpo", () => {
  it("pins the endpoints exactly", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
  });

  it("rises steeply and monotonically in between", () => {
    expect(easeOutExpo(0.3)).toBeCloseTo(0.875, 6); // 1 - 2^-3
    let prev = -Infinity;
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const y = easeOutExpo(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});

describe("easeInOutBack", () => {
  it("pins the endpoints exactly", () => {
    // The formula yields -0 at x=0 (faithful to AMLL); -0 === 0 holds.
    expect(easeInOutBack(0) === 0).toBe(true);
    expect(easeInOutBack(1)).toBe(1);
  });

  it("overshoots below 0 somewhere in the first half (the anticipation dip)", () => {
    // A negative value proves the backward overshoot that drives the end
    // flourish's anticipation bump.
    expect(easeInOutBack(0.1)).toBeLessThan(0);
    expect(
      Math.min(easeInOutBack(0.05), easeInOutBack(0.1), easeInOutBack(0.15)),
    ).toBeLessThan(0);
  });

  it("overshoots above 1 in the second half and is 0.5 at the midpoint", () => {
    expect(easeInOutBack(0.5)).toBeCloseTo(0.5, 10);
    expect(easeInOutBack(0.9)).toBeGreaterThan(1);
  });
});

describe("findInterludeGaps", () => {
  it("excludes a gap just below the 4000 ms threshold and includes it at/above", () => {
    // Leading gap ends 250 ms before line 0, so line 0 at 4.25 s => gap [0, 4.0].
    const atThreshold = findInterludeGaps([{ startTime: 4.25, endTime: 10 }]);
    expect(atThreshold).toHaveLength(1);
    expect(atThreshold[0]!.duration).toBeCloseTo(MIN_INTERLUDE_GAP_SECONDS, 10);

    const belowThreshold = findInterludeGaps([
      { startTime: 4.2499, endTime: 10 },
    ]);
    expect(belowThreshold).toHaveLength(0);
  });

  it("ends the gap 250 ms before the upcoming line (the trailing offset)", () => {
    const gaps = findInterludeGaps([
      { startTime: 0, endTime: 1 },
      { startTime: 5.25, endTime: 6 },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      anchorLineIndex: 0,
      nextLineIndex: 1,
      startTime: 1,
      isNextDuet: false,
    });
    expect(gaps[0]!.endTime).toBeCloseTo(5.0, 10); // 5.25 - 0.25, not 5.25
    expect(gaps[0]!.duration).toBeCloseTo(4.0, 10);
  });

  it("counts the leading gap before the first line (anchorLineIndex -1, gapStart 0)", () => {
    const gaps = findInterludeGaps([
      { startTime: 10, endTime: 12 },
      { startTime: 13, endTime: 14 },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      anchorLineIndex: -1,
      nextLineIndex: 0,
      startTime: 0,
    });
    expect(gaps[0]!.endTime).toBeCloseTo(9.75, 10); // 10 - 0.25
  });

  it("never produces a gap after the last line", () => {
    // A single line: only the (sub-threshold) leading gap is even considered.
    expect(findInterludeGaps([{ startTime: 0, endTime: 1 }])).toHaveLength(0);
    // Two lines with a big silence between them: exactly one gap, anchored at 0,
    // and nothing modelled after the final line.
    const gaps = findInterludeGaps([
      { startTime: 0, endTime: 1 },
      { startTime: 10, endTime: 11 },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.anchorLineIndex).toBe(0);
    expect(gaps.every((g) => g.nextLineIndex <= 1)).toBe(true);
  });

  it("flags the upcoming line as a duet (role === 1) for right-alignment", () => {
    const duet = findInterludeGaps([{ startTime: 10, endTime: 12, role: 1 }]);
    expect(duet[0]!.isNextDuet).toBe(true);

    const notDuet = findInterludeGaps([
      { startTime: 10, endTime: 12, role: 0 },
    ]);
    expect(notDuet[0]!.isNextDuet).toBe(false);
  });

  it("handles unsorted lines without throwing and computes gaps pairwise", () => {
    const gaps = findInterludeGaps([
      { startTime: 0, endTime: 2 },
      { startTime: 100, endTime: 102 },
      { startTime: 3, endTime: 5 }, // out of order
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      anchorLineIndex: 0,
      nextLineIndex: 1,
      startTime: 2,
    });
    expect(gaps[0]!.endTime).toBeCloseTo(99.75, 10);
  });

  it("skips gaps bounded by malformed lines and never throws", () => {
    expect(
      findInterludeGaps([
        { startTime: 0, endTime: Number.NaN },
        { startTime: 100, endTime: 102 },
      ]),
    ).toHaveLength(0);
    expect(
      findInterludeGaps([
        { startTime: 0, endTime: 1 },
        { startTime: Number.POSITIVE_INFINITY, endTime: 200 },
      ]),
    ).toHaveLength(0);
    // endTime < startTime is malformed => the adjacent gap is skipped.
    expect(
      findInterludeGaps([
        { startTime: 5, endTime: 2 },
        { startTime: 100, endTime: 102 },
      ]),
    ).toHaveLength(0);
  });

  it("skips overlapping lines (negative window) but keeps valid neighbours", () => {
    const gaps = findInterludeGaps([
      { startTime: 0, endTime: 50 },
      { startTime: 10, endTime: 12 }, // overlaps the previous line
      { startTime: 100, endTime: 101 },
    ]);
    // [50, 10-0.25] is negative => skipped; [12, 100-0.25] qualifies.
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ anchorLineIndex: 1, nextLineIndex: 2 });
  });

  it("returns an empty list for empty input", () => {
    expect(findInterludeGaps([])).toEqual([]);
  });
});

describe("activeInterlude", () => {
  const gap: InterludeGap = {
    anchorLineIndex: 0,
    nextLineIndex: 1,
    startTime: 10,
    endTime: 20,
    duration: 10,
    isNextDuet: false,
  };

  it("is inactive before the (look-ahead adjusted) start and active just after", () => {
    // t = time + 0.02; active requires startTime < t. So time must exceed
    // 10 - 0.02 = 9.98.
    expect(activeInterlude([gap], 9.97)).toBeNull();
    expect(activeInterlude([gap], 9.99)).toBe(gap); // ~20 ms early, by design
    expect(activeInterlude([gap], 15)).toBe(gap);
  });

  it("is active until the (look-ahead adjusted) end, then inactive", () => {
    expect(activeInterlude([gap], 19.97)).toBe(gap); // t = 19.99 < 20
    expect(activeInterlude([gap], 19.99)).toBeNull(); // t = 20.01, boundary excluded
    expect(activeInterlude([gap], 25)).toBeNull();
  });

  it("treats both endpoints as exclusive", () => {
    expect(activeInterlude([gap], 10 - INTERLUDE_LOOKAHEAD_SECONDS)).toBeNull(); // t === startTime
    expect(activeInterlude([gap], 20 - INTERLUDE_LOOKAHEAD_SECONDS)).toBeNull(); // t === endTime
  });

  it("selects the single containing gap from several disjoint ones", () => {
    const gaps = findInterludeGaps([
      { startTime: 0, endTime: 10 },
      { startTime: 20.25, endTime: 30 }, // gap [10, 20]
      { startTime: 45.25, endTime: 50 }, // gap [30, 45]
    ]);
    expect(gaps).toHaveLength(2);
    expect(activeInterlude(gaps, 15)).toBe(gaps[0]);
    expect(activeInterlude(gaps, 40)).toBe(gaps[1]);
    expect(activeInterlude(gaps, 22)).toBeNull(); // inside a sung line
  });

  it("returns null for an empty list or non-finite time (never throws)", () => {
    expect(activeInterlude([], 15)).toBeNull();
    expect(activeInterlude([gap], Number.NaN)).toBeNull();
    expect(activeInterlude([gap], Number.POSITIVE_INFINITY)).toBeNull();
    expect(activeInterlude([gap], Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe("interludeDotsState", () => {
  const D = 8000;

  it("matches a hand-computed reference frame", () => {
    const s = interludeDotsState(3000, D);
    expect(s.scale).toBeCloseTo(0.707378, 5);
    expect(s.opacity).toBe(1);
    expect(s.dotOpacities[0]).toBeCloseTo(0.931034, 5);
    expect(s.dotOpacities[1]).toBeCloseTo(0.25, 6);
    expect(s.dotOpacities[2]).toBeCloseTo(0.25, 6);
  });

  describe("group opacity", () => {
    it("is fully hidden before 500 ms", () => {
      for (const d of [0, 100, 400, 499]) {
        const s = interludeDotsState(d, D);
        expect(s.opacity).toBe(0);
        expect(s.dotOpacities).toEqual([0, 0, 0]);
      }
    });

    it("ramps linearly from 0 to 1 across 500-1000 ms", () => {
      expect(interludeDotsState(500, D).opacity).toBeCloseTo(0, 10);
      expect(interludeDotsState(750, D).opacity).toBeCloseTo(0.5, 10);
      expect(interludeDotsState(999, D).opacity).toBeCloseTo(0.998, 10);
      expect(interludeDotsState(1000, D).opacity).toBe(1);
    });

    it("fades out over the final 375 ms", () => {
      expect(interludeDotsState(D - 375, D).opacity).toBe(1); // boundary excluded
      expect(interludeDotsState(D - 187.5, D).opacity).toBeCloseTo(0.5, 10);
      expect(interludeDotsState(D, D).opacity).toBeCloseTo(0, 10);
    });
  });

  describe("group scale", () => {
    it("grows in via easeOutExpo, reaching full size by 2000 ms", () => {
      const growFactor = (d: number): number =>
        interludeDotsState(d, D).scale /
        (breathingScale(d, D) * INTERLUDE_DOT_SIZE_MULTIPLIER);
      expect(growFactor(600)).toBeCloseTo(easeOutExpo(0.3), 6);
      expect(growFactor(600)).toBeLessThan(1);
      expect(growFactor(2000)).toBeCloseTo(1, 6); // full by 2000 ms
      let prev = -Infinity;
      for (const d of [100, 300, 600, 1000, 1500, 2000]) {
        const g = growFactor(d);
        expect(g).toBeGreaterThan(prev);
        prev = g;
      }
    });

    it("breathes within +/-5% of 1 (times the 0.7 multiplier) mid-interlude", () => {
      const big = 10000;
      let min = Infinity;
      let max = -Infinity;
      for (let d = 2000; d <= big - 750; d += 50) {
        const scale = interludeDotsState(d, big).scale;
        expect(scale).toBeGreaterThanOrEqual(0.95 * 0.7 - 1e-9);
        expect(scale).toBeLessThanOrEqual(1.05 * 0.7 + 1e-9);
        min = Math.min(min, scale);
        max = Math.max(max, scale);
      }
      // Genuinely oscillates around 0.7 (both above and below).
      expect(min).toBeLessThan(0.7);
      expect(max).toBeGreaterThan(0.7);
    });

    it("includes the 0.7 size multiplier in the output", () => {
      // Mid-interlude the only scale factors are breathing and 0.7.
      const s = interludeDotsState(5000, 10000);
      expect(s.scale / breathingScale(5000, 10000)).toBeCloseTo(
        INTERLUDE_DOT_SIZE_MULTIPLIER,
        6,
      );
    });

    it("shrinks to ~half in the final 750 ms with an anticipation bump first", () => {
      const flourish = (d: number, dur: number): number =>
        interludeDotsState(d, dur).scale /
        (breathingScale(d, dur) * INTERLUDE_DOT_SIZE_MULTIPLIER);

      // Early in the flourish the multiplier exceeds 1 (bump), because
      // easeInOutBack dips negative there.
      expect(flourish(5400, 6000)).toBeCloseTo(1 - easeInOutBack(0.1), 6);
      expect(flourish(5400, 6000)).toBeGreaterThan(1);

      // At the very end it collapses to half (x reaches only 0.5), not zero.
      expect(flourish(6000, 6000)).toBeCloseTo(0.5, 6);

      // Absolute scale: the bump raises it above the pre-flourish entry frame,
      // then it ends well below that entry.
      const entry = interludeDotsState(5250, 6000).scale; // remaining == 750, no flourish yet
      let peak = -Infinity;
      for (let d = 5251; d <= 6000; d += 5) {
        peak = Math.max(peak, interludeDotsState(d, 6000).scale);
      }
      expect(peak).toBeGreaterThan(entry);
      expect(interludeDotsState(6000, 6000).scale).toBeLessThan(entry);
    });
  });

  describe("per-dot opacity", () => {
    const big = 10000; // dotsDuration = 9250

    it("fills left-to-right, clamped between the 0.25 floor and 1.0 ceiling", () => {
      const s = interludeDotsState(5000, big);
      expect(s.dotOpacities[0]).toBeCloseTo(1, 6); // leading dot at the ceiling
      expect(s.dotOpacities[1]).toBeCloseTo(0.466216, 5);
      expect(s.dotOpacities[2]).toBeCloseTo(0.25, 6); // trailing dot at the floor
      // Monotonically non-increasing across dots (left fills before right).
      expect(s.dotOpacities[0]).toBeGreaterThanOrEqual(s.dotOpacities[1]!);
      expect(s.dotOpacities[1]).toBeGreaterThanOrEqual(s.dotOpacities[2]!);
    });

    it("scales every dot by the group alpha", () => {
      // In the opacity ramp (group alpha 0.5) each dot is halved vs. alpha 1.
      const ramp = interludeDotsState(750, big);
      expect(ramp.opacity).toBeCloseTo(0.5, 10);
      for (const o of ramp.dotOpacities) {
        expect(o).toBeLessThanOrEqual(0.5 + 1e-9);
      }
    });
  });

  describe("terminal / degenerate states", () => {
    it("is entirely zero once elapsed exceeds the duration", () => {
      for (const d of [8001, 9000, 16000]) {
        expect(interludeDotsState(d, D)).toEqual({
          scale: 0,
          opacity: 0,
          dotOpacities: [0, 0, 0],
        });
      }
    });

    it("is fully hidden for non-positive / non-finite durations", () => {
      for (const dur of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(interludeDotsState(100, dur)).toEqual({
          scale: 0,
          opacity: 0,
          dotOpacities: [0, 0, 0],
        });
      }
    });

    it("is fully hidden for negative or non-finite elapsed", () => {
      for (const d of [-1, -1000, Number.NaN, Number.NEGATIVE_INFINITY]) {
        expect(interludeDotsState(d, D)).toEqual({
          scale: 0,
          opacity: 0,
          dotOpacities: [0, 0, 0],
        });
      }
    });

    it("treats a zero/negative dots window (very short interlude) as fully filled", () => {
      // D <= 750 => dotsDuration <= 0. Pick d past the opacity ramp so the group
      // alpha is > 0 and we can see the per-dot fill = group alpha (raw 1).
      const s = interludeDotsState(650, 700); // dotsDuration = max(0, 700-750) = 0
      for (const o of s.dotOpacities) {
        expect(o).toBeCloseTo(s.opacity, 10);
        expect(Number.isFinite(o)).toBe(true);
      }
    });

    it("never yields NaN/Infinity across a degenerate sweep", () => {
      const durations = [
        -100, 0, 1, 100, 374, 375, 500, 749, 750, 751, 1000, 1500, 4000, 10000,
      ];
      for (const dur of durations) {
        const elapsedPoints = [
          -1000,
          -1,
          0,
          0.5,
          1,
          100,
          249,
          250,
          374,
          375,
          499,
          500,
          749,
          750,
          751,
          999,
          1000,
          1999,
          2000,
          dur - 1,
          dur,
          dur + 1,
          dur / 2,
          dur * 2,
          dur + 1000,
        ];
        for (const d of elapsedPoints) {
          const s = interludeDotsState(d, dur);
          expect(Number.isFinite(s.scale)).toBe(true);
          expect(s.scale).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(s.opacity)).toBe(true);
          expect(s.opacity).toBeGreaterThanOrEqual(0);
          expect(s.opacity).toBeLessThanOrEqual(1);
          expect(s.dotOpacities).toHaveLength(3);
          for (const o of s.dotOpacities) {
            expect(Number.isFinite(o)).toBe(true);
            expect(o).toBeGreaterThanOrEqual(0);
            expect(o).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });
});

describe("layout constants", () => {
  it("exposes the dot geometry as renderer-consumable data", () => {
    expect(INTERLUDE_DOT_COUNT).toBe(3);
    expect(INTERLUDE_DOT_GAP_EM).toBe(0.25);
    expect(INTERLUDE_ANCHOR_OFFSET_RATIO).toBe(0.4);
    expect(INTERLUDE_DOT_SIZE_MULTIPLIER).toBe(0.7);
    expect(INTERLUDE_TARGET_BREATHE_MS).toBe(1500);
    expect(INTERLUDE_DOT_DIAMETER).toEqual({
      min: { value: 0.5, unit: "em" },
      preferred: { value: 1, unit: "vh" },
      max: { value: 3, unit: "em" },
    });
  });

  it("computes the anchor offset as 0.4 x fontSize, guarding bad input", () => {
    expect(interludeAnchorOffsetPx(24)).toBeCloseTo(9.6, 10);
    expect(interludeAnchorOffsetPx(0)).toBe(0);
    expect(interludeAnchorOffsetPx(-10)).toBe(0);
    expect(interludeAnchorOffsetPx(Number.NaN)).toBe(0);
  });
});

// Type-level sanity: a bare { startTime, endTime } is a valid InterludeLine.
const _bareLine: InterludeLine = { startTime: 0, endTime: 1 };
void _bareLine;

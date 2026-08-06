import { TextIndexMap } from "@/frontendUtils/textIndexMap";
import type {
  FuriganaAnnotationInput,
  NormalizedFuriganaAnnotation,
  RubyLayoutIssue,
} from "./types";

export interface ValidateFuriganaResult {
  /** Annotations that passed validation, converted and sorted by `utf16Range[0]`. */
  valid: NormalizedFuriganaAnnotation[];
  issues: RubyLayoutIssue[];
}

/**
 * Validates and converts raw {@link FuriganaAnnotationInput} entries against
 * `baseText`.
 *
 * Despite the GraphQL/OpenAPI docs describing `leftIndex`/`rightIndex` as
 * "per Extended Grapheme Cluster" (see
 * `packages/api/src/graphql/LyricsKitObjects.ts`), the rest of the codebase
 * treats them as raw UTF-16 code unit offsets (see
 * `RubyLineRenderer.tsx`'s `line.content.slice(segment.index, ...)`). This
 * function treats them as UTF-16 offsets and validates that assumption:
 * `content` must be non-empty (an empty ruby run can't be shaped), indices
 * must be integers within `[0, baseText.length]`, `leftIndex < rightIndex`,
 * and both endpoints must fall on Unicode code-point *and*
 * extended-grapheme-cluster boundaries (an index that splits a surrogate
 * pair or a base+combining-mark cluster cannot delimit an atomic ruby base
 * range). Overlapping annotations (after conversion) are also rejected.
 *
 * Invalid annotations are never included in `valid`; every rejection is
 * reported via a corresponding {@link RubyLayoutIssue} in `issues`.
 */
export function validateFuriganaAnnotations(
  baseText: string,
  annotations: readonly FuriganaAnnotationInput[],
): ValidateFuriganaResult {
  const textMap = new TextIndexMap(baseText);
  const issues: RubyLayoutIssue[] = [];
  const candidates: NormalizedFuriganaAnnotation[] = [];

  annotations.forEach((annotation, sourceIndex) => {
    const { leftIndex, rightIndex } = annotation;

    if (annotation.content.length === 0) {
      issues.push({
        kind: "emptyContent",
        annotation,
        reason:
          "Furigana content must not be empty (an empty ruby run cannot be shaped).",
      });
      return;
    }

    if (!Number.isInteger(leftIndex) || !Number.isInteger(rightIndex)) {
      issues.push({
        kind: "invalidRange",
        annotation,
        reason: "leftIndex and rightIndex must be integers.",
      });
      return;
    }

    if (leftIndex < 0 || leftIndex > textMap.utf16Length) {
      issues.push({
        kind: "outOfRange",
        annotation,
        index: leftIndex,
        reason: `leftIndex ${leftIndex} is out of range 0..${textMap.utf16Length}.`,
      });
      return;
    }
    if (rightIndex < 0 || rightIndex > textMap.utf16Length) {
      issues.push({
        kind: "outOfRange",
        annotation,
        index: rightIndex,
        reason: `rightIndex ${rightIndex} is out of range 0..${textMap.utf16Length}.`,
      });
      return;
    }

    if (leftIndex >= rightIndex) {
      issues.push({
        kind: "invalidRange",
        annotation,
        reason: `leftIndex ${leftIndex} must be strictly less than rightIndex ${rightIndex}.`,
      });
      return;
    }

    const left = textMap.inspectUtf16(leftIndex);
    const right = textMap.inspectUtf16(rightIndex);

    if (!left.isCodePointBoundary) {
      issues.push({ kind: "midSurrogate", annotation, side: "left" });
      return;
    }
    if (!right.isCodePointBoundary) {
      issues.push({ kind: "midSurrogate", annotation, side: "right" });
      return;
    }
    if (!left.isGraphemeBoundary) {
      issues.push({ kind: "nonGraphemeBoundary", annotation, side: "left" });
      return;
    }
    if (!right.isGraphemeBoundary) {
      issues.push({ kind: "nonGraphemeBoundary", annotation, side: "right" });
      return;
    }

    candidates.push({
      content: annotation.content,
      utf16Range: [leftIndex, rightIndex],
      graphemeRange: [left.grapheme!, right.grapheme!],
      sourceIndex,
    });
  });

  candidates.sort((a, b) => a.utf16Range[0] - b.utf16Range[0]);

  const valid: NormalizedFuriganaAnnotation[] = [];
  let previous: NormalizedFuriganaAnnotation | undefined;
  for (const candidate of candidates) {
    if (previous && candidate.utf16Range[0] < previous.utf16Range[1]) {
      issues.push({
        kind: "overlapping",
        annotation: annotations[candidate.sourceIndex]!,
        other: annotations[previous.sourceIndex]!,
      });
      continue;
    }
    valid.push(candidate);
    previous = candidate;
  }

  return { valid, issues };
}

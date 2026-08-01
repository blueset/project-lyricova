export type TextOffsetRange = readonly [number, number];

export interface TextBoundary {
  utf16: number;
  codePoint: number;
  grapheme: number;
}

export interface TextSourceRange {
  text: string;
  utf16: TextOffsetRange;
  codePoint: TextOffsetRange;
  grapheme: TextOffsetRange;
}

export interface CorrelatedTextSourceRange {
  text: string;
  utf16: TextOffsetRange;
  codePoint: TextOffsetRange;
  grapheme: TextOffsetRange | null;
  /**
   * Inclusive-exclusive grapheme span overlapped by this range, even when the
   * range starts or ends inside a grapheme cluster.
   */
  graphemeCoverage: TextOffsetRange;
}

export interface Utf16OffsetResolution {
  utf16: number;
  codePoint: number | null;
  grapheme: number | null;
  isCodePointBoundary: boolean;
  isGraphemeBoundary: boolean;
  containingGrapheme: TextSourceRange | null;
}

export interface CodePointOffsetResolution {
  utf16: number;
  codePoint: number;
  grapheme: number | null;
  isGraphemeBoundary: boolean;
  containingGrapheme: TextSourceRange | null;
}

const defaultGraphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function makeRange(start: number, end: number): TextOffsetRange {
  return [start, end] as const;
}

function countCodePoints(text: string): number {
  let count = 0;
  for (const _ of text) {
    count++;
  }
  return count;
}

function rangeError(message: string): RangeError {
  return new RangeError(message);
}

export class TextIndexMap {
  public readonly text: string;
  public readonly utf16Length: number;
  public readonly codePointLength: number;
  public readonly graphemeLength: number;
  public readonly graphemeRanges: readonly TextSourceRange[];

  private readonly utf16ByCodePoint: readonly number[];
  private readonly utf16ByGrapheme: readonly number[];
  private readonly codePointByGrapheme: readonly number[];
  private readonly codePointByUtf16 = new Map<number, number>();
  private readonly graphemeByUtf16 = new Map<number, number>();
  private readonly graphemeByCodePoint = new Map<number, number>();

  constructor(
    text: string,
    segmenter: Intl.Segmenter = defaultGraphemeSegmenter,
  ) {
    this.text = text;
    this.utf16Length = text.length;

    const utf16ByCodePoint = [0];
    let utf16Offset = 0;
    for (const symbol of text) {
      utf16Offset += symbol.length;
      utf16ByCodePoint.push(utf16Offset);
    }
    this.utf16ByCodePoint = utf16ByCodePoint;
    this.codePointLength = utf16ByCodePoint.length - 1;

    const utf16ByGrapheme = [0];
    const codePointByGrapheme = [0];
    const graphemeRanges: TextSourceRange[] = [];
    let codePointOffset = 0;
    for (const part of segmenter.segment(text)) {
      const utf16Start = part.index;
      const utf16End = utf16Start + part.segment.length;
      const codePointStart = codePointOffset;
      codePointOffset += countCodePoints(part.segment);
      const codePointEnd = codePointOffset;
      const graphemeIndex = graphemeRanges.length;

      graphemeRanges.push({
        text: part.segment,
        utf16: makeRange(utf16Start, utf16End),
        codePoint: makeRange(codePointStart, codePointEnd),
        grapheme: makeRange(graphemeIndex, graphemeIndex + 1),
      });
      utf16ByGrapheme.push(utf16End);
      codePointByGrapheme.push(codePointEnd);
    }

    this.utf16ByGrapheme = utf16ByGrapheme;
    this.codePointByGrapheme = codePointByGrapheme;
    this.graphemeLength = graphemeRanges.length;
    this.graphemeRanges = graphemeRanges;

    utf16ByCodePoint.forEach((boundary, codePoint) => {
      this.codePointByUtf16.set(boundary, codePoint);
    });
    utf16ByGrapheme.forEach((boundary, grapheme) => {
      this.graphemeByUtf16.set(boundary, grapheme);
    });
    codePointByGrapheme.forEach((boundary, grapheme) => {
      this.graphemeByCodePoint.set(boundary, grapheme);
    });
  }

  public inspectUtf16(offset: number): Utf16OffsetResolution {
    this.assertOffset(offset, this.utf16Length, "UTF-16 offset");
    const codePoint = this.codePointByUtf16.get(offset) ?? null;
    const grapheme = this.graphemeByUtf16.get(offset) ?? null;

    return {
      utf16: offset,
      codePoint,
      grapheme,
      isCodePointBoundary: codePoint !== null,
      isGraphemeBoundary: grapheme !== null,
      containingGrapheme: this.containingGraphemeByUtf16(offset),
    };
  }

  public inspectCodePoint(offset: number): CodePointOffsetResolution {
    this.assertOffset(
      offset,
      this.codePointLength,
      "Unicode code-point offset",
    );
    const grapheme = this.graphemeByCodePoint.get(offset) ?? null;

    return {
      utf16: this.utf16ByCodePoint[offset]!,
      codePoint: offset,
      grapheme,
      isGraphemeBoundary: grapheme !== null,
      containingGrapheme: this.containingGraphemeByCodePoint(offset),
    };
  }

  public boundaryFromUtf16(offset: number): TextBoundary {
    return {
      utf16: offset,
      codePoint: this.utf16ToCodePoint(offset),
      grapheme: this.utf16ToGrapheme(offset),
    };
  }

  public boundaryFromCodePoint(offset: number): TextBoundary {
    return {
      utf16: this.codePointToUtf16(offset),
      codePoint: offset,
      grapheme: this.codePointToGrapheme(offset),
    };
  }

  public boundaryFromGrapheme(index: number): TextBoundary {
    this.assertOffset(
      index,
      this.graphemeLength,
      "Extended grapheme cluster index",
    );
    return {
      utf16: this.utf16ByGrapheme[index]!,
      codePoint: this.codePointByGrapheme[index]!,
      grapheme: index,
    };
  }

  public utf16ToCodePoint(offset: number): number {
    this.assertOffset(offset, this.utf16Length, "UTF-16 offset");
    const codePoint = this.codePointByUtf16.get(offset);
    if (codePoint === undefined) {
      throw rangeError(
        `UTF-16 offset ${offset} does not fall on a Unicode code-point boundary.`,
      );
    }
    return codePoint;
  }

  public utf16ToGrapheme(offset: number): number {
    this.assertOffset(offset, this.utf16Length, "UTF-16 offset");
    const grapheme = this.graphemeByUtf16.get(offset);
    if (grapheme === undefined) {
      throw rangeError(
        `UTF-16 offset ${offset} does not fall on an extended grapheme cluster boundary.`,
      );
    }
    return grapheme;
  }

  public codePointToUtf16(offset: number): number {
    this.assertOffset(
      offset,
      this.codePointLength,
      "Unicode code-point offset",
    );
    return this.utf16ByCodePoint[offset]!;
  }

  public codePointToGrapheme(offset: number): number {
    this.assertOffset(
      offset,
      this.codePointLength,
      "Unicode code-point offset",
    );
    const grapheme = this.graphemeByCodePoint.get(offset);
    if (grapheme === undefined) {
      throw rangeError(
        `Unicode code-point offset ${offset} does not fall on an extended grapheme cluster boundary.`,
      );
    }
    return grapheme;
  }

  public graphemeToUtf16(index: number): number {
    this.assertOffset(
      index,
      this.graphemeLength,
      "Extended grapheme cluster index",
    );
    return this.utf16ByGrapheme[index]!;
  }

  public graphemeToCodePoint(index: number): number {
    this.assertOffset(
      index,
      this.graphemeLength,
      "Extended grapheme cluster index",
    );
    return this.codePointByGrapheme[index]!;
  }

  public getGraphemeRange(index: number): TextSourceRange {
    this.assertIndex(
      index,
      this.graphemeLength,
      "Extended grapheme cluster index",
    );
    return this.graphemeRanges[index]!;
  }

  public sourceRangeFromUtf16(
    startUtf16: number,
    endUtf16: number,
  ): CorrelatedTextSourceRange {
    this.assertRange(startUtf16, endUtf16, this.utf16Length, "UTF-16 range");
    const codePointStart = this.utf16ToCodePoint(startUtf16);
    const codePointEnd = this.utf16ToCodePoint(endUtf16);

    return this.buildCorrelatedRange(
      startUtf16,
      endUtf16,
      codePointStart,
      codePointEnd,
    );
  }

  public sourceRangeFromCodePoint(
    startCodePoint: number,
    endCodePoint: number,
  ): CorrelatedTextSourceRange {
    this.assertRange(
      startCodePoint,
      endCodePoint,
      this.codePointLength,
      "Unicode code-point range",
    );
    const startUtf16 = this.codePointToUtf16(startCodePoint);
    const endUtf16 = this.codePointToUtf16(endCodePoint);

    return this.buildCorrelatedRange(
      startUtf16,
      endUtf16,
      startCodePoint,
      endCodePoint,
    );
  }

  public sourceRangeFromGrapheme(
    startGrapheme: number,
    endGrapheme: number,
  ): CorrelatedTextSourceRange {
    this.assertRange(
      startGrapheme,
      endGrapheme,
      this.graphemeLength,
      "Extended grapheme cluster range",
    );
    const startUtf16 = this.graphemeToUtf16(startGrapheme);
    const endUtf16 = this.graphemeToUtf16(endGrapheme);
    const startCodePoint = this.graphemeToCodePoint(startGrapheme);
    const endCodePoint = this.graphemeToCodePoint(endGrapheme);

    return {
      text: this.text.slice(startUtf16, endUtf16),
      utf16: makeRange(startUtf16, endUtf16),
      codePoint: makeRange(startCodePoint, endCodePoint),
      grapheme: makeRange(startGrapheme, endGrapheme),
      graphemeCoverage: makeRange(startGrapheme, endGrapheme),
    };
  }

  private buildCorrelatedRange(
    startUtf16: number,
    endUtf16: number,
    startCodePoint: number,
    endCodePoint: number,
  ): CorrelatedTextSourceRange {
    const startBoundary = this.graphemeByUtf16.get(startUtf16);
    const endBoundary = this.graphemeByUtf16.get(endUtf16);
    const grapheme =
      startBoundary !== undefined && endBoundary !== undefined
        ? makeRange(startBoundary, endBoundary)
        : null;

    return {
      text: this.text.slice(startUtf16, endUtf16),
      utf16: makeRange(startUtf16, endUtf16),
      codePoint: makeRange(startCodePoint, endCodePoint),
      grapheme,
      graphemeCoverage: this.graphemeCoverageForUtf16Range(
        startUtf16,
        endUtf16,
      ),
    };
  }

  private containingGraphemeByUtf16(offset: number): TextSourceRange | null {
    if (offset >= this.utf16Length) return null;
    return this.graphemeRanges[this.findContainingGraphemeByUtf16Unit(offset)]!;
  }

  private containingGraphemeByCodePoint(
    offset: number,
  ): TextSourceRange | null {
    if (offset >= this.codePointLength) return null;
    return this.graphemeRanges[
      this.findContainingGraphemeByUtf16Unit(this.codePointToUtf16(offset))
    ]!;
  }

  private graphemeCoverageForUtf16Range(
    startUtf16: number,
    endUtf16: number,
  ): TextOffsetRange {
    if (startUtf16 === endUtf16) {
      if (startUtf16 === this.utf16Length) {
        return makeRange(this.graphemeLength, this.graphemeLength);
      }

      const boundary = this.graphemeByUtf16.get(startUtf16);
      if (boundary !== undefined) {
        return makeRange(boundary, boundary);
      }

      const containing = this.findContainingGraphemeByUtf16Unit(startUtf16);
      return makeRange(containing, containing + 1);
    }

    const startCoverage =
      this.graphemeByUtf16.get(startUtf16) ??
      this.findContainingGraphemeByUtf16Unit(startUtf16);
    const endCoverage =
      this.findContainingGraphemeByUtf16Unit(endUtf16 - 1) + 1;

    return makeRange(startCoverage, endCoverage);
  }

  private findContainingGraphemeByUtf16Unit(utf16Unit: number): number {
    let low = 0;
    let high = this.graphemeRanges.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const range = this.graphemeRanges[mid]!;
      if (utf16Unit < range.utf16[0]) {
        high = mid - 1;
      } else if (utf16Unit >= range.utf16[1]) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    throw new Error(
      `Unable to locate grapheme containing UTF-16 unit ${utf16Unit}.`,
    );
  }

  private assertIndex(value: number, length: number, label: string): void {
    if (!Number.isInteger(value)) {
      throw rangeError(`${label} must be an integer.`);
    }
    if (value < 0 || value >= length) {
      throw rangeError(`${label} ${value} is out of range 0..${length - 1}.`);
    }
  }

  private assertOffset(value: number, max: number, label: string): void {
    if (!Number.isInteger(value)) {
      throw rangeError(`${label} must be an integer.`);
    }
    if (value < 0 || value > max) {
      throw rangeError(`${label} ${value} is out of range 0..${max}.`);
    }
  }

  private assertRange(
    start: number,
    end: number,
    max: number,
    label: string,
  ): void {
    this.assertOffset(start, max, `${label} start`);
    this.assertOffset(end, max, `${label} end`);
    if (start > end) {
      throw rangeError(`${label} start ${start} must not exceed end ${end}.`);
    }
  }
}

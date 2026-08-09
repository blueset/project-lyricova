interface FuriganaLabel {
  content: string;
  range: [number, number];
}

interface IndexedGroup {
  base: string;
  furigana: string;
  start: number;
  end: number;
}

type FuriganaGroup = [string, string];

export function applyFuriganaMappingsToLine(
  content: string,
  labels: FuriganaLabel[],
  generatedGroups: string[][],
): FuriganaGroup[] {
  const indexedGroups: IndexedGroup[] = [];
  let generatedPosition = 0;
  for (const group of generatedGroups) {
    const [base, furigana] = group;
    if (base == null || furigana == null) {
      return labelsToGroups(content, labels);
    }
    indexedGroups.push({
      base,
      furigana,
      start: generatedPosition,
      end: generatedPosition + base.length,
    });
    generatedPosition += base.length;
  }

  if (generatedPosition !== content.length) {
    return labelsToGroups(content, labels);
  }

  const result: FuriganaGroup[] = [];
  let position = 0;

  for (const label of labels.toSorted((a, b) => a.range[0] - b.range[0])) {
    const [start, end] = label.range;
    if (start > position) {
      const plain = content.substring(position, start);
      result.push([plain, plain]);
    }

    const base = content.substring(start, end);
    const mappedGroups = indexedGroups.filter(
      (group) => group.start >= start && group.end <= end,
    );
    const isExactMapping =
      end - start > 1 &&
      mappedGroups.length > 1 &&
      mappedGroups[0]?.start === start &&
      mappedGroups.at(-1)?.end === end &&
      mappedGroups.map((group) => group.base).join("") === base &&
      mappedGroups.map((group) => group.furigana).join("") === label.content;

    if (isExactMapping) {
      result.push(
        ...mappedGroups.map(
          ({ base, furigana }): FuriganaGroup => [base, furigana],
        ),
      );
    } else {
      result.push([base, label.content]);
    }
    position = end;
  }

  if (position < content.length) {
    const plain = content.substring(position);
    result.push([plain, plain]);
  }

  return result;
}

function labelsToGroups(
  content: string,
  labels: FuriganaLabel[],
): FuriganaGroup[] {
  const result: FuriganaGroup[] = [];
  let position = 0;

  for (const label of labels.toSorted((a, b) => a.range[0] - b.range[0])) {
    const [start, end] = label.range;
    if (start > position) {
      const plain = content.substring(position, start);
      result.push([plain, plain]);
    }
    result.push([content.substring(start, end), label.content]);
    position = end;
  }

  if (position < content.length) {
    const plain = content.substring(position);
    result.push([plain, plain]);
  }

  return result;
}

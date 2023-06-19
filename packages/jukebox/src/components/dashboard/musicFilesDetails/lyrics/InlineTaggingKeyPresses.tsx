import { LyricsLine } from "lyrics-kit/core";
import { SetStateAction } from "react";

/** Apply -50ms offset to all keypresses to compensate reflection time. */
const KEY_PRESS_OFFSET_MS = -50;

export const MoveCursorUp =
  (lines: LyricsLine[]) =>
  (prev: [number, number]): [number, number] => {
    const [row, col] = prev;
    const nRow = Math.max(0, row - 1);
    const nRowCols = lines[nRow]?.content?.length ?? 0;
    return [nRow, Math.min(col, nRowCols)];
  };

export const MoveCursorDown =
  (lines: LyricsLine[]) =>
  (prev: [number, number]): [number, number] => {
    const [row, col] = prev;
    const nRow = Math.min(lines.length - 1, row + 1);
    const nRowCols = lines[nRow]?.content?.length ?? 0;
    return [nRow, Math.min(col, nRowCols)];
  };

export const MoveCursorLeft =
  (lines: LyricsLine[]) =>
  (prev: [number, number]): [number, number] => {
    const [row, col] = prev;
    if (col === 0 && row > 0) return [row - 1, lines[row - 1].content.length];
    else if (col === 0 && row === 0) return prev;
    return [row, col - 1];
  };

export const MoveCursorRight =
  (lines: LyricsLine[]) =>
  (prev: [number, number]): [number, number] => {
    const [row, col] = prev;
    const rowCols = lines[row]?.content?.length ?? 0;
    if (col + 1 > rowCols && row + 1 < lines.length) return [row + 1, 0];
    else if (col + 1 > rowCols && row + 1 >= lines.length) return prev;
    return [row, col + 1];
  };

export const MoveDotCursorUp =
  (dots: number[][]) =>
  (prev: [number, number, number]): [number, number, number] => {
    let row = prev[0];
    let col = prev[1];
    row = Math.max(0, row - 1);
    col = Math.min(col, (dots[row]?.length ?? 1) - 1);
    while ((dots[row]?.[col] ?? 0) === 0) {
      if (col > 0) {
        col -= 1;
      } else if (col === 0 && row > 0) {
        row -= 1;
        col = dots[row].length - 1;
      } else {
        break;
      }
    }
    if ((dots[row]?.[col] ?? 0) === 0) {
      return prev;
    }
    return [row, col, 0];
  };

export const MoveDotCursorDown =
  (dots: number[][]) =>
  (prev: [number, number, number]): [number, number, number] => {
    let row = prev[0];
    let col = prev[1];
    row = Math.min(dots.length - 1, row + 1);
    col = Math.min(col, (dots[row]?.length ?? 1) - 1);
    while ((dots[row]?.[col] ?? 0) === 0) {
      if (col + 1 < dots[row].length) {
        col += 1;
      } else if (col + 1 >= dots[row].length && row + 1 < dots.length) {
        row += 1;
        col = 0;
      } else {
        break;
      }
    }
    if ((dots[row]?.[col] ?? 0) === 0) {
      return prev;
    }
    return [row, col, 0];
  };

export const MoveDotCursorLeft =
  (dots: number[][]) =>
  (prev: [number, number, number]): [number, number, number] => {
    let [row, column, dot] = prev;
    if (dot > 0) {
      return [row, column, dot - 1];
    }
    column -= 1;
    while ((dots[row]?.[column] ?? 0) === 0) {
      if (column > 0) {
        column -= 1;
      } else if (column <= 0 && row > 0) {
        row -= 1;
        column = dots[row].length - 1;
      } else {
        break;
      }
    }
    if ((dots[row]?.[column] ?? 0) === 0) {
      return prev;
    }
    dot = Math.max(0, dots[row][column] - 1);
    return [row, column, dot];
  };

export const MoveDotCursorRight =
  (dots: number[][]) =>
  (prev: [number, number, number]): [number, number, number] => {
    let [row, column, dot] = prev;
    if (dot + 1 < dots[row][column]) {
      return [row, column, dot + 1];
    }
    column += 1;
    while ((dots[row]?.[column] ?? 0) === 0) {
      if (column + 1 < dots[row].length) {
        column += 1;
      } else if (column + 1 >= dots[row].length && row + 1 < dots.length) {
        row += 1;
        column = 0;
      } else {
        break;
      }
    }
    if ((dots[row]?.[column] ?? 0) === 0) {
      return prev;
    }
    dot = 0;
    return [row, column, dot];
  };

export function setDot(
  setDots: (dots: SetStateAction<number[][]>) => void,
  setCursorPos: (pos: SetStateAction<[number, number]>) => void
) {
  setCursorPos((cursorPos) => {
    setDots((prev) =>
      prev.map((i, idx) =>
        idx !== cursorPos[0]
          ? i
          : i.map((j, jdx) =>
              jdx !== cursorPos[1] ? j : Math.max(1, Math.min(j + 1, 8))
            )
      )
    );
    return cursorPos;
  });
}

export function setHoldDot(
  setDots: (dots: SetStateAction<number[][]>) => void,
  setCursorPos: (pos: SetStateAction<[number, number]>) => void
) {
  setCursorPos((cursorPos) => {
    setDots((prev) =>
      prev.map((i, idx) =>
        idx !== cursorPos[0]
          ? i
          : i.map((j, jdx) => (jdx !== cursorPos[1] ? j : -1))
      )
    );
    return cursorPos;
  });
}

export function setDropDot(
  lines: LyricsLine[],
  setDots: (dots: SetStateAction<number[][]>) => void,
  setCursorPos: (pos: SetStateAction<[number, number]>) => void
) {
  setCursorPos((cursorPos) => {
    setDots((prev) => {
      const result = prev.map((i, idx) =>
        idx !== cursorPos[0]
          ? i
          : i.map((j, jdx) => (jdx !== cursorPos[1] ? j : Math.max(j - 1, 0)))
      );
      if (prev[cursorPos[0]][cursorPos[1]] === 0) {
        setCursorPos(MoveCursorLeft(lines));
      }
      return result;
    });
    return cursorPos;
  });
}

export function setMark(
  time: number,
  setTags: (dots: SetStateAction<number[][][]>) => void,
  setDotCursorPos: (pos: SetStateAction<[number, number, number]>) => void
) {
  time += KEY_PRESS_OFFSET_MS;
  setDotCursorPos((dotCursorPos) => {
    setTags((prev) =>
      prev.map((i, idx) =>
        idx !== dotCursorPos[0]
          ? i
          : i.map((j, jdx) =>
              jdx !== dotCursorPos[1]
                ? j
                : ((j = [...j]), (j[dotCursorPos[2]] = time), j)
            )
      )
    );
    return dotCursorPos;
  });
}

export function setDropMark(
  dots: number[][],
  setTags: (dots: SetStateAction<number[][][]>) => void,
  setDotCursorPos: (pos: SetStateAction<[number, number, number]>) => void,
  seek: (time: number) => void
) {
  setDotCursorPos((dotCursorPos) => {
    const pos = dotCursorPos;
    setTags((prev) => {
      if (prev?.[pos[0]]?.[pos[1]]?.length === 0) {
        const left = MoveDotCursorLeft(dots)(pos);
        pos.splice(0, 3, ...left);
      }
      const time = prev?.[pos[0]]?.[pos[1]]?.[pos[2]] ?? null;
      if (time !== null) seek(Math.max(0, time - 3));
      const result = prev.map((i, idx) =>
        idx !== pos[0] ? i : i.map((j, jdx) => (jdx !== pos[1] ? j : []))
      );
      return result;
    });
    return pos;
  });
}

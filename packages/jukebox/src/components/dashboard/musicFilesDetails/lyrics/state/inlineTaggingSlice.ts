import { StateCreator } from "zustand";
import {
  InlineTaggingCurrentLineState,
  InlineTaggingSlice,
  LyricsState,
} from "./sliceTypes";
import { DOTS, TAGS, TIME_TAG } from "lyrics-kit/core";

/** Apply -200ms offset to all keypresses to compensate reflection time. */
const KEY_PRESS_OFFSET_SEC = -0.2;

const BLANK_LINE: InlineTaggingCurrentLineState = {
  indices: [],
  start: Infinity,
  end: -Infinity,
  borderIndex: -Infinity,
};

export const createInlineTaggingSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  InlineTaggingSlice
> = (set, get, api) => {
  // Helper to get the dots array for a given row
  function getRowDots(
    lines: any[] | undefined,
    row: number
  ): number[] | undefined {
    return lines?.[row]?.attachments?.[DOTS]?.values;
  }

  return {
    inlineTagging: {
      cursorPosition: [0, 0],
      dotCursorPosition: [0, 0, 0],
      currentLine: BLANK_LINE,
      autoApplyIdentical: true,
      setCursorPosition: (position: [number, number]) =>
        set((state) => {
          state.inlineTagging.cursorPosition = position;
        }),
      setDotCursorPosition: (position: [number, number, number]) =>
        set((state) => {
          state.inlineTagging.dotCursorPosition = position;
        }),
      setCurrentLine(line) {
        set((state) => {
          state.inlineTagging.currentLine = line;
        });
      },
      moveCursorUp() {
        set((state) => {
          const [row, col] = state.inlineTagging.cursorPosition;
          const lines = state.lyrics?.lines;
          const nRow = Math.max(0, row - 1);
          const rowCols = lines[nRow]?.content?.length ?? 0;
          state.inlineTagging.cursorPosition = [nRow, Math.min(col, rowCols)];
        });
      },
      moveCursorDown() {
        set((state) => {
          const [row, col] = state.inlineTagging.cursorPosition;
          const lines = state.lyrics?.lines;
          const nRow = Math.min(lines.length - 1, row + 1);
          const rowCols = lines[nRow]?.content?.length ?? 0;
          state.inlineTagging.cursorPosition = [nRow, Math.min(col, rowCols)];
        });
      },
      moveCursorLeft() {
        set((state) => {
          const [row, col] = state.inlineTagging.cursorPosition;
          if (col === 0 && row > 0) {
            const lines = state.lyrics?.lines;
            state.inlineTagging.cursorPosition = [
              row - 1,
              lines[row - 1].content.length,
            ];
          } else if (col === 0 && row === 0) {
            return;
          } else {
            state.inlineTagging.cursorPosition = [row, col - 1];
          }
        });
      },
      moveCursorRight() {
        set((state) => {
          const [row, col] = state.inlineTagging.cursorPosition;
          const lines = state.lyrics?.lines;
          const rowCols = lines[row]?.content?.length ?? 0;
          if (col + 1 > rowCols && row + 1 < lines.length) {
            state.inlineTagging.cursorPosition = [row + 1, 0];
          } else if (col + 1 > rowCols && row + 1 >= lines.length) {
            return;
          } else {
            state.inlineTagging.cursorPosition = [row, col + 1];
          }
        });
      },

      moveDotCursorUp() {
        set((state) => {
          const prev = state.inlineTagging.dotCursorPosition;
          let row = prev[0];
          let col = prev[1];
          const lines = state.lyrics?.lines ?? [];
          row = Math.max(0, row - 1);
          const colLen = getRowDots(lines, row)?.length ?? 1;
          col = Math.min(col, colLen - 1);
          while ((getRowDots(lines, row)?.[col] ?? 0) === 0) {
            if (col > 0) {
              col -= 1;
            } else if (col === 0 && row > 0) {
              row -= 1;
              const len = getRowDots(lines, row)?.length ?? 1;
              col = len - 1;
            } else {
              break;
            }
          }
          if ((getRowDots(lines, row)?.[col] ?? 0) === 0) {
            return;
          }
          state.inlineTagging.dotCursorPosition = [row, col, 0];
        });
      },
      moveDotCursorDown() {
        set((state) => {
          const prev = state.inlineTagging.dotCursorPosition;
          let row = prev[0];
          let col = prev[1];
          const lines = state.lyrics?.lines ?? [];
          row = Math.min(lines.length - 1, row + 1);
          const colLen = getRowDots(lines, row)?.length ?? 1;
          col = Math.min(col, colLen - 1);
          while ((getRowDots(lines, row)?.[col] ?? 0) === 0) {
            if (col + 1 < (getRowDots(lines, row)?.length ?? 0)) {
              col += 1;
            } else if (
              col + 1 >= (getRowDots(lines, row)?.length ?? 0) &&
              row + 1 < lines.length
            ) {
              row += 1;
              col = 0;
            } else {
              break;
            }
          }
          if ((getRowDots(lines, row)?.[col] ?? 0) === 0) {
            return;
          }
          state.inlineTagging.dotCursorPosition = [row, col, 0];
        });
      },
      moveDotCursorLeft() {
        set((state) => {
          const prev = state.inlineTagging.dotCursorPosition;
          let [row, column, dot] = prev;
          const lines = state.lyrics?.lines ?? [];
          if (dot > 0) {
            state.inlineTagging.dotCursorPosition = [row, column, dot - 1];
            return;
          }
          column -= 1;
          while ((getRowDots(lines, row)?.[column] ?? 0) === 0) {
            if (column > 0) {
              column -= 1;
            } else if (column <= 0 && row > 0) {
              row -= 1;
              const len = getRowDots(lines, row)?.length ?? 1;
              column = len - 1;
            } else {
              break;
            }
          }
          if ((getRowDots(lines, row)?.[column] ?? 0) === 0) {
            return;
          }
          dot = Math.max(0, (getRowDots(lines, row)?.[column] ?? 1) - 1);
          state.inlineTagging.dotCursorPosition = [row, column, dot];
        });
      },
      moveDotCursorRight() {
        set((state) => {
          const prev = state.inlineTagging.dotCursorPosition;
          // eslint-disable-next-line prefer-const
          let [row, column, dot] = prev;
          const lines = state.lyrics?.lines ?? [];
          const dotCount = getRowDots(lines, row)?.[column] ?? 0;
          if (dot + 1 < dotCount) {
            state.inlineTagging.dotCursorPosition = [row, column, dot + 1];
            return;
          }
          column += 1;
          while ((getRowDots(lines, row)?.[column] ?? 0) === 0) {
            const colLen = getRowDots(lines, row)?.length ?? 0;
            if (column + 1 < colLen) {
              column += 1;
            } else if (column + 1 >= colLen && row + 1 < lines.length) {
              row += 1;
              column = 0;
            } else {
              break;
            }
          }
          if ((getRowDots(lines, row)?.[column] ?? 0) === 0) {
            return;
          }
          state.inlineTagging.dotCursorPosition = [row, column, 0];
        });
      },
      setDot() {
        set((state) => {
          const {
            cursorPosition: [row, column],
          } = state.inlineTagging;
          const line = state.lyrics?.lines[row];
          if (!line) {
            return;
          }
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[DOTS]) {
            line.attachments[DOTS] = {
              type: "number_array",
              values: [],
            };
          }
          const dots = line.attachments[DOTS].values;
          if (!Array.isArray(dots)) {
            line.attachments[DOTS].values = [];
          }
          dots[column] = Math.max(1, Math.min(8, (dots[column] ?? 0) + 1));
        });
        const state = get();
        if (state.inlineTagging.autoApplyIdentical) {
          state.inlineTagging.applyMarksToIdenticalLines(
            state.inlineTagging.cursorPosition[0]
          );
        }
        state.generate();
      },
      setHoldDot: () => {
        set((state) => {
          const {
            cursorPosition: [row, column],
          } = state.inlineTagging;
          const line = state.lyrics?.lines[row];
          if (!line) {
            return;
          }
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[DOTS]) {
            line.attachments[DOTS] = {
              type: "number_array",
              values: [],
            };
          }
          const dots = line.attachments[DOTS].values;
          if (!Array.isArray(dots)) {
            line.attachments[DOTS].values = [];
          }
          dots[column] = -1;
        });
        const state = get();
        if (state.inlineTagging.autoApplyIdentical) {
          state.inlineTagging.applyMarksToIdenticalLines(
            state.inlineTagging.cursorPosition[0]
          );
        }
        state.generate();
      },
      dropDot: () => {
        set((state) => {
          const {
            cursorPosition: [row, column],
          } = state.inlineTagging;
          const line = state.lyrics?.lines[row];
          if (!line) {
            return;
          }
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[DOTS]) {
            line.attachments[DOTS] = {
              type: "number_array",
              values: [],
            };
          }
          const dots = line.attachments[DOTS].values;
          if (!Array.isArray(dots)) {
            line.attachments[DOTS].values = [];
          }
          dots[column] = 0;
        });
        const state = get();
        if (state.inlineTagging.autoApplyIdentical) {
          state.inlineTagging.applyMarksToIdenticalLines(
            state.inlineTagging.cursorPosition[0]
          );
        }
        state.generate();
      },
      setMark(time) {
        set((state) => {
          const {
            dotCursorPosition: [row, column, dot],
          } = state.inlineTagging;
          const line = state.lyrics?.lines[row];
          if (!line) {
            return;
          }
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[TAGS]) {
            line.attachments[TAGS] = {
              type: "number_2d_array",
              values: [],
            };
          }
          const tags = line.attachments?.[TAGS]?.values;
          if (!Array.isArray(tags)) {
            line.attachments[TAGS].values = [];
          }
          if (!Array.isArray(tags[column])) {
            tags[column] = [];
          }
          tags[column][dot] = Math.max(0, time + KEY_PRESS_OFFSET_SEC);
          if (dot === 0) {
            if (!line.attachments[TIME_TAG]) {
              line.attachments[TIME_TAG] = {
                type: "time_tag",
                tags: [],
              };
            }
            const timeTags = line.attachments[TIME_TAG].tags;

            const existingTag = timeTags.find((tag) => tag.index === column);
            const offset = line.position || tags?.flat().find((s) => !!s) || 0;
            if (existingTag) {
              existingTag.timeTag = time + KEY_PRESS_OFFSET_SEC - offset;
            } else {
              timeTags.push({
                index: column,
                timeTag: time + KEY_PRESS_OFFSET_SEC - offset,
              });
              if (
                timeTags.length > 1 &&
                timeTags.at(-2).index > timeTags.at(-1).index
              ) {
                timeTags.sort((a, b) => a.index - b.index);
              }
            }
          }
        });
        get().debouncedGenerate();
      },
      dropMark(seek) {
        const {
          dotCursorPosition: [row, column],
        } = get().inlineTagging;
        const line = get().lyrics?.lines[row];
        if (!line?.attachments?.[TAGS]?.values?.[column]?.length) {
          get().inlineTagging.moveDotCursorLeft();
        }
        set((state) => {
          const {
            dotCursorPosition: [row, column],
          } = state.inlineTagging;
          const line = state.lyrics?.lines[row];
          if (!line) {
            return;
          }
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[TAGS]) {
            line.attachments[TAGS] = {
              type: "number_2d_array",
              values: [],
            };
          }
          const tags = line.attachments[TAGS].values;
          if (!Array.isArray(tags)) {
            line.attachments[TAGS].values = [];
          }
          tags[column] = [];
          if (line.attachments[TIME_TAG]?.tags?.length) {
            line.attachments[TIME_TAG].tags = line.attachments[
              TIME_TAG
            ].tags.filter((tag) => tag.index !== column);
          }
          state.inlineTagging.dotCursorPosition[2] = 0;
        });
        get().inlineTagging.moveDotCursorLeft();
        if (seek) {
          const {
            inlineTagging: {
              dotCursorPosition: [newRow, newCol],
            },
            lyrics,
          } = get();
          const time =
            lyrics?.lines[newRow].attachments?.[TAGS]?.values?.[newCol]?.[0];
          if (time) {
            seek(Math.max(0, time - 3));
          }
        }
        get().debouncedGenerate();
      },
      populateDotsAndMarks() {
        set((state) => {
          state.lyrics?.lines.forEach((line) => {
            if (
              line.attachments?.[TIME_TAG]?.tags?.length &&
              (!line.attachments?.[DOTS]?.values.some((v) => v) ||
                !line.attachments?.[TAGS]?.values.some((v) =>
                  v?.some((t) => t)
                ))
            ) {
              const timeTags = line.attachments[TIME_TAG].tags;
              const contentSize = [...line.content].length;
              if (!line.attachments) {
                line.attachments = {};
              }
              if (!line.attachments[DOTS]) {
                line.attachments[DOTS] = {
                  type: "number_array",
                  values: [],
                };
              }
              if (!line.attachments[DOTS].values.some((v) => v)) {
                line.attachments[DOTS].values = new Array(contentSize + 1).fill(
                  0
                );
                timeTags.forEach((tag, idx) => {
                  const index = Math.min(
                    Math.max(0, tag.index),
                    line.attachments[DOTS].values.length
                  );
                  line.attachments[DOTS].values[index] =
                    idx < timeTags.length - 1 ? 1 : -1;
                });
              }
              if (!line.attachments[TAGS]) {
                line.attachments[TAGS] = {
                  type: "number_2d_array",
                  values: [],
                };
              }
              if (!line.attachments[TAGS].values) {
                line.attachments[TAGS].values = [];
              }
              if (
                !line.attachments[TAGS].values.some((v) => v?.some((t) => t))
              ) {
                line.attachments[TAGS].values = new Array(contentSize + 1)
                  .fill(0)
                  .map((): number[] => []);
                timeTags.forEach((tag) => {
                  const index = Math.min(
                    Math.max(0, tag.index),
                    line.attachments[TAGS].values.length
                  );
                  line.attachments[TAGS].values[index][0] =
                    (isNaN(line.position) ? 0 : line.position) + tag.timeTag;
                });
              }
            }
          });
        });
      },
      updateTimeTags() {
        set((state) => {
          state.lyrics?.lines.forEach((line, idx, arr) => {
            if (
              !line.attachments?.[TAGS]?.values?.length &&
              !arr[idx - 1]?.attachments?.[TAGS]?.values?.length &&
              !arr[idx + 1]?.attachments?.[TAGS]?.values?.length
            ) {
              return;
            }

            const prevTags = arr[idx - 1]?.attachments?.[TAGS]?.values?.flat();
            const prevEndTime = prevTags?.length ? Math.max(...prevTags) : null;
            const nextTags = arr[idx + 1]?.attachments?.[TAGS]?.values?.flat();
            const nextStartTime = nextTags?.length
              ? Math.min(...nextTags)
              : null;
            const firstTag = line?.attachments?.[TAGS]?.values?.flat()[0];
            const fallbackStartTime =
              isNaN(line.position) && !prevEndTime
                ? NaN
                : isNaN(line.position)
                ? prevEndTime
                : !prevEndTime
                ? line.position
                : line.content
                ? Math.max(
                    isNaN(line.position) ? 0 : line.position,
                    prevEndTime ?? 0
                  )
                : // Force empty line to use prevEndTime or NextStartTime, whichever is earlier
                  (prevEndTime &&
                    nextStartTime &&
                    Math.min(prevEndTime, nextStartTime)) ??
                  nextStartTime ??
                  prevEndTime;
            const newTime = firstTag || fallbackStartTime;
            if (
              !isNaN(newTime) &&
              (isNaN(line.position) || Math.abs(line.position - newTime) > 0.01)
            ) {
              line.position = newTime;
              if (line.attachments?.[TAGS]?.values?.length) {
                if (!line.attachments?.[TIME_TAG]) {
                  line.attachments[TIME_TAG] = {
                    type: "time_tag",
                    tags: [],
                  };
                }
                line.attachments[TIME_TAG].tags = line.attachments[TAGS].values
                  .map((tags, idx) => {
                    const timeTag = tags[0];
                    if (timeTag !== null && timeTag !== undefined) {
                      const offset = line.position || 0;
                      return {
                        index: idx,
                        timeTag: timeTag - offset,
                      };
                    }
                    return null;
                  })
                  .filter((tag) => tag !== null);
              }
            }
          });
        });
      },
      applyMarksToIdenticalLines(index: number) {
        set((state) => {
          const { lyrics } = state;
          if (!lyrics) return;
          const line = lyrics.lines[index];
          if (!line) return;
          const dots = line.attachments?.[DOTS];

          for (let i = 0; i < lyrics.lines.length; i++) {
            const nextLine = lyrics.lines[i];
            if (
              nextLine.content === line.content &&
              !(
                nextLine.attachments?.[DOTS]?.values?.every(
                  (v, idx) => v === dots?.values[idx]
                ) ?? false
              )
            ) {
              nextLine.attachments[DOTS] = dots;
            }
          }
        });
      },
      setDots(dots) {
        set((state) => {
          const { lyrics } = state;
          if (!lyrics) return;
          lyrics.lines.forEach((line, idx) => {
            if (!line.attachments) {
              line.attachments = {};
            }
            if (!line.attachments[DOTS]) {
              line.attachments[DOTS] = {
                type: "number_array",
                values: [],
              };
            }
            line.attachments[DOTS].values = dots[idx];
          });
        });
        get().generate();
      },
      setAutoApplyIdentical(value) {
        set((state) => {
          state.inlineTagging.autoApplyIdentical = value;
        });
      },
    },
  };
};

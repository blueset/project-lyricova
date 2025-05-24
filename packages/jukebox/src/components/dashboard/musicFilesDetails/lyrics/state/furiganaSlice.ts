import { StateCreator } from "zustand";
import { FuriganaSlice, LyricsState } from "./sliceTypes";
import { FURIGANA, RangeAttributeLabelJSON } from "lyrics-kit/core";
import { kanaToHira } from "@lyricova/components";
import { generateDiffLines } from "../furigana/FuriganaRomajiMatching";

type FuriganaGroup = string | [string, string];

/**
 * @example
 * baseText: "VOCALOIDが大好き"
 * furiganaText: "ボー;,カ;,ロ;,イ,ド,,だい,す,"
 * result: [["VO", "ボー"], ["CA", "カ"], ["LO", "ロ"], ["I", "イ"], ["D", "ド"], "が", ["大", "だい"], ["好", "す"], "き"]
 *
 * Constraints:
 * furiganaText matches /^.*(;*,.*)*$/
 * furiganaText.count(";") + furiganaText.count(",") == [...baseText].length - 1
 */
export function codeToFuriganaGroups(
  baseText: string,
  furiganaText: string
): FuriganaGroup[] {
  const result: FuriganaGroup[] = [];

  if (baseText && furiganaText) {
    // Split the furiganaText into segments by commas
    const segments = furiganaText.split(",");

    let baseIndex = 0;

    for (let i = 0; i < segments.length && baseIndex < baseText.length; i++) {
      const segment = segments[i];

      if (segment === "") {
        // Empty segment means no furigana for this character
        result.push(baseText[baseIndex]);
        baseIndex++;
      } else {
        // Count semicolons to determine group size
        const semicolonCount = (segment.match(/;/g) || []).length;
        // Remove semicolons to get the actual furigana
        const furigana = segment.replace(/;/g, "");

        // Calculate how many characters to group together
        const groupSize = semicolonCount + 1; // +1 for the current character

        // Extract the base group from baseText
        const baseGroup = baseText.substring(baseIndex, baseIndex + groupSize);

        // Add the [baseGroup, furigana] pair to the result
        result.push([baseGroup, furigana]);

        // Move index forward by the group size
        baseIndex += groupSize;
      }
    }

    // Add any remaining characters from baseText
    if (baseIndex < baseText.length) {
      result.push(baseText.substring(baseIndex));
    }
  } else if (baseText) {
    result.push(baseText);
  }

  return result;
}

export const createFuriganaSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  FuriganaSlice
> = (set, get, api) => {
  return {
    furigana: {
      autoApplyIdentical: true,
      romajiMatching: [],
      vocaDbFuriganaLines: [],
      setSelectedLine(line) {
        set((state) => {
          state.furigana.selectedLine = line;
          if (line < 0) {
            return;
          }
        });
      },
      setAutoApplyIdentical(value) {
        set((state) => {
          state.furigana.autoApplyIdentical = value;
        });
      },
      setVocaDbFuriganaLines(lines) {
        set((state) => {
          state.furigana.vocaDbFuriganaLines = lines;
        });
        get().furigana.refreshRomajiMatching();
      },
      refreshRomajiMatching() {
        requestAnimationFrame(() => {
          set((state) => {
            const lines = state.lyrics?.lines ?? [];
            if (!lines.length || !state.furigana.vocaDbFuriganaLines) {
              state.furigana.romajiMatching = [];
              return;
            }
            const kanaLines = lines.map((line) => {
              const kanaLine: string[] = [];
              let ptr = 0;
              const base = line.content;
              const furigana = line?.attachments?.[FURIGANA]?.attachment ?? [];
              furigana.forEach(({ content, range: [start, end] }) => {
                if (start > ptr) {
                  kanaLine.push(base.substring(ptr, start));
                }
                kanaLine.push(content);
                ptr = end;
              });
              if (ptr < base.length) kanaLine.push(base.substring(ptr));

              return kanaToHira(kanaLine.join("").trimEnd());
            });

            const newMatching = generateDiffLines(
              kanaLines,
              state.furigana.vocaDbFuriganaLines
            );
            for (let i = 0; i < newMatching.length; i++) {
              if (
                JSON.stringify(state.furigana.romajiMatching[i]) !==
                JSON.stringify(newMatching[i])
              ) {
                state.furigana.romajiMatching[i] = newMatching[i];
              }
            }
          });
        });
      },
      setFurigana(data) {
        set((state) => {
          if (!state.lyrics) {
            return;
          }
          data.forEach((v, index) => {
            const line = state.lyrics.lines[index];
            if (!line) return;
            if (v.length < 1) {
              delete line.attachments[FURIGANA];
            } else {
              const { tags, content } = v.reduce<{
                len: number;
                content: string;
                tags: RangeAttributeLabelJSON[];
              }>(
                ({ len, tags, content }, [base, furigana]) => {
                  if (base === furigana)
                    return {
                      len: len + base.length,
                      tags,
                      content: content + base,
                    };
                  else {
                    tags.push({
                      content: furigana,
                      range: [len, len + base.length],
                    });
                    return {
                      len: len + base.length,
                      tags,
                      content: content + base,
                    };
                  }
                },
                { len: 0, tags: [], content: "" }
              );

              if (tags.length < 1) delete line.attachments[FURIGANA];
              else {
                line.attachments[FURIGANA] = {
                  type: "range",
                  attachment: tags,
                };
                line.content = content;
              }
            }
          });
        });
        get().generate();
        get().furigana.refreshRomajiMatching();
      },
      applyIdenticalFurigana(sourceIndex) {
        set((state) => {
          const lines = state.lyrics?.lines ?? [];
          const sourceLine = lines[sourceIndex];
          if (!sourceLine) return;
          const sourceFurigana = sourceLine.attachments?.[FURIGANA];
          if (!sourceFurigana) {
            lines.forEach((line) => {
              if (line.content === sourceLine.content) {
                delete line.attachments[FURIGANA];
              }
            });
          } else {
            lines.forEach((line) => {
              if (line.content === sourceLine.content) {
                line.attachments[FURIGANA] = sourceFurigana;
              }
            });
          }
        });
        get().debouncedGenerate();
      },
      addFuriganaToSelectedLine(start, end, furigana) {
        set((state) => {
          const lines = state.lyrics?.lines ?? [];
          const line = lines[state.furigana.selectedLine];
          if (!line) return;
          if (!line.attachments) {
            line.attachments = {};
          }
          if (!line.attachments[FURIGANA]) {
            line.attachments[FURIGANA] = {
              type: "range",
              attachment: [],
            };
          }

          const base = line.content.substring(start, end);
          if (
            base.length > 1 &&
            (furigana.includes(",") || furigana.includes(";"))
          ) {
            const processedSequence = codeToFuriganaGroups(base, furigana);
            processedSequence.reduce((acc, value) => {
              if (typeof value === "string") {
                acc += value.length;
              } else {
                const [base, furigana] = value;
                line.attachments[FURIGANA].attachment.push({
                  content: furigana,
                  range: [acc, acc + base.length],
                });
                acc += base.length;
              }
              return acc;
            }, start);
          } else {
            line.attachments[FURIGANA].attachment.push({
              content: furigana,
              range: [start, end],
            });
          }

          line.attachments[FURIGANA].attachment.sort((a, b) => {
            if (a.range[0] === b.range[0]) {
              return a.range[1] - b.range[1];
            }
            return a.range[0] - b.range[0];
          });
        });

        if (get().furigana.autoApplyIdentical) {
          get().furigana.applyIdenticalFurigana(get().furigana.selectedLine);
        }
        get().debouncedGenerate();
        get().furigana.refreshRomajiMatching();
      },
      removeFuriganaFromSelectedLine(start, end) {
        set((state) => {
          const lines = state.lyrics?.lines ?? [];
          const line = lines[state.furigana.selectedLine];
          if (!line) return;
          if (!line.attachments || !line.attachments[FURIGANA]) return;
          line.attachments[FURIGANA].attachment = line.attachments[
            FURIGANA
          ].attachment.filter(
            (v) => v.range[0] !== start || v.range[1] !== end
          );
          if (line.attachments[FURIGANA].attachment.length < 1) {
            delete line.attachments[FURIGANA];
          }
        });

        if (get().furigana.autoApplyIdentical) {
          get().furigana.applyIdenticalFurigana(get().furigana.selectedLine);
        }
        get().debouncedGenerate();
        get().furigana.refreshRomajiMatching();
      },
      applyPatternToAllLines(baseText, furiganaText) {
        set((state) => {
          const lines = state.lyrics?.lines;
          if (!baseText || !furiganaText || !lines.length) return;
          const groups = codeToFuriganaGroups(baseText, furiganaText);

          lines.forEach((line) => {
            const matches: number[] = [];
            let matchIdx = line.content.indexOf(baseText);
            while (matchIdx !== -1) {
              matches.push(matchIdx);
              matchIdx = line.content.indexOf(baseText, matchIdx + 1);
            }
            if (matches.length < 1) return line;
            let furiganaAttribute =
              line?.attachments?.[FURIGANA]?.attachment || [];

            // Filter and adjust existing ranges
            furiganaAttribute = furiganaAttribute.filter((label) => {
              const [labelStart, labelEnd] = label.range;

              // Check against all match ranges
              for (const matchStart of matches) {
                const matchEnd = matchStart + [...baseText].length;
                // Full overlap - remove the label
                if (matchStart <= labelStart && matchEnd >= labelEnd) {
                  return false;
                }

                // Partial overlap from left - adjust start
                if (
                  matchStart <= labelStart &&
                  matchEnd > labelStart &&
                  matchEnd < labelEnd
                ) {
                  label.range[0] = matchEnd;
                  return true;
                }

                // Partial overlap from right - adjust end
                if (
                  matchStart > labelStart &&
                  matchStart < labelEnd &&
                  matchEnd >= labelEnd
                ) {
                  label.range[1] = matchStart;
                  return true;
                }
              }
              return true;
            });

            // Add new furigana ranges for each match
            matches.forEach((start) => {
              let pos = start;
              groups.forEach((group) => {
                if (Array.isArray(group)) {
                  furiganaAttribute.push({
                    content: group[1],
                    range: [pos, pos + [...group[0]].length],
                  });
                  pos += [...group[0]].length;
                } else {
                  pos += [...group].length;
                }
              });
            });

            if (furiganaAttribute.length > 0) {
              furiganaAttribute.sort((a, b) => {
                const [aStart] = a.range;
                const [bStart] = b.range;
                return aStart - bStart;
              });
              line.attachments[FURIGANA] = {
                type: "range",
                attachment: furiganaAttribute,
              };
            } else {
              delete line.attachments[FURIGANA];
            }
          });
        });
        get().generate();
        get().furigana.refreshRomajiMatching();
      },
    },
  };
};

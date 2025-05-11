import { StateCreator } from "zustand";
import { LyricsState, TaggingSlice } from "./sliceTypes";
import { TIME_TAG } from "lyrics-kit/core";
import { TAGS } from "../../../../../../../lyrics-kit/build/module/core/lyricsLineAttachment";
import { linearRegression } from "simple-statistics";

export const createTaggingSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  TaggingSlice
> = (set, get, api) => {
  return {
    tagging: {
      cursor: 0,
      currentLine: { index: Infinity, start: Infinity, end: -Infinity },
      isInExtrapolateMode: false,
      extrapolateTags: [],
      setCursor: (cursor: number) =>
        set((state) => {
          state.tagging.cursor = cursor;
        }),
      setCurrentLine: (line: TaggingSlice["tagging"]["currentLine"]) =>
        set((state) => {
          state.tagging.currentLine = line;
        }),
      setIsInExtrapolateMode: (isInExtrapolateMode: boolean) =>
        set((state) => {
          state.tagging.isInExtrapolateMode = isInExtrapolateMode;
          state.tagging.extrapolateTags = [];
        }),
      setTimestampAtCursor: (timestamp: number) => {
        set((state) => {
          const { cursor } = state.tagging;
          const { lyrics } = state;
          if (cursor < 0) {
            return;
          }
          const line = lyrics?.lines[cursor];
          if (!line) {
            return;
          }
          line.position = timestamp;
        });
        get().debouncedGenerate();
      },
      setExtrapolateTagsAtCursor: (value: number | null) => {
        set((state) => {
          const { cursor, extrapolateTags } = state.tagging;
          if (cursor < 0) {
            return;
          }
          extrapolateTags[cursor] = value;

          const lines = state.lyrics?.lines ?? [];
          const points: [number, number][] = [];
          for (
            let i = 0;
            i < Math.min(state.lyrics.lines.length, extrapolateTags.length);
            i++
          ) {
            if (extrapolateTags[i] != null && lines[i]?.position != null) {
              points.push([lines[i].position, extrapolateTags[i]]);
            }
          }
          if (points.length < 1) return;
          state.tagging.linearRegressionResult = linearRegression(points);
        });
      },
      applyExtrapolation: () => {
        const { linearRegressionResult } = get().tagging;
        if (!linearRegressionResult) {
          return;
        }
        const { m, b } = linearRegressionResult;
        set((state) => {
          state.lyrics?.lines.forEach((line, index) => {
            line.position = Math.max(0, m * line.position + b);
            if (line?.attachments?.[TIME_TAG]) {
              line.attachments[TIME_TAG].tags = line.attachments[
                TIME_TAG
              ].tags.map((tag) => {
                tag.timeTag = Math.max(0, m * tag.timeTag);
                return tag;
              });
            }
            if (line?.attachments?.[TAGS]) {
              line.attachments[TAGS].values = line.attachments[TAGS].values.map(
                (tag) => {
                  return tag.map((t) => Math.max(0, m * t + b));
                }
              );
            }
            state.tagging.linearRegressionResult = {
              m: 1,
              b: 0,
            };
          });
          get().generate();
        });
      },
      reset: () =>
        set((state) => {
          state.tagging.cursor = 0;
          state.tagging.currentLine = {
            index: Infinity,
            start: Infinity,
            end: -Infinity,
          };
          state.tagging.isInExtrapolateMode = false;
          state.tagging.extrapolateTags = [];
          delete state.tagging.linearRegressionResult;
        }),
    },
  };
};

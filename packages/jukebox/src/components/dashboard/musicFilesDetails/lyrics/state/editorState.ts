import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createMainSlice } from "./mainSlice";
import { LyricsState } from "./sliceTypes";
import { createTaggingSlice } from "./taggingSlice";
import { createTranslationSlice } from "./translationSlice";
import { createFuriganaSlice } from "./furiganaSlice";
import { createRoleSlice } from "./roleSlice";
import { createInlineTaggingSlice } from "./inlineTaggingSlice";

export const useLyricsStore = create<LyricsState>()(
  immer(
    devtools(
      subscribeWithSelector((...a) => ({
        ...createMainSlice(...a),
        ...createTaggingSlice(...a),
        ...createTranslationSlice(...a),
        ...createFuriganaSlice(...a),
        ...createRoleSlice(...a),
        ...createInlineTaggingSlice(...a),
      }))
    )
  )
);

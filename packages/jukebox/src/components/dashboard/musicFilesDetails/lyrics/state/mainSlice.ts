import { type StateCreator } from "zustand";
import "zustand/middleware/immer";
import { Lyrics } from "lyrics-kit";
import { LyricsState, MainSlice } from "./sliceTypes";

export const createMainSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  MainSlice
> = (set, get, api) => {
  const initialState: Omit<
    MainSlice,
    "debouncedGenerate" | "debouncedParse" | "parse" | "generate"
  > = {
    lrcx: "",
    lrc: "",
    setLrcx: (lrcx: string) => {
      set((state) => {
        state.lrcx = lrcx;
      });
      debouncedParse();
    },
    setLrc: (lrc: string) =>
      set((state) => {
        state.lrc = lrc;
      }),
  };

  set(initialState);

  const parseImpl = () => {
    set((state) => {
      const { lrcx, lrc } = state;
      try {
        const lyrics = new Lyrics(lrcx || lrc);
        state.lyrics = lyrics.toJSON();
        state.parseError = undefined;

        // Set translation states.
        const languages = lyrics.translationLanguages;
        state.translations.languages = languages;
        if (languages.length === 0) {
          state.translations.selectedLanguage = undefined;
          state.translations.selectedLanguageIndex = 0;
          state.translations.textareaValue = "";
        } else if (languages.includes(state.translations.selectedLanguage)) {
          state.translations.selectedLanguageIndex = languages.indexOf(
            state.translations.selectedLanguage
          );
          state.translations.textareaValue = lyrics.lines
            .map((l) =>
              l.attachments.translation(state.translations.selectedLanguage)
            )
            .join("\n");
        } else {
          state.translations.selectedLanguage = languages[0];
          state.translations.selectedLanguageIndex = 0;
          state.translations.textareaValue = lyrics.lines
            .map((l) => l.attachments.translation(languages[0]))
            .join("\n");
        }
      } catch (error) {
        state.parseError = (error as Error).message;
        state.lyrics = undefined;
        state.translations.selectedLanguage = undefined;
        state.translations.textareaValue = "";
      }
    });
  };
  const generateImpl = () => {
    // update timetags
    get().inlineTagging.updateTimeTags();

    set((state) => {
      const { lyrics } = state;
      if (!lyrics) return;

      const lrcx = Lyrics.fromJSON(lyrics).toString();
      state.lrcx = lrcx;
    });
    return get().lrcx;
  };

  const debounce = <T>(fn: () => T, delay: number): [() => void, () => T] => {
    let timer: ReturnType<typeof setTimeout>;
    return [
      () => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      },
      () => {
        clearTimeout(timer);
        return fn();
      },
    ];
  };

  const [debouncedParse, parse] = debounce(() => parseImpl(), 300);

  const [debouncedGenerate, generate] = debounce(() => generateImpl(), 300);

  return {
    ...initialState,
    parse,
    generate,
    debouncedParse,
    debouncedGenerate,
  };
};

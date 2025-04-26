import { StateCreator } from "zustand";
import { LyricsState, TranslationSlice } from "./sliceTypes";
import { TRANSLATION } from "../../../../../../../lyrics-kit/build/module/core/lyricsLineAttachment";
import { smartypantsu } from "smartypants";

export function languageToTag(
  language?: string
): typeof TRANSLATION | `${typeof TRANSLATION}:${string}` {
  if (!language) return TRANSLATION;
  return `${TRANSLATION}:${language}`;
}

export const createTranslationSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  TranslationSlice
> = (set, get, api) => {
  return {
    translations: {
      selectedLanguageIndex: 0,
      textareaValue: "",
      languages: [],
      setSelectedLanguage(language) {
        set((state) => {
          state.translations.selectedLanguage = language;
          if (!state.translations.languages.includes(language)) {
            state.translations.languages.push(language);
          }
          state.translations.selectedLanguageIndex =
            state.translations.languages.indexOf(language);
          if (!state.lyrics) {
            state.translations.textareaValue = "";
          } else {
            const selectedLanguage = languageToTag(language);
            state.translations.textareaValue = state.lyrics?.lines
              .map((l) => l.attachments[selectedLanguage]?.text || "")
              .join("\n");
          }
        });
      },
      renameSelectedLanguage(newName) {
        set((state) => {
          const selectedLanguageIndex =
            state.translations.selectedLanguageIndex;
          if (
            selectedLanguageIndex < 0 ||
            selectedLanguageIndex >= state.translations.languages.length
          ) {
            return;
          }

          const selectedLanguage =
            state.translations.languages[selectedLanguageIndex];
          const selectedLanguageTag = languageToTag(selectedLanguage);
          const newLanguageTag = languageToTag(newName);
          state.translations.languages[selectedLanguageIndex] = newName;
          state.translations.selectedLanguage = newName;
          state.lyrics?.lines.forEach((line) => {
            if (line.attachments[selectedLanguageTag]) {
              line.attachments[newLanguageTag] =
                line.attachments[selectedLanguageTag];
              delete line.attachments[selectedLanguageTag];
            }
          });
          state.debouncedGenerate();
        });
      },
      removeLanguageByIndex(index) {
        set((state) => {
          if (index < 0 || index >= state.translations.languages.length) {
            return;
          }
          console.log(
            `Removing language ${state.translations.languages[index]} at index ${index}`
          );
          const language = state.translations.languages[index];
          const languageTag = languageToTag(language);
          state.lyrics?.lines.forEach((line) => {
            if (line.attachments[languageTag]) {
              delete line.attachments[languageTag];
            }
          });
          state.translations.languages.splice(index, 1);
          console.log(
            `Removed language ${language} at index ${index}, new languages: ${state.translations.languages}`
          );
        });
        const state = get();
        const newLanguageToSelect =
          state.translations.languages[Math.max(0, index - 1)];
        state.translations.setSelectedLanguage(newLanguageToSelect);
        state.generate();
      },
      setTextareaValue(value) {
        set((state) => {
          state.translations.textareaValue = value;
          const lines = value.split("\n");
          const selectedLanguage = languageToTag(
            state.translations.selectedLanguage
          );
          state.lyrics?.lines.forEach((line, index) => {
            if (lines[index]) {
              line.attachments[selectedLanguage] = {
                type: "plain_text",
                text: lines[index],
              };
            } else {
              delete line.attachments[selectedLanguage];
            }
          });
          state.debouncedGenerate();
        });
      },
      fixQuotes() {
        set((state) => {
          state.translations.textareaValue = smartypantsu(
            state.translations.textareaValue ?? ""
          );
          state.generate();
        });
      },
    },
  };
};

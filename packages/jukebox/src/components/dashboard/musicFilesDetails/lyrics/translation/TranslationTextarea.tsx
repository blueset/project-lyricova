import { Textarea } from "@lyricova/components/components/ui/textarea";
import { useCallback } from "react";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

export default function TranslationTextarea() {
  const { textareaValue, setTextareaValue, selectedLanguage } = useLyricsStore(
    useShallow((state) => ({
      textareaValue: state.translations.textareaValue,
      setTextareaValue: state.translations.setTextareaValue,
      selectedLanguage: state.translations.selectedLanguage,
    }))
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextareaValue(event.target.value);
    },
    [setTextareaValue]
  );

  return (
    <div>
      <div className="mb-2 text-muted-foreground text-xs uppercase">
        Translations
      </div>
      <Textarea
        id="translations"
        placeholder="Translations"
        value={textareaValue}
        onChange={handleChange}
        autoResize
        className="text-sm leading-relaxed"
        lang={selectedLanguage || "zh"}
      />
    </div>
  );
}

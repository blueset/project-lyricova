import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { useCallback } from "react";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";
import type { VocaDBLyricsEntry } from "@lyricova/api/graphql/types";

interface VocaDBTranslationImportProps {
  vocaDBTranslations: VocaDBLyricsEntry[];
}

export default function VocaDBTranslationImport({
  vocaDBTranslations,
}: VocaDBTranslationImportProps) {
  const { setSelectedLanguage, setTextareaValue } = useLyricsStore(
    useShallow((state) => ({
      setSelectedLanguage: state.translations.setSelectedLanguage,
      setTextareaValue: state.translations.setTextareaValue,
    }))
  );

  const handleImportTranslation = useCallback(
    (translation: VocaDBLyricsEntry) => {
      const languages = useLyricsStore.getState().translations.languages;
      let newLanguage = translation.cultureCodes.join("+") || "lang";
      let idx = 0;
      while (languages.includes(newLanguage)) {
        newLanguage = `${newLanguage}-${++idx}`;
      }
      setSelectedLanguage(newLanguage);
      setTextareaValue(translation.value);
    },
    [setSelectedLanguage, setTextareaValue]
  );

  if (vocaDBTranslations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap">
      {vocaDBTranslations.map((translation) => (
        <Tooltip key={translation.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="min-w-0"
              size="sm"
              onClick={() => handleImportTranslation(translation)}
            >
              {translation.cultureCodes?.join(", ")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              {translation.cultureCodes?.join(", ")} – {translation.source}
              <br />
              {translation.value.substring(0, 100)}…
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

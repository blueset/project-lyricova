import { useCallback } from "react";
import { Captions } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";

interface Props {
  languages: (string | undefined)[];
  selectedLanguageIdx: number;
  setSelectedLanguageIdx: (idx: number) => void;
}

export function LyricsTranslationLanguageSwitchButton({
  languages,
  selectedLanguageIdx,
  setSelectedLanguageIdx,
}: Props) {
  const handleNext = useCallback(() => {
    setSelectedLanguageIdx((selectedLanguageIdx + 1) % languages.length);
  }, [languages, selectedLanguageIdx, setSelectedLanguageIdx]);

  if (languages.length <= 1) return null;

  return (
    <Button size="sm" variant="outline" onClick={handleNext}>
      {languages[selectedLanguageIdx] ?? <Captions />}
    </Button>
  );
}

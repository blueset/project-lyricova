import { useCallback } from "react";
import TranslateIcon from "@mui/icons-material/Translate";
import { Button, styled } from "@mui/material";

const NarrowButton = styled(Button)({
  minWidth: "unset",
});

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
    <NarrowButton
      size="small"
      variant="outlined"
      color="primary"
      onClick={handleNext}
    >
      {languages[selectedLanguageIdx] ?? <TranslateIcon />}
    </NarrowButton>
  );
}

import { useCallback, useLayoutEffect, useRef } from "react";
import { Languages } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import { Google_Sans_Flex } from "next/font/google";

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["wdth"],
});

export const HIDDEN_TRANSLATION_LANGUAGE_INDEX = -1;

const MIN_FONT_WIDTH = 25;
const MAX_FONT_WIDTH = 151;
const DEFAULT_FONT_WIDTH = 100;

interface Props {
  languages: (string | undefined)[];
  selectedLanguageIdx: number;
  onSelectedLanguageIdxChange: (idx: number) => void;
}

function setFontWidth(element: HTMLSpanElement, width: number) {
  element.style.fontStretch = `${width}%`;
  element.style.fontFeatureSettings = `"wdth" ${width}`;
  element.style.fontVariationSettings = `"wdth" ${width}`;
}

export function LyricsTranslationLanguageSwitchButton({
  languages,
  selectedLanguageIdx,
  onSelectedLanguageIdxChange,
}: Props) {
  const languageCodeRef = useRef<HTMLSpanElement>(null);
  const selectedLanguage = languages[selectedLanguageIdx];
  const hasKnownLanguage = Boolean(selectedLanguage);

  const handleNext = useCallback(() => {
    onSelectedLanguageIdxChange(
      selectedLanguageIdx >= languages.length - 1
        ? HIDDEN_TRANSLATION_LANGUAGE_INDEX
        : selectedLanguageIdx + 1,
    );
  }, [languages, onSelectedLanguageIdxChange, selectedLanguageIdx]);

  useLayoutEffect(() => {
    const element = languageCodeRef.current;
    if (!element || !hasKnownLanguage) return;

    let cancelled = false;
    const fitLanguageCode = () => {
      if (cancelled) return;

      let low = MIN_FONT_WIDTH;
      let high = MAX_FONT_WIDTH;
      let bestWidth = DEFAULT_FONT_WIDTH;
      let bestDifference = Infinity;

      while (low <= high) {
        const width = Math.floor((low + high) / 2);
        setFontWidth(element, width);

        const bounds = element.getBoundingClientRect();
        const difference = Math.abs(bounds.width - bounds.height);
        if (difference < bestDifference) {
          bestDifference = difference;
          bestWidth = width;
        }

        if (bounds.width > bounds.height) {
          high = width - 1;
        } else {
          low = width + 1;
        }
      }

      setFontWidth(element, bestWidth);
    };

    fitLanguageCode();
    void document.fonts.ready.then(fitLanguageCode);

    return () => {
      cancelled = true;
    };
  }, [hasKnownLanguage, selectedLanguage]);

  if (languages.length === 0) return null;

  const isShowingTranslation =
    selectedLanguageIdx !== HIDDEN_TRANSLATION_LANGUAGE_INDEX;

  return (
    <Button
      size="icon"
      variant={isShowingTranslation && !hasKnownLanguage ? "default" : "outline"}
      onClick={handleNext}
      aria-label={
        isShowingTranslation
          ? `Translation: ${selectedLanguage || "unknown language"}`
          : "Show translation"
      }
    >
      {hasKnownLanguage ? (
        <span
          ref={languageCodeRef}
          className={`${googleSansFlex.className} inline-block leading-none`}
          style={{
            fontStretch: `${DEFAULT_FONT_WIDTH}%`,
            fontFeatureSettings: `"wdth" ${DEFAULT_FONT_WIDTH}`,
            fontVariationSettings: `"wdth" ${DEFAULT_FONT_WIDTH}`,
          }}
        >
          {selectedLanguage?.toLocaleUpperCase()}
        </span>
      ) : (
        <Languages />
      )}
    </Button>
  );
}

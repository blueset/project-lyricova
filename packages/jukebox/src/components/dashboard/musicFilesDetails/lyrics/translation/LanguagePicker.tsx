import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import { PlusIcon, X } from "lucide-react";
import { useCallback } from "react";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

export default function LanguagePicker() {
  const {
    languages,
    selectedLanguage,
    selectedLanguageIndex,
    setSelectedLanguage,
    renameSelectedLanguage,
    removeLanguageByIndex,
  } = useLyricsStore(
    useShallow((state) => ({
      languages: state.translations.languages,
      selectedLanguage: state.translations.selectedLanguage,
      selectedLanguageIndex: state.translations.selectedLanguageIndex,
      setSelectedLanguage: state.translations.setSelectedLanguage,
      renameSelectedLanguage: state.translations.renameSelectedLanguage,
      removeLanguageByIndex: state.translations.removeLanguageByIndex,
    }))
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      renameSelectedLanguage(event.target.value);
    },
    [renameSelectedLanguage]
  );

  const handleLanguageSwitch = useCallback(
    (value: string) => {
      if (value === null) return;
      const languages = useLyricsStore.getState().translations.languages;
      const languageToSelect = languages[parseInt(value)];
      setSelectedLanguage(languageToSelect);
    },
    [setSelectedLanguage]
  );

  const handleDeleteLanguage = useCallback(
    (idx: number) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      removeLanguageByIndex(idx);
    },
    [removeLanguageByIndex]
  );

  const handleAddLanguage = useCallback(() => {
    const languagesCount = languages.length;
    setSelectedLanguage(`lang-${languagesCount}`);
  }, [languages.length, setSelectedLanguage]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Input
        type="text"
        placeholder="Language"
        value={selectedLanguage || ""}
        onChange={handleLanguageChange}
        className="w-24"
      />
      <span>Translations:</span>
      <div className="flex flex-row">
        <ToggleGroup
          type="single"
          variant="outline"
          value={selectedLanguageIndex.toString()}
          onValueChange={handleLanguageSwitch}
        >
          {languages.map((v, idx) => (
            <div key={idx} className="group/toggle-group-item relative">
              <ToggleGroupItem
                value={idx.toString()}
                size="sm"
                className="flex items-center gap-2 pr-8 group-first/toggle-group-item:rounded-r-none group-last/toggle-group-item:rounded-r-md group-not-first/toggle-group-item:first:rounded-l-none"
              >
                #{idx} ({v || "Unknown"})
              </ToggleGroupItem>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteLanguage(idx)}
                className="top-1 right-1 absolute hover:border border-border w-6 h-6"
              >
                <X />
              </Button>
            </div>
          ))}
        </ToggleGroup>
        <Button variant="ghost" size="icon" onClick={handleAddLanguage}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

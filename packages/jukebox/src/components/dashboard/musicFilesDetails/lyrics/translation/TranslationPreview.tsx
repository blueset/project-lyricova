import { cn } from "@lyricova/components/utils";
import { memo } from "react";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";
import { languageToTag } from "../state/translationSlice";

function BaseTranslationPreviewLine({ index }: { index: number }) {
  const { content, translated, selectedLanguage } = useLyricsStore(
    useShallow((state) => ({
      selectedLanguage: state.translations.selectedLanguage,
      content: state.lyrics?.lines[index].content?.trim() ?? "",
      translated:
        state.lyrics?.lines[index].attachments[
          languageToTag(state.translations.selectedLanguage)
        ]?.text ?? "",
    }))
  );
  return (
    <div className="text-sm leading-relaxed">
      <span
        className={cn(
          content && !translated
            ? "text-error-foreground"
            : "text-muted-foreground"
        )}
        lang="ja"
      >
        {content}
      </span>
      <span className="text-muted-foreground/50"> ✲ </span>
      <span
        className={cn(
          translated && !content ? "text-error-foreground" : "text-foreground"
        )}
        lang={selectedLanguage || "zh"}
      >
        {translated}
      </span>
    </div>
  );
}

const TranslationPreviewLine = memo(
  BaseTranslationPreviewLine,
  (prevProps, nextProps) => {
    return prevProps.index === nextProps.index;
  }
);

export default function TranslationPreview() {
  const lyricsLineCount = useLyricsStore(
    (state) => state.lyrics?.lines.length ?? 0
  );

  return (
    <div>
      <div className="mb-2 text-muted-foreground text-xs uppercase">
        Preview
      </div>
      {Array(lyricsLineCount)
        .fill(0)
        .map((_, idx) => (
          <TranslationPreviewLine key={idx} index={idx} />
        ))}
    </div>
  );
}

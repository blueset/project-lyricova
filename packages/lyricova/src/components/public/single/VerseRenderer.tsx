import type { Verse } from "lyricova-common/models/Verse";
import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import { BlockVerseRenderer } from "./BlockVerseRenderer";
import { LineVerseRenderer } from "./LineVerseRenderer";

interface VerseRendererProps {
  verse: Verse;
}

export function VerseRenderer({ verse }: VerseRendererProps) {
  const lines = verse.text.trimEnd().split("\n");
  const stylizedLines = verse.stylizedText?.trimEnd()?.split("\n");
  const htmlLines = verse.html?.trimEnd()?.split("\n");
  const baseTypingSequence = verse.typingSequence;

  let renderMode: "plain" | "stylized" | "html";
  let renderLines: string[];
  if (htmlLines) {
    renderMode = "html";
    renderLines = htmlLines;
  } else if (stylizedLines) {
    renderMode = "stylized";
    renderLines = stylizedLines;
  } else {
    renderMode = "plain";
    renderLines = lines;
  }

  if (renderLines.length !== baseTypingSequence.length) {
    // Render result lines and animation separately
    return (
      <BlockVerseRenderer
        lines={renderLines}
        renderMode={renderMode}
        baseTypingSequence={baseTypingSequence}
        language={verse.language}
        isMain={verse.isMain}
      />
    );
  } else {
    return (
      <LineVerseRenderer
        lines={renderLines}
        renderMode={renderMode}
        baseTypingSequence={baseTypingSequence}
        language={verse.language}
        isMain={verse.isMain}
      />
    );
  }
}

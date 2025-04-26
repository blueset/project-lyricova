import { Button } from "@lyricova/components/components/ui/button";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import type { ChangeEvent } from "react";
import { useCallback } from "react";
import { useNamedState } from "../../../../../hooks/useNamedState";
import VocaDBLyricsDialog from "./VocaDBLyricsDialog";
import HMikuWikiSearchDialog from "./HMikuWikiSearchDialog";
import DiffEditorDialog from "./diffEditor/DiffEditorDialog";
import { useShallow } from "zustand/shallow";
import { useLyricsStore } from "../state/editorState";

function replaceWithPattern(
  lines: [string, string][],
  pattern: RegExp
): string | null {
  const linesMatchPattern = lines
    .map((v) => (v[1].match(pattern) ? 1 : 0))
    .reduce((prev, curr) => prev + curr, 0);
  if (linesMatchPattern / lines.length > 0.25) {
    const result: string[] = [];
    for (const [tag, text] of lines) {
      const match = text.match(pattern);
      if (match) {
        result.push(`${tag || ""}${match[1]}`);
        result.push(`${tag || ""}[tr]${match[2]}`);
      } else {
        result.push(`${tag || ""}${text || ""}`);
      }
    }
    return result.join("\n");
  }
  return null;
}

function smartTranslationSeparation(text: string): string {
  const lines = text.split("\n").map((v): [string, string] => {
    const groups = v.trimEnd().match(/^(\[.+\])?(.*)$/);
    if (groups) return [groups[1], groups[2]];
    return ["", ""];
  });
  // Cases:
  // Most lines has " / ", /, 【】
  let result = replaceWithPattern(lines, /^(.*?) \/ (.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)\/(.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)／(.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)【(.*)】$/);
  if (result !== null) return result;
  return text;
}

interface Props {
  songId?: number;
  title?: string;
}

export default function EditLyrics({ songId, title }: Props) {
  const { lyrics, setLyrics } = useLyricsStore(
    useShallow((s) => ({
      lyrics: s.lrcx,
      setLyrics: s.setLrcx,
    }))
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLyrics(event.target.value);
    },
    [setLyrics]
  );

  const trimSpaces = useCallback(() => {
    setLyrics(
      lyrics.replace(/^(\[.+\])?(?:[ 　\t]*)(.*?)(?:[ 　\t]*)$/gm, "$1$2")
    );
  }, [lyrics, setLyrics]);

  const separateTranslations = useCallback(() => {
    setLyrics(smartTranslationSeparation(lyrics || ""));
  }, [lyrics, setLyrics]);

  const [showVocaDBDialog, toggleVocaDBDialog] = useNamedState(
    false,
    "showVocaDBDialog"
  );
  const [showHMikuWikiDialog, toggleHMikuWikiDialog] = useNamedState(
    false,
    "showHMikuWikiDialog"
  );
  const [showDiffDialog, toggleDiffDialog] = useNamedState(
    false,
    "showDiffDialog"
  );

  return (
    <>
      <div className="flex flex-col gap-2 h-full">
        <div className="flex md:flex-row flex-col gap-4">
          <div>
            <span className="block mb-2 text-muted-foreground text-xs uppercase tracking-wider">
              Load plain text
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                variant="outline"
                disabled={songId == null}
                onClick={() => toggleVocaDBDialog(true)}
                type="button"
              >
                Load lyrics from VocaDB
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleHMikuWikiDialog(true)}
                type="button"
              >
                Search from 初音ミク@wiki
              </Button>
            </div>
          </div>
          <div>
            <span className="block mb-2 text-muted-foreground text-xs uppercase tracking-wider">
              Common operations
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button variant="outline" onClick={trimSpaces} type="button">
                Trim spaces
              </Button>
              <Button
                variant="outline"
                onClick={separateTranslations}
                type="button"
              >
                Smart translation extraction
              </Button>
              <Button
                variant="outline"
                onClick={() => setLyrics("")}
                type="button"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleDiffDialog(true)}
                type="button"
              >
                Diff editor
              </Button>
            </div>
          </div>
        </div>
        <Textarea
          id="lyrics-source"
          className="h-full font-mono resize-none grow"
          placeholder="Lyrics source"
          value={lyrics || ""}
          onChange={handleChange}
          lang="ja"
        />
      </div>
      <VocaDBLyricsDialog
        isOpen={showVocaDBDialog}
        toggleOpen={toggleVocaDBDialog}
        songId={songId}
      />
      <HMikuWikiSearchDialog
        isOpen={showHMikuWikiDialog}
        toggleOpen={toggleHMikuWikiDialog}
        keyword={title}
      />
      <DiffEditorDialog isOpen={showDiffDialog} toggleOpen={toggleDiffDialog} />
    </>
  );
}

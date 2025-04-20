import { useCallback, useEffect, useMemo, useRef } from "react";
import type { LyricsLine } from "lyrics-kit/core";
import { Lyrics, RangeAttribute, FURIGANA } from "lyrics-kit/core";
import { toast } from "sonner";
import { useNamedState } from "../../../../../hooks/useNamedState";
import { gql, useApolloClient } from "@apollo/client";
import EditFuriganaLine from "./EditFuriganaLine";
import { FuriganaLineButton } from "./FuriganaLineButton";
import type { DocumentNode } from "graphql";
import { CheckSquare, Wand2, FileDiff } from "lucide-react";
import { furiganaRomajiMatching } from "./FuriganaRomajiMatching";
import { ApplyAllFurigana } from "./ApplyAllFurigana";
import { Button } from "@lyricova/components/components/ui/button";
import { Toggle } from "@lyricova/components/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { cn } from "@lyricova/components/utils";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
` as DocumentNode;

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
  songId: number;
}

export default function EditFurigana({
  lyrics,
  setLyrics,
  fileId,
  songId,
}: Props) {
  const apolloClient = useApolloClient();

  const [selectedLine, setSelectedLine] = useNamedState(null, "selectedLine");
  const [autoApplyIdentical, setAutoApplyIdentical] = useNamedState(
    true,
    "autoApplyIdentical"
  );

  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      toast.error(`Error occurred while loading lyrics text: ${e}`);
      return null;
    }
  }, [lyrics]);

  // Parse and set `lines`.
  const [lines, setLines] = useNamedState<LyricsLine[]>([], "lines");
  const [linesInitialized, setLinesInitialized] = useNamedState(
    false,
    "linesInitialized"
  );
  const linesInitializedRef = useRef(false);
  const linesRef = useRef<LyricsLine[]>(lines);
  linesRef.current = lines;
  linesInitializedRef.current = linesInitialized;
  useEffect(() => {
    if (parsedLyrics !== null) {
      setLines(parsedLyrics.lines);
      setLinesInitialized(true);

      return () => {
        if (linesInitializedRef.current) {
          parsedLyrics.lines = linesRef.current;
          setLyrics(parsedLyrics.toString());
        }
      };
    }
    // dropping dependency [parsedLyrics] to prevent loop with parsedLyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Romaji matching from VocaDB
  const [romajiMatching, setRomajiMatching] = useNamedState<
    [number, string][][]
  >([], "romajiMatching");

  // Generate furigana
  const overwriteFurigana = useCallback(async () => {
    try {
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: lines.map((v) => v.content).join("\n") },
        fetchPolicy: "network-only",
      });
      if (result.data) {
        // Copy `lines` for React to recognize it as a new state
        const newLines = [...lines];
        result.data.transliterate.karaoke.forEach((v, idx) => {
          const line = newLines[idx];
          if (!line) return;
          if (v.length < 1) {
            delete line.attachments.content[FURIGANA];
          } else {
            const { tags, content } = v.reduce<{
              len: number;
              content: string;
              tags: [string, [number, number]][];
            }>(
              ({ len, tags, content }, [base, furigana]) => {
                if (base === furigana)
                  return {
                    len: len + base.length,
                    tags,
                    content: content + base,
                  };
                else {
                  tags.push([furigana, [len, len + base.length]]);
                  return {
                    len: len + base.length,
                    tags,
                    content: content + base,
                  };
                }
              },
              { len: 0, tags: [], content: "" }
            );

            if (tags.length < 1) delete line.attachments.content[FURIGANA];
            else {
              line.attachments.content[FURIGANA] = new RangeAttribute(tags);
              line.content = content;
            }
          }
        });
        setLines(newLines);
      }
    } catch (e) {
      console.error(`Error occurred while generating furigana: ${e}`, e);
      toast.error(`Error occurred while generating furigana: ${e}`);
    }
  }, [apolloClient, lines, setLines]);

  // Apply furigana to all identical lines
  const applyFuriganaToAll = useCallback(
    (idx: number) => () => {
      const line = lines[idx];
      if (!line?.content) return;
      const furigana = line.attachments.content[FURIGANA];
      setLines((l) => {
        const newLines = [...l];
        newLines.forEach((v, i) => {
          if (i === idx) return;
          if (v.content === line.content) {
            if (furigana) v.attachments.content[FURIGANA] = furigana;
            else delete v.attachments.content[FURIGANA];
          }
        });
        return newLines;
      });
    },
    [lines, setLines]
  );

  // Save current line furigana
  const saveCurrentLine = useCallback(
    (idx: number) => (line: LyricsLine) => {
      // Copy `lines` for React to recognize it as a new state
      setLines((l) => {
        const newLines = [...l];
        newLines[idx] = line;
        return newLines;
      });

      // Auto apply furigana to identical lines if enabled
      if (autoApplyIdentical) {
        setTimeout(() => applyFuriganaToAll(idx)(), 0);
      }
    },
    [setLines, autoApplyIdentical, applyFuriganaToAll]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
      <div className="col-span-full sticky top-0 left-0 z-10">
        <audio className="w-full" src={`/api/files/${fileId}/file`} controls />
      </div>
      <div className="col-span-full sm:col-span-5 sticky top-18 left-0 h-fit z-10 bg-background/50 backdrop-blur-lg">
        <div className="flex items-center flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={overwriteFurigana}>
                  <Wand2 /> <span className="hidden md:inline">Generate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Overwrite with generated furigana</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() =>
                    furiganaRomajiMatching({
                      apolloClient,
                      lines,
                      songId,
                    }).then((result) => setRomajiMatching(result))
                  }
                >
                  <FileDiff /> <span className="hidden md:inline">Diff</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Match with VocaDB Romanization</TooltipContent>
            </Tooltip>

            <ApplyAllFurigana setLines={setLines} />

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Toggle
                    variant="default"
                    pressed={autoApplyIdentical}
                    onPressedChange={setAutoApplyIdentical}
                  >
                    <CheckSquare />{" "}
                    <span className="hidden md:inline">Auto apply</span>
                  </Toggle>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Auto-apply furigana to identical lines
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-4 mb-4">
          {selectedLine != null && selectedLine < lines.length && (
            <EditFuriganaLine
              line={lines[selectedLine]}
              setLine={saveCurrentLine(selectedLine)}
            />
          )}
        </div>
      </div>
      <div className="col-span-full sm:col-span-7">
        <div className="space-y-1">
          {lines.map((line, idx) => (
            <FuriganaLineButton
              key={idx}
              line={line}
              idx={idx}
              selectedLine={selectedLine}
              setSelectedLine={setSelectedLine}
              romajiMatching={romajiMatching}
              applyFuriganaToAll={applyFuriganaToAll}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

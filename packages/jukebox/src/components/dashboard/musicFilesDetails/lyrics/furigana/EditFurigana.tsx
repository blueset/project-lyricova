import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { gql, useApolloClient } from "@apollo/client";
import EditFuriganaLine from "./EditFuriganaLine";
import { FuriganaLineButton } from "./FuriganaLineButton";
import type { DocumentNode } from "graphql";
import { CheckSquare, Wand2 } from "lucide-react";
import { useVocaDBFurigana } from "./FuriganaRomajiMatching";
import { ApplyAllFurigana } from "./ApplyAllFurigana";
import { Button } from "@lyricova/components/components/ui/button";
import { Toggle } from "@lyricova/components/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
` as DocumentNode;

interface Props {
  fileId: number;
  songId: number;
}

export default function EditFurigana({ fileId, songId }: Props) {
  const {
    lyricsLineCount,
    setFurigana,
    selectedLine,
    autoApplyIdentical,
    setAutoApplyIdentical,
    setVocaDbFuriganaLines,
  } = useLyricsStore(
    useShallow((state) => ({
      lyricsLineCount: state.lyrics?.lines.length || 0,
      setFurigana: state.furigana.setFurigana,
      selectedLine: state.furigana.selectedLine,
      autoApplyIdentical: state.furigana.autoApplyIdentical,
      setAutoApplyIdentical: state.furigana.setAutoApplyIdentical,
      setVocaDbFuriganaLines: state.furigana.setVocaDbFuriganaLines,
    }))
  );
  const apolloClient = useApolloClient();
  const vocaDBFuriganaLines = useVocaDBFurigana(songId);
  useEffect(() => {
    setVocaDbFuriganaLines(vocaDBFuriganaLines);
  }, [vocaDBFuriganaLines, setVocaDbFuriganaLines]);

  // Generate furigana
  const overwriteFurigana = useCallback(async () => {
    try {
      const lines = useLyricsStore.getState().lyrics?.lines ?? [];
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: lines.map((v) => v.content).join("\n") },
        fetchPolicy: "network-only",
      });
      if (result.data) {
        setFurigana(result.data.transliterate.karaoke);
      }
    } catch (e) {
      console.error(`Error occurred while generating furigana: ${e}`, e);
      toast.error(`Error occurred while generating furigana: ${e}`);
    }
  }, [apolloClient, setFurigana]);

  return (
    <div className="gap-4 grid grid-cols-1 sm:grid-cols-12">
      <div className="top-0 left-0 z-10 sticky col-span-full">
        <audio className="w-full" src={`/api/files/${fileId}/file`} controls />
      </div>
      <div className="top-18 left-0 z-10 sticky col-span-full sm:col-span-5 bg-background/50 backdrop-blur-lg h-fit">
        <div className="flex flex-wrap items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={overwriteFurigana}>
                  <Wand2 /> <span className="hidden md:inline">Generate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Overwrite with generated furigana</TooltipContent>
            </Tooltip>

            <ApplyAllFurigana />

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
          {selectedLine != null && selectedLine < lyricsLineCount && (
            <EditFuriganaLine />
          )}
        </div>
      </div>
      <div className="col-span-full sm:col-span-7">
        <div className="space-y-1">
          {Array(lyricsLineCount)
            .fill(null)
            .map((_, idx) => (
              <FuriganaLineButton key={idx} idx={idx} />
            ))}
        </div>
      </div>
    </div>
  );
}

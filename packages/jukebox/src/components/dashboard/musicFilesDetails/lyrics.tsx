import { useCallback, useMemo } from "react";
import LyricsPreview from "./LyricsPreview";
import { lyricsAnalysis } from "@/frontendUtils/lyricsCheck";
import { format } from "date-fns";
import { Lyrics } from "lyrics-kit/core";
import { useNamedState } from "../../../hooks/useNamedState";
import LyricsEditDialog from "./LyricsEditDialog";
import { gql, useApolloClient } from "@apollo/client";
import type { DocumentNode } from "graphql";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@lyricova/components/components/ui/button";
import { Badge } from "@lyricova/components/components/ui/badge";
import { cn } from "@lyricova/components/utils";

const REMOVE_LYRICS_MUTATION = gql`
  mutation ($fileId: Int!) {
    removeLyrics(fileId: $fileId)
  }
` as DocumentNode;

interface Props {
  fileId: number;
  lrcLyrics?: string;
  lrcxLyrics?: string;
  title: string;
  artists: string;
  duration: number;
  songId?: number;
  refresh: () => unknown | Promise<unknown>;
}

export default function LyricsPanel({
  fileId,
  lrcLyrics,
  lrcxLyrics,
  refresh,
  title,
  artists,
  duration,
  songId,
}: Props) {
  const apolloClient = useApolloClient();

  const [isLyricsEditDialogOpen, toggleLyricsEditDialogOpen] = useNamedState(
    false,
    "isLyricsEditDialogOpen"
  );

  const handleOpenLyricsEditDialog = useCallback(() => {
    toggleLyricsEditDialogOpen(true);
  }, [toggleLyricsEditDialogOpen]);

  const [warnRemove, setWarnRemove] = useNamedState(false, "warnRemove");

  const handleRemoveLyrics = useCallback(async () => {
    try {
      const result = await apolloClient.mutate<{ removeLyrics: boolean }>({
        mutation: REMOVE_LYRICS_MUTATION,
        variables: { fileId },
      });
      if (result) {
        toast.success(`Lyrics removed for ${title}.`);
        await refresh();
      } else {
        toast.error(`Lyrics not removed for ${title}.`);
      }
    } catch (e) {
      console.error("Lyrics removal failed", e);
      toast.error(`Lyrics not removed for ${title}: ${e}`);
    }
  }, [apolloClient, fileId, refresh, title]);

  const effectiveLyricsText = lrcxLyrics || lrcLyrics || null;

  const lyrics = useMemo(() => {
    if (!effectiveLyricsText) return null;
    try {
      return new Lyrics(effectiveLyricsText);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      toast.error(`Error while parsing lyrics: ${e}`);
      return null;
    }
  }, [effectiveLyricsText]);

  let lyricsNode = <h2 className="text-xl font-semibold">No lyrics</h2>;
  if (lyrics) {
    lyricsNode = <LyricsPreview lyrics={lyrics} fileId={fileId} />;
  }

  const analysisResult = useMemo(() => lyricsAnalysis(lyrics), [lyrics]);

  return (
    <>
      <div className="grid gap-4 @2xl/dashboard:grid-cols-12">
        <div className="@2xl/dashboard:col-span-9">{lyricsNode}</div>
        <div className="@2xl/dashboard:col-span-3">
          <h3 className="text-xl font-semibold mb-2">Lyric state</h3>
          <section className="mb-4">
            <p>
              Lyrics type:{" "}
              {lrcxLyrics ? (
                <Badge variant="successOutline">LRCX</Badge>
              ) : lrcLyrics ? (
                "LRC"
              ) : (
                <Badge variant="outline">No lyrics</Badge>
              )}
            </p>
            {effectiveLyricsText !== null && (
              <>
                {lrcxLyrics !== null && (
                  <>
                    <p>
                      Translation:{" "}
                      {analysisResult.hasTranslation ? (
                        <Badge variant="successOutline">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </p>
                    <p>
                      Inline time tags:{" "}
                      {analysisResult.hasInlineTimeTags ? (
                        <Badge variant="successOutline">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </p>
                    <p>
                      Furigana:{" "}
                      {analysisResult.hasFurigana ? (
                        <Badge variant="successOutline">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </p>
                  </>
                )}
                <p>
                  “Simplified Japanese”:{" "}
                  {analysisResult.hasSimplifiedJapanese ? (
                    <Badge variant="destructive">Yes</Badge>
                  ) : (
                    <Badge variant="successOutline">No</Badge>
                  )}
                </p>
                <p>
                  Last timestamp:{" "}
                  {analysisResult.lastTimestamp &&
                  !Number.isNaN(analysisResult.lastTimestamp)
                    ? format(analysisResult.lastTimestamp * 1000, "HH:mm:ss")
                    : "N/A"}
                </p>
              </>
            )}
          </section>
          <section className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleOpenLyricsEditDialog}>
              Edit
            </Button>
            {!warnRemove ? (
              <Button variant="destructive" onClick={() => setWarnRemove(true)}>
                Remove
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setWarnRemove(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRemoveLyrics}>
                  <Trash2 />
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
      <LyricsEditDialog
        refresh={refresh}
        fileId={fileId}
        isOpen={isLyricsEditDialogOpen}
        toggleOpen={toggleLyricsEditDialogOpen}
        initialLrc={lrcLyrics}
        initialLrcx={lrcxLyrics}
        title={title}
        artists={artists}
        duration={duration}
        songId={songId}
      />
    </>
  );
}

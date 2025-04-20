import { useCallback, useEffect, useMemo } from "react";
import { useNamedState } from "../../../hooks/useNamedState";
import LyricsPreview from "./LyricsPreview";
import { Lyrics } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import EditLyrics from "./lyrics/edit/EditLyrics";
import SearchLyrics from "./lyrics/SearchLyrics";
import TaggingLyrics from "./lyrics/TaggingLyrics";
import EditPlainLyrics from "./lyrics/EditPlainLyrics";
import EditTranslations from "./lyrics/EditTranslations";
import EditFurigana from "./lyrics/furigana/EditFurigana";
import { gql, useApolloClient } from "@apollo/client";
import type { DocumentNode } from "graphql";
import LyricsPreviewPanel from "./lyrics/WebVTTPreview";
import WebAudioTaggingLyrics from "./lyrics/WebAudioTaggingLyrics";
import InlineTagging from "./lyrics/inlineTagging/InlineTagging";
import Roles from "./lyrics/Roles";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@lyricova/components/components/ui/tabs";
import { Button } from "@lyricova/components/components/ui/button";

const WRITE_LYRICS_MUTATION = gql`
  mutation ($fileId: Int!, $lyrics: String!, $ext: String!) {
    writeLyrics(fileId: $fileId, lyrics: $lyrics, ext: $ext)
  }
` as DocumentNode;

function PreviewPanel({
  lyricsString,
  fileId,
}: {
  lyricsString: string;
  fileId: number;
}) {
  const snackbar = useSnackbar();
  const lyricsObj = useMemo(() => {
    if (!lyricsString) return null;
    try {
      return new Lyrics(lyricsString);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      snackbar.enqueueSnackbar(`Error while parsing lyrics: ${e}`, {
        variant: "error",
      });
      return null;
    }
  }, [lyricsString, snackbar]);
  return (
    <LyricsPreview lyrics={lyricsObj} fileId={fileId} className="h-full" />
  );
}

interface Props {
  initialLrc?: string;
  initialLrcx?: string;
  refresh: () => unknown | Promise<unknown>;
  fileId: number;
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;

  title?: string;
  artists?: string;
  duration: number;
  songId?: number;
}

export default function LyricsEditDialog({
  initialLrc,
  initialLrcx,
  refresh,
  fileId,
  isOpen,
  toggleOpen,
  title,
  artists,
  duration,
  songId,
}: Props) {
  const [lrc, setLrc] = useNamedState(initialLrc || "", "lrc");
  const [lrcx, setLrcx] = useNamedState(initialLrcx || "", "lrcx");
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const effectiveLyrics = lrcx || lrc;

  const [submitting, toggleSubmitting] = useNamedState(false, "submitting");
  useEffect(() => {
    setLrc(initialLrc);
    setLrcx(initialLrcx || initialLrc);
  }, [isOpen, initialLrc, initialLrcx, setLrc, setLrcx]);

  // Tab status
  const [tabIndex, setTabIndex] = useNamedState("webvttPreview", "tabIndex");

  const needsCommit =
    tabIndex === "webAudioTagging" ||
    tabIndex === "tagging" ||
    tabIndex === "translation" ||
    tabIndex === "furigana" ||
    tabIndex === "inline" ||
    tabIndex === "roles";

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setLrc("");
    setLrcx("");
  }, [toggleOpen, setLrc, setLrcx]);

  const handleSubmit = useCallback(async () => {
    toggleSubmitting(true);
    const promises: Promise<unknown>[] = [];
    if (lrc) {
      promises.push(
        apolloClient.mutate<{ writeLyrics: boolean }>({
          mutation: WRITE_LYRICS_MUTATION,
          variables: { fileId, lyrics: lrc, ext: "lrc" },
        })
      );
    }
    if (lrcx && lrcx !== lrc) {
      promises.push(
        apolloClient.mutate<{ writeLyrics: boolean }>({
          mutation: WRITE_LYRICS_MUTATION,
          variables: { fileId, lyrics: lrcx, ext: "lrcx" },
        })
      );
    }
    try {
      await Promise.all(promises);
      snackbar.enqueueSnackbar("Lyrics saved.", { variant: "success" });
      handleClose();
      await refresh();
    } catch (e) {
      console.error(`Error occurred while saving: ${e}`, e);
      snackbar.enqueueSnackbar(`Error occurred while saving: ${e}`, {
        variant: "error",
      });
    }
    toggleSubmitting(false);
  }, [
    apolloClient,
    fileId,
    handleClose,
    lrc,
    lrcx,
    refresh,
    snackbar,
    toggleSubmitting,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-full h-full max-w-dvw sm:max-w-dvw rounded-none p-0 flex flex-col gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Edit lyrics</DialogTitle>
        <Tabs
          value={tabIndex}
          onValueChange={setTabIndex}
          className="m-4 mb-0 xl:flex-row grow h-0 gap-2 xl:gap-4"
        >
          <TabsList
            aria-label="Lyrics edit dialog tabs"
            className="xl:flex-col xl:h-auto xl:self-start xl:items-stretch max-w-full overflow-auto justify-center-safe no-scrollbar shrink-0"
          >
            <TabsTrigger className="xl:justify-start" value="webvttPreview">
              WebVTT Preview
            </TabsTrigger>
            <TabsTrigger className="xl:justify-start" value="preview">
              Preview
            </TabsTrigger>
            <TabsTrigger className="xl:justify-start" value="download">
              Download
            </TabsTrigger>
            <TabsTrigger className="xl:justify-start" value="edit">
              Edit
            </TabsTrigger>
            <TabsTrigger className="xl:justify-start" value="editLrc">
              Edit Plain
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="webAudioTagging"
            >
              WebAudioAPI Tagging
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="translation"
            >
              Translation
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="furigana"
            >
              Furigana
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="inline"
            >
              Inline Tagging
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="roles"
            >
              Roles
            </TabsTrigger>
            <TabsTrigger
              className="xl:justify-start"
              disabled={needsCommit}
              value="tagging"
            >
              * Tagging
            </TabsTrigger>
          </TabsList>
          <div className="p-0 grow flex overflow-auto pr-4 -mr-4">
            <TabsContent value="preview">
              <PreviewPanel lyricsString={effectiveLyrics} fileId={fileId} />
            </TabsContent>
            <TabsContent value="webvttPreview">
              <LyricsPreviewPanel
                lyricsString={effectiveLyrics}
                fileId={fileId}
              />
            </TabsContent>
            <TabsContent value="download">
              <SearchLyrics
                title={title}
                artists={artists}
                duration={duration}
              />
            </TabsContent>
            <TabsContent value="edit">
              <EditLyrics
                lyrics={lrcx}
                setLyrics={setLrcx}
                songId={songId}
                title={title}
              />
            </TabsContent>
            <TabsContent value="editLrc">
              <EditPlainLyrics lyrics={lrc} lrcx={lrcx} setLyrics={setLrc} />
            </TabsContent>
            <TabsContent value="webAudioTagging">
              <WebAudioTaggingLyrics
                lyrics={lrcx}
                setLyrics={setLrcx}
                fileId={fileId}
              />
            </TabsContent>
            <TabsContent value="tagging">
              <TaggingLyrics
                lyrics={lrcx}
                setLyrics={setLrcx}
                fileId={fileId}
              />
            </TabsContent>
            <TabsContent value="translation">
              <EditTranslations
                lyrics={lrcx}
                setLyrics={setLrcx}
                songId={songId}
              />
            </TabsContent>
            <TabsContent value="furigana">
              <EditFurigana
                lyrics={lrcx}
                setLyrics={setLrcx}
                fileId={fileId}
                songId={songId}
              />
            </TabsContent>
            <TabsContent value="inline">
              <InlineTagging
                lyrics={lrcx}
                setLyrics={setLrcx}
                fileId={fileId}
              />
            </TabsContent>
            <TabsContent value="roles">
              <Roles lyrics={lrcx} setLyrics={setLrcx} fileId={fileId} />
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter className="m-4 flex-row justify-end">
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={submitting || !lrcx || !lrc || needsCommit}
            onClick={handleSubmit}
            variant="default"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

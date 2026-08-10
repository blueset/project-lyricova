import { useCallback, useEffect, useMemo } from "react";
import { useNamedState } from "../../../hooks/useNamedState";
import LyricsPreview from "./LyricsPreview";
import { Lyrics } from "lyrics-kit/core";
import EditLyrics from "./lyrics/edit/EditLyrics";
import SearchLyrics from "./lyrics/SearchLyrics";
import TaggingLyrics from "./lyrics/TaggingLyrics";
import EditPlainLyrics from "./lyrics/EditPlainLyrics";
import EditTranslations from "./lyrics/translation/EditTranslations";
import EditFurigana from "./lyrics/furigana/EditFurigana";
import { useApolloClient } from "@apollo/client/react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lyricova/components/components/ui/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@lyricova/components/components/ui/tabs";
import {
  Button,
  buttonVariants,
} from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { useLyricsStore } from "./lyrics/state/editorState";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { graphql } from "@lyricova/components/gql";
import { useLyricsDraft } from "./lyrics/state/useLyricsDraft";
import RecoveryDraftDiff from "./lyrics/RecoveryDraftDiff";

const WRITE_LYRICS_MUTATION = graphql(`
  mutation WriteLyrics($fileId: Int!, $lyrics: String!, $ext: String!) {
    writeLyrics(fileId: $fileId, lyrics: $lyrics, ext: $ext)
  }
`);

const draftTimestampFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  hourCycle: "h23",
});

function PreviewPanel({ fileId }: { fileId: number }) {
  const { lrcx, lrc } = useLyricsStore(
    useShallow((s) => ({
      lrcx: s.lrcx,
      lrc: s.lrc,
    })),
  );
  const lyricsString = lrcx || lrc;
  const lyricsObj = useMemo(() => {
    if (!lyricsString) return null;
    try {
      return new Lyrics(lyricsString);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      toast.error(`Error while parsing lyrics: ${e}`);
      return null;
    }
  }, [lyricsString]);
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
  const { hasLrc, hasLrcx } = useLyricsStore(
    useShallow((s) => ({
      hasLrc: !!s.lrc,
      hasLrcx: !!s.lrcx,
    })),
  );

  const apolloClient = useApolloClient();

  const [submitting, toggleSubmitting] = useNamedState(false, "submitting");
  const [confirmDiscard, setConfirmDiscard] = useNamedState(
    false,
    "confirmDiscard",
  );
  const {
    recoveryDraft,
    isRecoveryDraftStale,
    isDirty,
    isReady,
    recoverDraft,
    discardRecoveryDraft,
    flushDraft,
    stopAndClearDraft,
  } = useLyricsDraft({ fileId, initialLrc, initialLrcx, isOpen });

  // Tab status
  const [tabIndex, setTabIndex] = useNamedState("webvttPreview", "tabIndex");
  const savedLrc = initialLrc ?? "";
  const savedLrcx = initialLrcx || initialLrc || "";

  useEffect(() => {
    if (!isOpen) setConfirmDiscard(false);
  }, [isOpen, setConfirmDiscard]);

  const closeAndDiscard = useCallback(() => {
    stopAndClearDraft();
    toggleOpen(false);
    setConfirmDiscard(false);
  }, [setConfirmDiscard, stopAndClearDraft, toggleOpen]);

  const handleCloseRequest = useCallback(() => {
    if (!isReady) return;
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      closeAndDiscard();
    }
  }, [closeAndDiscard, isDirty, isReady, setConfirmDiscard]);

  const handleSubmit = useCallback(async () => {
    toggleSubmitting(true);
    const { lrc, generate } = useLyricsStore.getState();
    const lrcx = generate();
    const promises: Promise<unknown>[] = [];
    if (lrc) {
      promises.push(
        apolloClient.mutate({
          mutation: WRITE_LYRICS_MUTATION,
          variables: { fileId, lyrics: lrc, ext: "lrc" },
        }),
      );
    }
    if (lrcx && lrcx !== lrc) {
      promises.push(
        apolloClient.mutate({
          mutation: WRITE_LYRICS_MUTATION,
          variables: { fileId, lyrics: lrcx, ext: "lrcx" },
        }),
      );
    }
    try {
      const results = await Promise.all(promises);
      if (
        results.some(
          (result) =>
            !(
              typeof result === "object" &&
              result !== null &&
              "data" in result &&
              result.data &&
              typeof result.data === "object" &&
              "writeLyrics" in result.data &&
              result.data.writeLyrics === true
            ),
        )
      ) {
        throw new Error("The server did not confirm that lyrics were written.");
      }
      stopAndClearDraft();
      toast.success("Lyrics saved.");
      toggleOpen(false);
    } catch (e) {
      flushDraft();
      console.error(`Error occurred while saving: ${e}`, e);
      toast.error(`Error occurred while saving: ${e}`);
      toggleSubmitting(false);
      return;
    }
    try {
      await refresh();
    } catch (e) {
      console.error("Lyrics were saved, but refreshing failed.", e);
      toast.error(`Lyrics were saved, but refreshing failed: ${e}`);
    }
    toggleSubmitting(false);
  }, [
    apolloClient,
    fileId,
    flushDraft,
    refresh,
    stopAndClearDraft,
    toggleOpen,
    toggleSubmitting,
  ]);

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseRequest();
        }}
      >
        <DialogContent
          className="flex flex-col gap-0 p-0 rounded-none w-full max-w-dvw sm:max-w-dvw h-full"
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Edit lyrics</DialogTitle>
          <Tabs
            value={tabIndex}
            onValueChange={setTabIndex}
            className="xl:flex-row gap-2 xl:gap-4 m-4 mb-0 h-0 grow"
          >
            <TabsList
              aria-label="Lyrics edit dialog tabs"
              className="xl:flex-col justify-center-safe xl:items-stretch xl:self-start max-w-full xl:h-auto overflow-auto no-scrollbar shrink-0"
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
              <TabsTrigger className="xl:justify-start" value="webAudioTagging">
                WebAudioAPI Tagging
              </TabsTrigger>
              <TabsTrigger className="xl:justify-start" value="translation">
                Translation
              </TabsTrigger>
              <TabsTrigger className="xl:justify-start" value="furigana">
                Furigana
              </TabsTrigger>
              <TabsTrigger className="xl:justify-start" value="inline">
                Inline Tagging
              </TabsTrigger>
              <TabsTrigger className="xl:justify-start" value="roles">
                Roles
              </TabsTrigger>
              <TabsTrigger className="xl:justify-start" value="tagging">
                * Tagging
              </TabsTrigger>
            </TabsList>
            <div className="flex -mr-4 p-0 pr-4 overflow-auto grow">
              <TabsContent value="preview">
                <PreviewPanel fileId={fileId} />
              </TabsContent>
              <TabsContent value="webvttPreview">
                <LyricsPreviewPanel fileId={fileId} />
              </TabsContent>
              <TabsContent value="download">
                <SearchLyrics
                  title={title}
                  artists={artists}
                  duration={duration}
                />
              </TabsContent>
              <TabsContent value="edit">
                <EditLyrics songId={songId} title={title} />
              </TabsContent>
              <TabsContent value="editLrc">
                <EditPlainLyrics />
              </TabsContent>
              <TabsContent value="webAudioTagging">
                <WebAudioTaggingLyrics fileId={fileId} />
              </TabsContent>
              <TabsContent value="tagging">
                <TaggingLyrics fileId={fileId} />
              </TabsContent>
              <TabsContent value="translation">
                <EditTranslations songId={songId} />
              </TabsContent>
              <TabsContent value="furigana">
                <EditFurigana fileId={fileId} songId={songId} />
              </TabsContent>
              <TabsContent value="inline">
                <InlineTagging fileId={fileId} />
              </TabsContent>
              <TabsContent value="roles">
                <Roles fileId={fileId} />
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="flex-row justify-end m-4">
            <Button
              disabled={!isReady}
              onClick={handleCloseRequest}
              variant="secondary"
            >
              Cancel
            </Button>
            <ProgressButton
              disabled={!isReady || !hasLrc || !hasLrcx}
              progress={submitting}
              onClick={handleSubmit}
              variant="default"
            >
              Save
            </ProgressButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={recoveryDraft !== null}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-auto sm:max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Recover unsaved lyrics?</AlertDialogTitle>
            <AlertDialogDescription>
              A draft for this music file was last updated{" "}
              {recoveryDraft
                ? draftTimestampFormatter.format(
                    new Date(recoveryDraft.updatedAt),
                  )
                : ""}
              .{" "}
              {isRecoveryDraftStale
                ? "The saved lyrics changed after this draft was created. Recovering it may replace newer work when you save."
                : "Choose whether to continue from the draft or discard it and use the saved lyrics."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {recoveryDraft && (
            <div className="grid gap-2">
              <RecoveryDraftDiff
                title="LRCX"
                savedValue={savedLrcx}
                draftValue={recoveryDraft.lrcx}
              />
              <RecoveryDraftDiff
                title="LRC"
                savedValue={savedLrc}
                draftValue={recoveryDraft.lrc}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardRecoveryDraft}>
              Discard draft
            </AlertDialogCancel>
            <AlertDialogAction onClick={recoverDraft}>
              Recover draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the autosaved draft for this music file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={closeAndDiscard}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

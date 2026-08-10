import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLyricsStore } from "./editorState";
import {
  isLyricsContentEqual,
  isLyricsDraftStale,
  loadLyricsDraft,
  LYRICS_DRAFT_AUTOSAVE_DELAY,
  type LyricsDraftContent,
  type LyricsDraftRecord,
  persistLyricsDraft,
  removeLyricsDraft,
} from "./lyricsDraft";

interface UseLyricsDraftOptions {
  fileId: number;
  initialLrc?: string;
  initialLrcx?: string;
  isOpen: boolean;
}

function replaceEditorContent(content: LyricsDraftContent): void {
  const { setLrc, setLrcx, parse } = useLyricsStore.getState();
  setLrc(content.lrc);
  setLrcx(content.lrcx);
  parse();
}

export function useLyricsDraft({
  fileId,
  initialLrc,
  initialLrcx,
  isOpen,
}: UseLyricsDraftOptions) {
  const base = useMemo<LyricsDraftContent>(
    () => ({
      lrc: initialLrc ?? "",
      lrcx: initialLrcx || initialLrc || "",
    }),
    [initialLrc, initialLrcx],
  );
  const baseRef = useRef(base);
  baseRef.current = base;

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(false);
  const persistingRef = useRef(false);
  const storageErrorReportedRef = useRef(false);
  const [recoveryDraft, setRecoveryDraft] = useState<LyricsDraftRecord | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const reportStorageError = useCallback((action: string, error: unknown) => {
    console.error(`Unable to ${action} lyrics draft.`, error);
    if (!storageErrorReportedRef.current) {
      storageErrorReportedRef.current = true;
      toast.error(
        "Lyrics draft autosave is unavailable. Keep this page open until you save.",
      );
    }
  }, []);

  const persistCurrentContent = useCallback(() => {
    if (!activeRef.current) return;
    const { lrc, generate } = useLyricsStore.getState();
    persistingRef.current = true;
    try {
      const lrcx = generate();
      persistLyricsDraft(
        window.localStorage,
        fileId,
        { lrc, lrcx },
        baseRef.current,
      );
    } catch (error) {
      reportStorageError("save", error);
    } finally {
      persistingRef.current = false;
    }
  }, [fileId, reportStorageError]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const stopAndClearDraft = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    try {
      removeLyricsDraft(window.localStorage, fileId);
    } catch (error) {
      reportStorageError("remove", error);
    }
    setIsDirty(false);
  }, [clearTimer, fileId, reportStorageError]);

  useEffect(() => {
    activeRef.current = false;
    clearTimer();
    setRecoveryDraft(null);
    setIsDirty(false);
    setIsReady(false);

    if (!isOpen) {
      replaceEditorContent({ lrc: "", lrcx: "" });
      return;
    }

    replaceEditorContent(base);

    try {
      const draft = loadLyricsDraft(window.localStorage, fileId);
      if (draft && !isLyricsContentEqual(draft, base)) {
        setRecoveryDraft(draft);
        return;
      }
    } catch (error) {
      reportStorageError("load", error);
    }

    activeRef.current = true;
    setIsReady(true);
  }, [base, clearTimer, fileId, isOpen, reportStorageError]);

  useEffect(() => {
    if (!isOpen || !isReady) return;

    const unsubscribe = useLyricsStore.subscribe(
      (state) => ({ lrc: state.lrc, lrcx: state.lrcx }),
      (content) => {
        if (!activeRef.current || persistingRef.current) return;
        setIsDirty(!isLyricsContentEqual(content, baseRef.current));
        clearTimer();
        timerRef.current = setTimeout(() => {
          timerRef.current = undefined;
          persistCurrentContent();
        }, LYRICS_DRAFT_AUTOSAVE_DELAY);
      },
      {
        equalityFn: (left, right) =>
          left.lrc === right.lrc && left.lrcx === right.lrcx,
      },
    );

    const flush = () => {
      clearTimer();
      persistCurrentContent();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      clearTimer();
      persistCurrentContent();
      activeRef.current = false;
    };
  }, [clearTimer, isOpen, isReady, persistCurrentContent]);

  const recoverDraft = useCallback(() => {
    if (!recoveryDraft) return;
    replaceEditorContent(recoveryDraft);
    setIsDirty(!isLyricsContentEqual(recoveryDraft, baseRef.current));
    setRecoveryDraft(null);
    activeRef.current = true;
    setIsReady(true);
  }, [recoveryDraft]);

  const discardRecoveryDraft = useCallback(() => {
    try {
      removeLyricsDraft(window.localStorage, fileId);
    } catch (error) {
      reportStorageError("remove", error);
    }
    replaceEditorContent(baseRef.current);
    setRecoveryDraft(null);
    setIsDirty(false);
    activeRef.current = true;
    setIsReady(true);
  }, [fileId, reportStorageError]);

  const flushDraft = useCallback(() => {
    clearTimer();
    persistCurrentContent();
  }, [clearTimer, persistCurrentContent]);

  return {
    recoveryDraft,
    isRecoveryDraftStale: recoveryDraft
      ? isLyricsDraftStale(recoveryDraft, base)
      : false,
    isDirty,
    isReady,
    recoverDraft,
    discardRecoveryDraft,
    flushDraft,
    stopAndClearDraft,
  };
}

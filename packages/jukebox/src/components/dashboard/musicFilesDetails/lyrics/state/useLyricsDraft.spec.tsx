import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLyricsStore } from "./editorState";
import {
  loadLyricsDraft,
  LYRICS_DRAFT_AUTOSAVE_DELAY,
  persistLyricsDraft,
} from "./lyricsDraft";
import { useLyricsDraft } from "./useLyricsDraft";

const SAVED_LRC = "[00:01.00]Saved";
const SAVED_LRCX = "[00:01.00]Saved";
const DRAFT_LRC = "[00:01.00]Draft";
const DRAFT_LRCX = "[00:01.00]Draft";

describe("useLyricsDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    localStorage.clear();
  });

  it("autosaves after the configured debounce", () => {
    renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    act(() => {
      useLyricsStore.getState().setLrc(DRAFT_LRC);
      vi.advanceTimersByTime(LYRICS_DRAFT_AUTOSAVE_DELAY - 1);
    });
    expect(loadLyricsDraft(localStorage, 12)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(loadLyricsDraft(localStorage, 12)).toMatchObject({
      lrc: DRAFT_LRC,
      baseLrc: SAVED_LRC,
    });
  });

  it("flushes a pending edit when the page is hidden", () => {
    renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    act(() => {
      useLyricsStore.getState().setLrc(DRAFT_LRC);
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(loadLyricsDraft(localStorage, 12)).toMatchObject({
      lrc: DRAFT_LRC,
    });
  });

  it("flushes a pending edit when the editor unmounts", () => {
    const { unmount } = renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    act(() => {
      useLyricsStore.getState().setLrc(DRAFT_LRC);
      unmount();
    });

    expect(loadLyricsDraft(localStorage, 12)).toMatchObject({
      lrc: DRAFT_LRC,
    });
  });

  it("waits for the user before recovering a stored draft", () => {
    persistLyricsDraft(
      localStorage,
      12,
      { lrc: DRAFT_LRC, lrcx: DRAFT_LRCX },
      { lrc: SAVED_LRC, lrcx: SAVED_LRCX },
    );

    const { result } = renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    expect(result.current.isReady).toBe(false);
    expect(result.current.recoveryDraft).not.toBeNull();
    expect(useLyricsStore.getState().lrc).toBe(SAVED_LRC);

    act(() => {
      result.current.recoverDraft();
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(useLyricsStore.getState().lrc).toBe(DRAFT_LRC);
  });

  it("warns for a stale draft and can discard it", () => {
    persistLyricsDraft(
      localStorage,
      12,
      { lrc: DRAFT_LRC, lrcx: DRAFT_LRCX },
      { lrc: "[00:01.00]Older", lrcx: "[00:01.00]Older" },
    );

    const { result } = renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    expect(result.current.isRecoveryDraftStale).toBe(true);

    act(() => {
      result.current.discardRecoveryDraft();
    });

    expect(result.current.isReady).toBe(true);
    expect(loadLyricsDraft(localStorage, 12)).toBeNull();
    expect(useLyricsStore.getState().lrc).toBe(SAVED_LRC);
  });

  it("stops autosave and clears the current file draft", () => {
    const { result } = renderHook(() =>
      useLyricsDraft({
        fileId: 12,
        initialLrc: SAVED_LRC,
        initialLrcx: SAVED_LRCX,
        isOpen: true,
      }),
    );

    act(() => {
      useLyricsStore.getState().setLrc(DRAFT_LRC);
      result.current.stopAndClearDraft();
      vi.advanceTimersByTime(LYRICS_DRAFT_AUTOSAVE_DELAY);
    });

    expect(loadLyricsDraft(localStorage, 12)).toBeNull();
  });
});

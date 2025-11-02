import { useEffect, useRef, useCallback } from "react";
import { ApolloClient } from "@apollo/client";
import { gql, DocumentNode } from "@apollo/client";

const BUMP_PLAY_COUNT_MUTATION = gql`
  mutation bumpPlayCount($id: Int!) {
    bumpPlayCount(fileId: $id)
  }
` as DocumentNode;

interface Track {
  id: number;
  duration?: number;
}

interface TimeSegment {
  start: number;
  end: number;
}

interface PlaySession {
  trackId: number;
  playedSegments: TimeSegment[];
  totalHeardTime: number;
  sessionStart: number;
  playCounted: boolean;
  lastSeenTime: number;
}

/**
 * Merges overlapping time segments and returns the total unique time covered
 */
function mergeSegmentsAndCalculateTotal(segments: TimeSegment[]): number {
  if (segments.length === 0) return 0;

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: TimeSegment[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const segment = sorted[i];
    if (segment.start <= current.end) {
      // Overlapping or adjacent, merge
      current = {
        start: current.start,
        end: Math.max(current.end, segment.end),
      };
    } else {
      // No overlap, push current and start new
      merged.push(current);
      current = segment;
    }
  }
  merged.push(current);

  // Calculate total time
  return merged.reduce((total, seg) => total + (seg.end - seg.start), 0);
}

/**
 * Determines if a play should be counted based on the threshold model
 */
function shouldCountPlay(
  heardTime: number,
  duration: number,
  minHeard: number = 30
): boolean {
  // Minimum heard time requirement
  if (heardTime < minHeard) {
    return false;
  }

  // Short tracks (< 60s): require ≥ 80% heard
  if (duration < 60) {
    return heardTime >= duration * 0.8;
  }

  // Long-form (≥ 30 min): require ≥ 5 min or ≥ 20%, whichever comes first
  if (duration >= 1800) {
    return heardTime >= 300 || heardTime >= duration * 0.2;
  }

  // Standard tracks: ≥ 50% duration or ≥ 240s, whichever comes first
  return heardTime >= duration * 0.5 || heardTime >= 240;
}

interface UsePlaybackTrackingOptions {
  playerRef: React.RefObject<HTMLAudioElement>;
  currentTrack: Track | null;
  apolloClient: ApolloClient<unknown>;
  cooldownPeriod?: number; // in milliseconds, default 30 min
}

/**
 * Hook to track playback and count plays based on sophisticated threshold models.
 *
 * Implements:
 * - Threshold model: ≥50% duration or ≥240s (whichever first), with ≥30s minimum
 * - Short tracks (<60s): require ≥80% heard
 * - Long-form (≥30min): require ≥5-10min or ≥20-30%
 * - Unique segment coverage (no double-counting on seeks)
 * - Repeat guard with cooldown period
 * - Muted playback exclusion
 * - Buffer/stall handling
 */
export function usePlaybackTracking({
  playerRef,
  currentTrack,
  apolloClient,
  cooldownPeriod = 30 * 60 * 1000, // 30 minutes
}: UsePlaybackTrackingOptions) {
  const sessionRef = useRef<PlaySession | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isBufferingRef = useRef<boolean>(false);
  const completedPlaysRef = useRef<Map<number, number>>(new Map()); // trackId -> timestamp

  /**
   * Check if we're in cooldown for a given track
   */
  const isInCooldown = useCallback(
    (trackId: number): boolean => {
      const lastPlayTime = completedPlaysRef.current.get(trackId);
      if (!lastPlayTime) return false;
      return Date.now() - lastPlayTime < cooldownPeriod;
    },
    [cooldownPeriod]
  );

  /**
   * Initialize or reset session for a new track
   */
  const initializeSession = useCallback((track: Track) => {
    sessionRef.current = {
      trackId: track.id,
      playedSegments: [],
      totalHeardTime: 0,
      sessionStart: Date.now(),
      playCounted: false,
      lastSeenTime: 0,
    };
    lastTimeRef.current = 0;
  }, []);

  /**
   * Record a time segment as heard
   */
  const recordHeardTime = useCallback((startTime: number, endTime: number) => {
    const session = sessionRef.current;
    if (!session || startTime >= endTime) return;

    // Add the segment
    session.playedSegments.push({ start: startTime, end: endTime });

    // Recalculate total unique heard time
    session.totalHeardTime = mergeSegmentsAndCalculateTotal(
      session.playedSegments
    );
  }, []);

  /**
   * Check thresholds and bump play count if criteria met
   */
  const checkAndBumpPlayCount = useCallback(() => {
    const session = sessionRef.current;
    const player = playerRef.current;

    if (
      !session ||
      !player ||
      !currentTrack ||
      session.playCounted ||
      isInCooldown(currentTrack.id)
    ) {
      return;
    }

    const duration = player.duration || currentTrack.duration || 0;
    if (!duration || !isFinite(duration)) return;

    if (shouldCountPlay(session.totalHeardTime, duration)) {
      // Mark as counted
      session.playCounted = true;
      completedPlaysRef.current.set(currentTrack.id, Date.now());

      // Bump the play count
      apolloClient
        .mutate({
          mutation: BUMP_PLAY_COUNT_MUTATION,
          variables: {
            id: currentTrack.id,
          },
          errorPolicy: "ignore",
        })
        .catch((error) => {
          console.error("Failed to bump play count:", error);
        });
    }
  }, [playerRef, currentTrack, apolloClient, isInCooldown]);

  /**
   * Handle timeupdate event
   */
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    const session = sessionRef.current;

    if (!player || !session || !currentTrack) return;

    const currentTime = player.currentTime;
    const lastTime = lastTimeRef.current;

    // Only count if:
    // - Player is actually playing
    // - Not muted
    // - Not buffering
    // - Time has progressed forward (not seeking backwards massively)
    const timeDelta = currentTime - lastTime;
    const isValidProgression =
      isPlayingRef.current &&
      !isMutedRef.current &&
      !isBufferingRef.current &&
      timeDelta > 0 &&
      timeDelta < 2; // Ignore large jumps (seeks)

    if (isValidProgression) {
      recordHeardTime(lastTime, currentTime);
      checkAndBumpPlayCount();
    }

    // Update last seen time
    session.lastSeenTime = currentTime;
    lastTimeRef.current = currentTime;
  }, [playerRef, currentTrack, recordHeardTime, checkAndBumpPlayCount]);

  /**
   * Handle play event
   */
  const handlePlay = useCallback(() => {
    isPlayingRef.current = true;
    if (playerRef.current) {
      lastTimeRef.current = playerRef.current.currentTime;
    }
  }, [playerRef]);

  /**
   * Handle pause event
   */
  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    // Flush any accumulated time
    handleTimeUpdate();
  }, [handleTimeUpdate]);

  /**
   * Handle ended event
   */
  const handleEnded = useCallback(() => {
    isPlayingRef.current = false;
    // Final flush
    handleTimeUpdate();
    checkAndBumpPlayCount();
  }, [handleTimeUpdate, checkAndBumpPlayCount]);

  /**
   * Handle seeking
   */
  const handleSeeking = useCallback(() => {
    // When seeking, update the last time reference
    if (playerRef.current) {
      lastTimeRef.current = playerRef.current.currentTime;
    }
  }, [playerRef]);

  /**
   * Handle volume change (detect muting)
   */
  const handleVolumeChange = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      isMutedRef.current = player.muted || player.volume === 0;
    }
  }, [playerRef]);

  /**
   * Handle buffering/stall events
   */
  const handleWaiting = useCallback(() => {
    isBufferingRef.current = true;
  }, []);

  const handleCanPlay = useCallback(() => {
    isBufferingRef.current = false;
  }, []);

  const handleStalled = useCallback(() => {
    isBufferingRef.current = true;
  }, []);

  const handleError = useCallback(() => {
    isPlayingRef.current = false;
    isBufferingRef.current = false;
  }, []);

  /**
   * Flush metrics (for page unload)
   */
  const flushMetrics = useCallback(() => {
    handleTimeUpdate();
    checkAndBumpPlayCount();
  }, [handleTimeUpdate, checkAndBumpPlayCount]);

  /**
   * Handle visibility change
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      flushMetrics();
    }
  }, [flushMetrics]);

  /**
   * Handle before unload
   */
  const handleBeforeUnload = useCallback(() => {
    flushMetrics();
  }, [flushMetrics]);

  // Effect: Initialize session when track changes
  useEffect(() => {
    if (currentTrack) {
      initializeSession(currentTrack);
    } else {
      sessionRef.current = null;
    }
  }, [currentTrack, initializeSession]);

  // Effect: Set up audio element event listeners
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("playing", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);
    player.addEventListener("seeking", handleSeeking);
    player.addEventListener("seeked", handleSeeking);
    player.addEventListener("volumechange", handleVolumeChange);
    player.addEventListener("waiting", handleWaiting);
    player.addEventListener("canplay", handleCanPlay);
    player.addEventListener("stalled", handleStalled);
    player.addEventListener("error", handleError);

    // Initialize refs
    isPlayingRef.current = !player.paused;
    isMutedRef.current = player.muted || player.volume === 0;
    lastTimeRef.current = player.currentTime;

    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("playing", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
      player.removeEventListener("seeking", handleSeeking);
      player.removeEventListener("seeked", handleSeeking);
      player.removeEventListener("volumechange", handleVolumeChange);
      player.removeEventListener("waiting", handleWaiting);
      player.removeEventListener("canplay", handleCanPlay);
      player.removeEventListener("stalled", handleStalled);
      player.removeEventListener("error", handleError);
    };
  }, [
    playerRef,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleEnded,
    handleSeeking,
    handleVolumeChange,
    handleWaiting,
    handleCanPlay,
    handleStalled,
    handleError,
  ]);

  // Effect: Set up page lifecycle listeners
  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [handleVisibilityChange, handleBeforeUnload]);

  // Return utility functions if needed for debugging or manual control
  return {
    currentSession: sessionRef.current,
    flushMetrics,
  };
}

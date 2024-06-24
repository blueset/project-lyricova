import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { WebAudioPlayerState } from "./types";


let globalAudioContext: AudioContext | undefined = undefined;
let globalAudioGain: GainNode | undefined = undefined;

let cachedWebAudioBuffer: {
  [mediaUrl: string]: AudioBuffer;
} = {};

/**
 * Manage audio playback with Web Audio API.
 *
 * Based on the work of PaletteWork Editor.
 *
 * PaletteWorks Editor (https://github.com/mkpoli/paletteworks-editor)
 * Copyright (c) mkpoli licensed under MIT License
 */
export function useWebAudio(mediaUrl: string) {
  // Mount-scope variables
  const [audioContext, audioGain] = useMemo(() => {
    if (!globalAudioContext || !globalAudioGain) {
      const audioContext = new AudioContext();
      const audioGain = audioContext.createGain();
      audioGain.connect(audioContext.destination);
      globalAudioContext = audioContext;
      globalAudioGain = audioGain;
      cachedWebAudioBuffer = {};
      // console.log("update globalAudioContext: %o, globalAudioGain: %o, cachedWebAudioBuffer: %o", globalAudioContext, globalAudioGain, cachedWebAudioBuffer);
    }
    // console.log("globalAudioContext: %o, globalAudioGain: %o, cachedWebAudioBuffer: %o", globalAudioContext, globalAudioGain, cachedWebAudioBuffer);
    return [globalAudioContext, globalAudioGain];
  }, []);

  // File-scope variables
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>(cachedWebAudioBuffer[mediaUrl]);
  useEffect(() => {
    let active = true;
    (window.requestIdleCallback ?? window.setTimeout)(load);
    return () => {
      active = false;
      const ps = playerStatusRef.current;
      if (ps.state === "playing" && ps.bufferSource) {
        ps.bufferSource?.stop();
        ps.bufferSource?.disconnect();
      }
    };

    async function load() {
      setPlayerStatus((ps) => {
        if (ps.state === "playing" && ps.bufferSource) {
          ps.bufferSource?.stop();
          ps.bufferSource?.disconnect();
          return { state: "paused", rate: 1, progress: 0 };
        }
        return ps;
      });
      // console.log(cachedWebAudioBuffer);
      if (!cachedWebAudioBuffer[mediaUrl]) {
        if (!active) return;
        const response = await fetch(mediaUrl);
        if (!active) return;
        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;
        cachedWebAudioBuffer[mediaUrl] = await audioContext.decodeAudioData(arrayBuffer);
        // console.log("update buffer", cachedWebAudioBuffer[mediaUrl]);
      }
      if (!active) return;
      setAudioBuffer(cachedWebAudioBuffer[mediaUrl]);
    }
  }, [mediaUrl, audioContext, setAudioBuffer, audioGain]);

  // Session-scope variables
  const [playerStatus, setPlayerStatus] = useState<WebAudioPlayerState>({
    rate: 1,
    state: "paused",
    progress: 0,
  });
  const playerStatusRef = useRef<WebAudioPlayerState>(playerStatus);
  playerStatusRef.current = playerStatus;

  const getBufferSource = useCallback(() => {
    const bufferSource = audioContext.createBufferSource();
    const playerStatus = playerStatusRef.current;
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioGain);
    bufferSource.playbackRate.value = playerStatus.rate;
    return bufferSource;
  }, [audioContext, audioBuffer, audioGain]);

  const play = useCallback(() => {
    if (!audioContext) return;
    const playerStatus = playerStatusRef.current;
    if (playerStatus.state === "playing") return;
    const currentTime = audioContext.currentTime;
    const startingOffset =
      currentTime - playerStatus.progress / playerStatus.rate;
    const bufferSource = getBufferSource();
    bufferSource.start(currentTime, playerStatus.progress);
    setPlayerStatus({
      state: "playing",
      rate: playerStatus.rate,
      startingOffset,
      bufferSource,
    });
  }, [audioContext, getBufferSource]);

  const pause = useCallback(() => {
    if (!audioContext) return;
    const playerStatus = playerStatusRef.current;
    if (playerStatus.state === "paused") return;
    const currentTime = audioContext.currentTime;
    const progress =
      (currentTime - playerStatus.startingOffset) * playerStatus.rate;
    setPlayerStatus((ps) => {
      if (ps.state === "playing" && ps.bufferSource) {
        ps.bufferSource?.stop();
        ps.bufferSource?.disconnect();
      }
      return { state: "paused", rate: playerStatus.rate, progress };
    });
  }, [audioContext]);

  const seek = useCallback(
    (progress: number) => {
      if (!audioContext) return;
      progress = Math.max(0, Math.min(progress, audioBuffer.duration));
      const currentTime = audioContext.currentTime;
      const playerStatus = playerStatusRef.current;
      if (playerStatus.state === "playing") {
        setPlayerStatus((ps) => {
          if (ps.state === "playing" && ps.bufferSource) {
            ps.bufferSource?.stop();
            ps.bufferSource?.disconnect();
          }
          const bufferSource = getBufferSource();
          bufferSource.start(audioContext.currentTime, progress);
          return {
            state: "playing",
            rate: playerStatus.rate,
            startingOffset: currentTime - progress / playerStatus.rate,
            bufferSource,
          };
        });
      } else {
        setPlayerStatus({ state: "paused", rate: playerStatus.rate, progress });
      }
    },
    [audioBuffer, audioContext, getBufferSource]
  );

  const setRate = useCallback(
    (rate: number) => {
      if (!audioContext) return;
      const currentTime = audioContext.currentTime;
      const playerStatus = playerStatusRef.current;
      if (playerStatus.state === "playing") {
        playerStatus.bufferSource.playbackRate.value = rate;
        const progress =
          (currentTime - playerStatus.startingOffset) * playerStatus.rate;
        setPlayerStatus((ps) => ({
          state: "playing",
          rate,
          startingOffset: currentTime - progress / rate,
          bufferSource: ps.state === "playing" && ps.bufferSource,
        }));
      } else {
        setPlayerStatus({
          state: "paused",
          rate,
          progress: playerStatus.progress,
        });
      }
    },
    [audioContext]
  );

  const getProgress = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    if (playerStatus.state === "paused") return playerStatus.progress;
    if (!audioContext) return 0;
    const currentTime = audioContext.currentTime;
    return (currentTime - playerStatus.startingOffset) * playerStatus.rate;
  }, [audioContext]);

  return {
    playerStatus,
    play,
    pause,
    seek,
    setRate,
    getProgress,
    audioContext,
    audioBuffer,
  };
}

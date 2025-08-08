import React, { CSSProperties } from "react";
import { CardContent } from "@lyricova/components/components/ui/card";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import type { Track } from "./AppContext";
import { useAppContext } from "./AppContext";
import { TimeSlider } from "./TimeSlider";
import { PlayButton } from "./PlayButton";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import { shallowEqual } from "react-redux";
import {
  currentSongSelector,
  playNext,
  playPrevious,
  setCollapsed,
  setLoopMode,
  toggleShuffle,
} from "../../redux/public/playlist";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const LOOP_MODE_SWITCH = {
  all: "single",
  single: "none",
  none: "all",
} as const;

function generateBackgroundStyle(track: Track): CSSProperties {
  if (track?.hasCover) {
    return {
      backgroundImage: `url(/api/files/${track.id}/cover)`,
    };
  } else {
    console.log(
      "Disk photo by Giorgio Trovato on Unsplash (https://unsplash.com/photos/_H4uyF7ZlV0)."
    );
    return {
      backgroundImage: "url(/images/disk-256.jpg)",
    };
  }
}

export default function Player() {
  const dispatch = useAppDispatch();
  const {
    nowPlayingDefined,
    loopMode,
    shuffleMappingDefined,
    isCollapsed,
    tracksLength,
  } = useAppSelector(
    (s) => ({
      nowPlayingDefined: s.playlist.nowPlaying !== null,
      loopMode: s.playlist.loopMode,
      shuffleMappingDefined: !!s.playlist.shuffleMapping,
      isCollapsed: s.playlist.isCollapsed,
      tracksLength: s.playlist.tracks.length,
    }),
    shallowEqual
  );
  const currentSong = useAppSelector(currentSongSelector);
  const { playerRef } = useAppContext();

  const isFlatPlayer = useMediaQuery("(min-width: 768px)") && isCollapsed;

  const nextTrack = () => dispatch(playNext(!playerRef?.current.paused));
  const previousTrack = () =>
    dispatch(playPrevious(!playerRef?.current.paused));
  const toggleShuffleHandler = () => dispatch(toggleShuffle());
  const switchLoopMode = () =>
    dispatch(setLoopMode(LOOP_MODE_SWITCH[loopMode]));

  const loopModeButton = {
    all: (
      <Button
        id="player-loop-mode"
        variant="ghost"
        size="icon"
        aria-label="Repeat all"
        onClick={switchLoopMode}
      >
        <Repeat />
      </Button>
    ),
    single: (
      <Button
        id="player-loop-mode"
        variant="ghost"
        size="icon"
        aria-label="Repeat one"
        onClick={switchLoopMode}
      >
        <Repeat1 />
      </Button>
    ),
    none: (
      <Button
        id="player-loop-mode"
        variant="ghost"
        size="icon"
        aria-label="No repeat"
        onClick={switchLoopMode}
      >
        <Repeat className="opacity-50" />
      </Button>
    ),
  };

  return (
    <CardContent
      className="p-4 group/player data-[collapsed]:h-52 data-[collapsed]:md:h-auto"
      data-collapsed={isCollapsed || undefined}
      data-flat={isFlatPlayer || undefined}
    >
      <button
        aria-label={isCollapsed ? "Expand player" : "Collapse player"}
        onClick={() => dispatch(setCollapsed(!isCollapsed))}
        style={generateBackgroundStyle(currentSong)}
        className="group/toggle w-16 h-16 float-left mr-3 rounded bg-cover bg-center transition-shadow duration-500 focus:outline-none hover:shadow"
      >
        <div className="flex items-center justify-center w-full h-full rounded bg-black/50 opacity-0 group-hover/toggle:opacity-100 transition-opacity">
          {isCollapsed ? <ChevronsUpDown /> : <ChevronsDownUp />}
        </div>
      </button>
      <div className="group-data-[flat]/player:-my-1.5 group-data-[flat]/player:md:truncate">
        <span className="truncate block font-semibold text-xl group-data-[flat]/player:text-base group-data-[flat]/player:inline">
          {currentSong?.trackName || "No title"}
        </span>
        <span className="hidden group-data-[flat]/player:inline-block mb-1 mx-2">
          {" "}
          /{" "}
        </span>
        <span className="truncate text-lg block group-data-[flat]/player:text-base group-data-[flat]/player:text-muted-foreground group-data-[flat]/player:inline">
          {currentSong?.artistName || "Unknown artists"}
        </span>
      </div>
      <div className="flex flex-row items-center justify-around flex-wrap w-full group-data-[collapsed]/player:flex-wrap group-data-[collapsed]/player:md:flex-nowrap group-data-[collapsed]/player:w-full group-data-[collapsed]/player:md:w-auto -group-data-[collapsed]/player:md:mb-4 group-data-[collapsed]/player:md:mt-2">
        <TimeSlider
          className="mt-2 group-data-[collapsed]/player:md:mt-0 group-data-[collapsed]/player:md:mx-2"
          playerRef={playerRef}
          disabled={!nowPlayingDefined}
          isCollapsed={isCollapsed}
        />
        <Button
          id="player-shuffle"
          variant="ghost"
          size="icon"
          aria-label="Shuffle"
          disabled={tracksLength < 2}
          onClick={toggleShuffleHandler}
        >
          <Shuffle className={shuffleMappingDefined ? "" : "opacity-50"} />
        </Button>
        <Button
          id="player-previous"
          variant="ghost"
          size="icon"
          aria-label="Previous track"
          className="group-data-[collapsed]/player:md:-order-3 group-data-[flat]/player:md:-ml-2"
          onClick={previousTrack}
        >
          <SkipBack />
        </Button>
        <PlayButton
          playerRef={playerRef}
          className="group-data-[collapsed]/player:md:-order-2"
        />
        <Button
          id="player-next"
          variant="ghost"
          size="icon"
          aria-label="Next track"
          className="group-data-[collapsed]/player:md:-order-2"
          onClick={nextTrack}
        >
          <SkipForward />
        </Button>
        {loopModeButton[loopMode]}
      </div>
    </CardContent>
  );
}

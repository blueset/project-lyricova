import { Grid } from "@material-ui/core";
import style from "./index.module.scss";
import Player from "../components/public/Player";
import DetailsPanel from "../components/public/DetailsPanel";
import React, { useState, createRef, useEffect } from "react";
import { gql, useQuery, useLazyQuery } from "@apollo/client";
import {
  AppContext,
  Track,
  Playlist,
  LoopMode,
} from "../components/public/AppContext";
import _ from "lodash";
import { useNamedState } from "../frontendUtils/hooks";

const MUSIC_FILES_COUNT_QUERY = gql`
  query GetMusicFiles {
    musicFiles(first: -1) {
      edges {
        node {
          id
          fileSize
          trackName
          trackSortOrder
          artistName
          artistSortOrder
          albumName
          albumSortOrder
          hasCover
          duration
          hasLyrics
        }
      }
    }
  }
`;

export default function Index() {
  // const playerRef: {
  //   current: HTMLAudioElement | null;
  //   setCurrent: (v: HTMLAudioElement | null) => void;
  // } = {
  //   current: null,
  //   setCurrent: (v) => {
  //     playerRef.current = v;
  //   },
  // };
  const playerRef = createRef<HTMLAudioElement>();
  const [playlistTracks, setPlaylistTracks] = useNamedState<Track[]>(
    [],
    "playlistTracks"
  );
  const [nowPlaying, setNowPlaying] = useNamedState<Playlist["nowPlaying"]>(
    null,
    "nowPlaying"
  );
  const [loopMode, setLoopMode] = useNamedState<LoopMode>(
    LoopMode.NONE,
    "loopMode"
  );
  const [shuffleMapping, setShuffleMapping] = useNamedState<number[] | null>(
    null,
    "shuffleMapping"
  );

  function updateShuffleness(toggle: boolean = false) {
    // if        | shuffleMapping is null |  not null
    // toggle    |        shuffle         | no shuffle
    // no toggle |      no shuffle        |  shuffle
    if ((shuffleMapping === null) !== toggle) {
      setShuffleMapping(_.shuffle(_.range(playlistTracks.length)));
    } else {
      setShuffleMapping(null);
    }
  }

  const playlist: Playlist = {
    tracks: playlistTracks,
    nowPlaying,
    loopMode,
    shuffleMapping,
    loadTracks: (tracks: Track[]) => {
      setPlaylistTracks(tracks);
    },
    playTrack: (index: number, playNow: boolean = false) => {
      setNowPlaying(index);
      const fileId = playlistTracks[index].id;
      playerRef.current.src = `/api/files/${fileId}/file`;
      playerRef.current.currentTime = 0;
      playerRef.current.load();
      if (playNow) playerRef.current.play();
    },
    playNext: (playNow: boolean = false) => {
      if (playlistTracks.length < 1) return;
      if (nowPlaying === null) {
        playlist.playTrack(0, playNow);
      } else {
        playlist.playTrack(nowPlaying + 1, playNow);
      }
    },
    playPrevious: (playNow: boolean = false) => {
      if (playlistTracks.length < 1) return;
      if (nowPlaying === null) {
        playlist.playTrack(playlistTracks.length - 1, playNow);
      } else {
        playlist.playTrack(nowPlaying - 1, playNow);
      }
    },
    addTrackToNext: (track: Track) => {
      const index = nowPlaying ? nowPlaying : 0;
      playlistTracks.splice(index, 0, track);
      setPlaylistTracks(playlistTracks);
    },
    removeTrack: (index: number) => {
      playlistTracks.splice(index, 1);
      setPlaylistTracks(playlistTracks);
      if (nowPlaying === index) {
        playlist.playTrack(index);
      }
    },
    moveTrack: (from: number, to: number) => {
      if (shuffleMapping === null) {
        [playlistTracks[from], playlistTracks[to]] = [
          playlistTracks[to],
          playlistTracks[from],
        ];
        setPlaylistTracks(playlistTracks);
      } else {
        [shuffleMapping[from], shuffleMapping[to]] = [
          shuffleMapping[to],
          shuffleMapping[from],
        ];
        setShuffleMapping(shuffleMapping);
      }
      if (nowPlaying === from) {
        setNowPlaying(to);
      }
    },
    toggleShuffle: () => {
      if (playlistTracks.length < 1) {
        setShuffleMapping(null);
        return;
      }

      // Revert back now playing pointer before turning off shuffling
      if (nowPlaying && shuffleMapping !== null) {
        setNowPlaying(shuffleMapping[nowPlaying]);
      }

      updateShuffleness(/*toggle: */ true);

      // Map over now playing pointer after turning on shuffling
      if (nowPlaying && shuffleMapping !== null) {
        setNowPlaying(shuffleMapping.findIndex((v) => v === nowPlaying));
      }
    },
    setLoopMode: (loopMode: LoopMode) => {
      setLoopMode(loopMode);
    },
    getCurrentSong: () => {
      if (nowPlaying === null) return null;
      if (shuffleMapping !== null)
        return playlistTracks[shuffleMapping[nowPlaying]];
      return playlistTracks[nowPlaying];
    },
  };

  const [loadMediaFileQuery, mediaFilesQuery] = useLazyQuery<{
    musicFiles: { edges: { node: Track }[] };
  }>(MUSIC_FILES_COUNT_QUERY);

  // Load full song list on load
  useEffect(() => {
    if (playlistTracks.length < 1) {
      loadMediaFileQuery();
    }
  }, []);

  // Store full song list once loaded
  useEffect(() => {
    if (mediaFilesQuery.loading) {
      console.log("loading...");
    } else if (mediaFilesQuery.error) {
      console.log("error!", mediaFilesQuery.error);
    } else {
      console.log("Set playlist track.");
      console.log(mediaFilesQuery.data);
      if (mediaFilesQuery.data) {
        setPlaylistTracks(
          mediaFilesQuery.data.musicFiles.edges.map((v) => v.node)
        );
      }
    }
  }, [mediaFilesQuery]);

  return (
    <>
      <audio ref={playerRef}></audio>
      <AppContext playerRef={playerRef} playlist={playlist}>
        <Grid container spacing={0} className={style.gridContainer}>
          <Grid item lg={3} sm={4} xs={12} className={style.playerGridItem}>
            <Player />
          </Grid>
          <Grid item lg={9} sm={8} xs={12}>
            {/* <div>{JSON.stringify(playlistTracks).substring(0, 100)}</div> */}
            <DetailsPanel></DetailsPanel>
          </Grid>
        </Grid>
      </AppContext>
    </>
  );
}

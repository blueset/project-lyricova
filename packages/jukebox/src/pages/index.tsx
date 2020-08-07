import { Grid, Paper } from "@material-ui/core";
import style from "./index.module.scss";
import Player from "../components/public/Player";
import DetailsPanel from "../components/public/DetailsPanel";
import React, { createRef, useEffect } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import {
  AppContext,
  Track,
  Playlist,
  LoopMode,
} from "../components/public/AppContext";
import _ from "lodash";
import { useNamedState } from "../frontendUtils/hooks";
import CurrentPlaylist from "../components/public/CurrentPlaylist";
import { move } from "../frontendUtils/arrays";

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

  function updateShuffleness(toggle: boolean = false): number[] | null {
    // if        | shuffleMapping is null |  not null
    // toggle    |        shuffle         | no shuffle
    // no toggle |      no shuffle        |  shuffle
    let mapping = null;

    if ((shuffleMapping !== null) !== toggle) {
      mapping = _.shuffle(_.range(playlistTracks.length));
      if (nowPlaying !== null) {
        const repIndex = mapping.indexOf(nowPlaying);
        [mapping[0], mapping[repIndex]] = [mapping[repIndex], mapping[0]];
      }
    }
    setShuffleMapping(mapping);
    return mapping;
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
      const fileId = playlist.getSongByIndex(index).id;
      if (playerRef.current) {
        playerRef.current.src = `/api/files/${fileId}/file`;
        playerRef.current.currentTime = 0;
        playerRef.current.load();
        if (playNow) playerRef.current.play();
      } else {
        console.error("PlayerRef is lost!", playerRef);
      }
      setNowPlaying(index);
    },
    playNext: (playNow: boolean = false) => {
      if (playlistTracks.length < 1) return;
      if (nowPlaying === null) {
        playlist.playTrack(0, playNow);
      } else if (nowPlaying === playlistTracks.length - 1) {
        if (playlist.loopMode === LoopMode.ALL) {
          playlist.playTrack(0, playNow);
        }
      } else {
        playlist.playTrack(nowPlaying + 1, playNow);
      }
    },
    playPrevious: (playNow: boolean = false) => {
      if (playlistTracks.length < 1) return;
      if (nowPlaying === null) {
        playlist.playTrack(playlistTracks.length - 1, playNow);
      } else if (nowPlaying === 0) {
        if (playlist.loopMode === LoopMode.ALL) {
          playlist.playTrack(nowPlaying - 1, playNow);
        }
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
      if (shuffleMapping !== null) {
        const realIndex = shuffleMapping[index];
        setShuffleMapping(shuffleMapping.filter((v, idx) => idx !== index));
        index = realIndex;
      }
      setPlaylistTracks(playlistTracks.filter((v, idx) => idx !== index));
      if (nowPlaying === index) {
        playlist.playTrack(index);
      }
    },
    moveTrack: (from: number, to: number) => {
      if (shuffleMapping === null) {
        setPlaylistTracks(move(playlistTracks, from, to));
      } else {
        setShuffleMapping(move(shuffleMapping, from, to));
      }
      if (nowPlaying === from) {
        setNowPlaying(to);
      } else if (from < nowPlaying && nowPlaying <= to) {
        setNowPlaying(nowPlaying - 1);
      } else if (from > nowPlaying && nowPlaying >= to) {
        setNowPlaying(nowPlaying + 1);
      }
    },
    toggleShuffle: () => {
      if (playlistTracks.length < 1) {
        setShuffleMapping(null);
        return;
      }

      // Revert back now playing pointer before turning off shuffling
      if (nowPlaying !== null && shuffleMapping !== null) {
        setNowPlaying(shuffleMapping[nowPlaying]);
      }

      const mapping = updateShuffleness(/*toggle: */ true);

      // Map over now playing pointer after turning on shuffling
      if (nowPlaying !== null && mapping !== null) {
        setNowPlaying(mapping.indexOf(nowPlaying));
      }
    },
    setLoopMode: (loopMode: LoopMode) => {
      setLoopMode(loopMode);
    },
    getSongByIndex: (index: number) => {
      if (shuffleMapping !== null) return playlistTracks[shuffleMapping[index]];
      return playlistTracks[index];
    },
    getCurrentSong: () => {
      if (nowPlaying === null) return null;
      return playlist.getSongByIndex(nowPlaying);
    },
  };

  function onPlayEnded() {
    if (playlist.loopMode === LoopMode.SINGLE) {
      // Single loop
      playlist.playTrack(nowPlaying, true);
    } else if (nowPlaying + 1 < playlistTracks.length) {
      // Play next
      playlist.playNext(true);
    } else if (playlist.loopMode === LoopMode.ALL) {
      // Loop all, play the first
      playlist.playTrack(0, true);
    } else {
      // Play nothing if no loop and last track ended
      setNowPlaying(null);
    }
  }

  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      player.addEventListener("ended", onPlayEnded);
      return () => {
        player.removeEventListener("ended", onPlayEnded);
      };
    }
  }, [playerRef]);

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
          _.sortBy(
            mediaFilesQuery.data.musicFiles.edges.map((v) => v.node),
            ["trackSortOrder", "artistSortOrder", "albumSortOrder"]
          )
        );
      }
    }
  }, [mediaFilesQuery]);

  return (
    <>
      <audio ref={playerRef}></audio>
      <AppContext playerRef={playerRef} playlist={playlist}>
        <Grid container spacing={0} className={style.gridContainer}>
          <Grid item xl={3} sm={4} xs={12} className={style.playerGridItem}>
            <Paper className={style.playerPaper}>
              <Player />
              <CurrentPlaylist />
            </Paper>
          </Grid>
          <Grid item xl={9} sm={8} xs={12}>
            <DetailsPanel></DetailsPanel>
          </Grid>
        </Grid>
      </AppContext>
    </>
  );
}

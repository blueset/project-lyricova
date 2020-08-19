import { Grid, Paper } from "@material-ui/core";
import style from "./IndexLayout.module.scss";
import Player from "../Player";
import DetailsPanel from "../DetailsPanel";
import React, { useEffect, ReactNode, useRef } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import {
  AppContext,
  Track,
  Playlist,
  LoopMode,
} from "../AppContext";
import _ from "lodash";
import { useNamedState } from "../../../frontendUtils/hooks";
import CurrentPlaylist from "../CurrentPlaylist";
import { move } from "../../../frontendUtils/arrays";
import { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import { Texture } from "../../../graphql/TextureResolver";
import { CSSProperties } from "@material-ui/core/styles/withStyles";

interface Props {
  children: ReactNode;
}

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

const TEXTURE_QUERY = gql`
  query GetTexture {
    randomTexture {
      name
      author
      authorUrl
      url
    }
  }
`;

function getTrackCoverURL(track: Track): string {
  return `/api/files/${track.id}/cover`;
}

function generateBackgroundStyle(
  track: Track,
  texture: string | null
): CSSProperties {
  if (texture !== null) {
    return {
      backgroundImage: `url("/textures/${texture}")`,
    };
  } else if (track !== null) {
    return {
      backgroundImage: `url("${getTrackCoverURL(track)}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  } else {
    return {};
  }
}

export default function IndexLayout({ children }: Props) {
  const playerRef = useRef<HTMLAudioElement>();
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
    getCurrentCoverUrl: () => {
      const track = playlist.getCurrentSong();
      if (track && track.hasCover) {
        return getTrackCoverURL(track);
      }
      return null;
    },
    stop: () => {
      setNowPlaying(null);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.src = "";
      }
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

  // Add onEnded listener
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
    musicFiles: MusicFilesPagination;
  }>(MUSIC_FILES_COUNT_QUERY);

  // Load full song list on load
  useEffect(() => {
    if (playlistTracks.length < 1) {
      loadMediaFileQuery();
    }
  }, []);

  // Set media session controllers
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", function () {
        console.log("Media session action: play");
        playerRef.current?.play();
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        console.log("Media session action: pause");
        playerRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler("seekbackward", function () {
        console.log("Media session action: seekbackward");
        if (playerRef.current?.src) {
          const newValue = Math.max(playerRef.current.currentTime - 5, 0);
          if (playerRef.current.fastSeek) {
            playerRef.current.fastSeek(newValue);
          } else {
            playerRef.current.currentTime = newValue;
          }
        }
      });
      navigator.mediaSession.setActionHandler("seekforward", function () {
        console.log("Media session action: seekforward");
        if (playerRef.current?.src) {
          const newValue = Math.min(
            playerRef.current.currentTime + 5,
            playerRef.current.duration
          );
          if (playerRef.current.fastSeek) {
            playerRef.current.fastSeek(newValue);
          } else {
            playerRef.current.currentTime = newValue;
          }
        }
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        console.log("Media session action: previoustrack");
        playlist.playPrevious(!playerRef.current?.paused);
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        console.log("Media session action: nexttrack");
        playlist.playNext(!playerRef.current?.paused);
      });
      try {
        navigator.mediaSession.setActionHandler("stop", function () {
          playlist.stop();
        });
      } catch (error) { }

      try {
        navigator.mediaSession.setActionHandler("seekto", function (event) {
          if (event.fastSeek === true) return;
          if (playerRef.current.fastSeek) {
            playerRef.current.fastSeek(event.seekTime);
          } else {
            playerRef.current.currentTime = event.seekTime;
          }
        });
      } catch (error) { }
    }
  });

  function updatePositionState() {
    if (playerRef.current) {
      if ("setPositionState" in navigator.mediaSession) {
        // console.log("Updating position state...");
        navigator.mediaSession.setPositionState({
          duration: playerRef.current.duration || 0.0,
          playbackRate: playerRef.current.playbackRate || 1.0,
          position: playerRef.current.currentTime || 0.0,
        });
      }
      navigator.mediaSession.playbackState = playerRef.current.paused
        ? "paused"
        : "playing";
    }
  }

  useEffect(() => {
    const playerElm = playerRef.current;
    // console.log("trying to register listeners");
    if (playerElm !== null) {
      // console.log("registering listeners");
      playerElm.addEventListener("timeupdate", updatePositionState);
      playerElm.addEventListener("playing", updatePositionState);
      playerElm.addEventListener("pause", updatePositionState);
      playerElm.addEventListener("durationchange", updatePositionState);
    }
    return function cleanUp() {
      // console.log("trying to remove listeners");
      if (playerElm !== null) {
        // console.log("removing listeners");
        playerElm.removeEventListener("timeupdate", updatePositionState);
        playerElm.removeEventListener("playing", updatePositionState);
        playerElm.removeEventListener("pause", updatePositionState);
        playerElm.removeEventListener("durationchange", updatePositionState);
      }
    };
  }, [playerRef]);

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

  // Random fallback background
  const [textureURL, setTextureURL] = useNamedState<string | null>(
    null,
    "textureURL"
  );
  const [loadRandomTexture, randomTextureQuery] = useLazyQuery<{
    randomTexture: Texture;
  }>(TEXTURE_QUERY);

  useEffect(() => {
    if (!playlist.getCurrentSong()?.hasCover) {
      if (randomTextureQuery?.called !== true) {
        loadRandomTexture();
      } else {
        randomTextureQuery?.refetch();
      }
    } else {
      setTextureURL(null);
    }

    if ("mediaSession" in navigator) {
      const track = playlist.getCurrentSong();
      if (track) {
        const data: MediaMetadataInit = {
          title: track.trackName || "",
          artist: track.artistName || "",
          album: track.albumName || "",
        };
        if (track.hasCover) {
          data.artwork = [
            {
              src: getTrackCoverURL(track),
              type: "image/png",
              sizes: "512x512",
            },
          ];
        }
        navigator.mediaSession.metadata = new MediaMetadata(data);
      } else {
        navigator.mediaSession.metadata = null;
      }
    }
  }, [playlist.getCurrentSong()]);

  // Store full song list once loaded
  useEffect(() => {
    if (randomTextureQuery?.data?.randomTexture) {
      const texture = randomTextureQuery.data.randomTexture;
      console.log(
        `Texture background ${texture.name} by ${texture.author} (${texture.authorUrl}) from https://www.transparenttextures.com/.`
      );
      setTextureURL(texture.url);
    }
  }, [randomTextureQuery.data]);

  return (
    <>
      <audio ref={playerRef}></audio>
      <AppContext playerRef={playerRef} playlist={playlist}>
        <Grid
          container
          spacing={0}
          className={style.gridContainer}
          style={generateBackgroundStyle(playlist.getCurrentSong(), textureURL)}
        >
          <Grid item xl={3} sm={4} xs={12} className={style.playerGridItem}>
            <Paper className={style.playerPaper}>
              <Player />
              <CurrentPlaylist />
            </Paper>
          </Grid>
          <Grid item xl={9} sm={8} xs={12}>
            <DetailsPanel coverUrl={playlist.getCurrentCoverUrl()}>
              {children}
            </DetailsPanel>
          </Grid>
        </Grid>
      </AppContext>
    </>
  );
}

export const getLayout = (page: ReactNode) => <IndexLayout>{page}</IndexLayout>;
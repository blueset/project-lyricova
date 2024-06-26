import { Box, Paper } from "@mui/material";
import Player from "../Player";
import DetailsPanel from "../DetailsPanel";
import type { ReactNode, CSSProperties } from "react";
import React, { useEffect, useRef, useCallback } from "react";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import type { Track } from "../AppContext";
import { AppContext } from "../AppContext";
import { useNamedState } from "../../../hooks/useNamedState";
import CurrentPlaylist from "../CurrentPlaylist";
import type { Texture } from "../../../graphql/TextureResolver";
import { AuthContext } from "lyricova-common/components/AuthContext";
import type { DocumentNode } from "graphql";
import store, {
  persistor,
  useAppDispatch,
  useAppSelector,
} from "../../../redux/public/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import {
  currentSongSelector,
  playNext,
  playPrevious,
  stop,
} from "../../../redux/public/playlist";
import { setTextureUrl } from "../../../redux/public/display";
import { BackgroundGradient } from "../Background";
import { BackgroundCanvas } from "../BackgroundCanvas/BackgroundCanvas";

interface Props {
  children: ReactNode;
}

const TEXTURE_QUERY = gql`
  query GetTexture {
    randomTexture {
      name
      author
      authorUrl
      url
    }
  }
` as DocumentNode;

const BUMP_PLAY_COUNT_MUTATION = gql`
  mutation bumpPlayCount($id: Int!) {
    bumpPlayCount(fileId: $id)
  }
` as DocumentNode;

function getTrackCoverURL(track: Track): string {
  return `/api/files/${track.id}/cover`;
}

function generateBackgroundStyle(
  track: Track,
  texture: string | null
): CSSProperties {
  if (texture) {
    return {
      backgroundImage: `url("/textures/${texture}")`,
    };
  } else if (track) {
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
  const apolloClient = useApolloClient();

  const dispatch = useAppDispatch();
  const { nowPlaying, loopMode, isCollapsed, playNow } = useAppSelector(
    (s) => s.playlist
  );
  const currentSong = useAppSelector(currentSongSelector);
  const isFullscreen = useAppSelector((s) => s.display.isFullscreen);

  // Reflect nowPlaying change to player
  useEffect(() => {
    if (!currentSong) {
      playerRef.current.pause();
      playerRef.current.src = "";
      return;
    }
    const fileId = currentSong.id;
    // console.log("playTrack", index, playNow, playerRef.current);
    if (playerRef.current) {
      const isPlaying = !playerRef.current.paused;
      playerRef.current.src = `/api/files/${fileId}/file`;
      playerRef.current.currentTime = 0;
      playerRef.current.load();
      if (playNow || (playNow === null && isPlaying)) playerRef.current.play();
    } else {
      console.error("PlayerRef is lost!", playerRef);
    }
  }, [currentSong, nowPlaying, playNow]);

  const onPlayEnded = useCallback(() => {
    if (loopMode === "single") {
      playerRef.current.currentTime = 0;
      playerRef.current.play();
    } else {
      // Play next
      dispatch(playNext(true));
    }
    try {
      if (currentSong?.id) {
        apolloClient.mutate({
          mutation: BUMP_PLAY_COUNT_MUTATION,
          variables: {
            id: currentSong.id,
          },
          errorPolicy: "ignore",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }, [loopMode, dispatch, currentSong?.id, apolloClient]);

  // Add onEnded listener
  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      player.addEventListener("ended", onPlayEnded);
      return () => {
        player.removeEventListener("ended", onPlayEnded);
      };
    }
  }, [playerRef, onPlayEnded]);

  // Set media session controllers
  useEffect(() => {
    if (navigator.mediaSession !== undefined) {
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
        dispatch(playPrevious(!playerRef?.current.paused));
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        console.log("Media session action: nexttrack");
        dispatch(playNext(!playerRef?.current.paused));
      });
      try {
        navigator.mediaSession.setActionHandler("stop", function () {
          dispatch(stop());
        });
      } catch (error) {}

      try {
        navigator.mediaSession.setActionHandler("seekto", function (event) {
          if (event.fastSeek === true) return;
          if (playerRef.current.fastSeek) {
            playerRef.current.fastSeek(event.seekTime);
          } else {
            playerRef.current.currentTime = event.seekTime;
          }
        });
      } catch (error) {}
    }
  });

  const updatePositionState = useCallback(() => {
    if (playerRef.current) {
      if (navigator.mediaSession !== undefined) {
        if (navigator.mediaSession.setPositionState !== undefined) {
          // Updating position state...
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
  }, [playerRef]);

  const updateSessionMetadata = useCallback(() => {
    if ("mediaSession" in navigator) {
      if (currentSong) {
        const data: MediaMetadataInit = {
          title: currentSong.trackName || "",
          artist: currentSong.artistName || "",
          album: currentSong.albumName || "",
        };
        if (currentSong.hasCover) {
          data.artwork = [
            {
              src: getTrackCoverURL(currentSong),
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
  }, [currentSong]);

  useEffect(() => {
    const playerElm = playerRef.current;
    // trying to register listeners
    if (playerElm) {
      // registering listeners
      playerElm.addEventListener("timeupdate", updatePositionState);
      playerElm.addEventListener("playing", updatePositionState);
      playerElm.addEventListener("pause", updatePositionState);
      playerElm.addEventListener("durationchange", updatePositionState);
      playerElm.addEventListener("playing", updateSessionMetadata);
      playerElm.addEventListener("pause", updateSessionMetadata);
    }
    return function cleanUp() {
      // trying to remove listeners
      if (playerElm) {
        // removing listeners
        playerElm.removeEventListener("timeupdate", updatePositionState);
        playerElm.removeEventListener("playing", updatePositionState);
        playerElm.removeEventListener("pause", updatePositionState);
        playerElm.removeEventListener("durationchange", updatePositionState);
        playerElm.removeEventListener("playing", updateSessionMetadata);
        playerElm.removeEventListener("pause", updateSessionMetadata);
      }
    };
  }, [playerRef, updatePositionState, updateSessionMetadata]);

  // Random fallback background
  // const [textureURL, setTextureURL] = useNamedState<string | null>(
  //   null,
  //   "textureURL"
  // );
  const textureURL = useAppSelector((state) => state.display.textureUrl);
  const [loadRandomTexture, randomTextureQuery] = useLazyQuery<{
    randomTexture: Texture;
  }>(TEXTURE_QUERY);

  useEffect(() => {
    if (!currentSong?.hasCover) {
      if (randomTextureQuery?.called !== true) {
        loadRandomTexture();
      } else {
        randomTextureQuery?.refetch();
      }
    } else {
      dispatch(setTextureUrl(undefined));
    }

    updateSessionMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentSong,
    loadRandomTexture,
    randomTextureQuery.refetch,
    updateSessionMetadata,
  ]);

  useEffect(() => {
    if (randomTextureQuery?.data?.randomTexture) {
      const texture = randomTextureQuery.data.randomTexture;
      console.log(
        `Texture background ${texture.name} by ${texture.author} (${texture.authorUrl}) from https://www.transparenttextures.com/.`
      );
      dispatch(setTextureUrl(texture.url));
    }
  }, [dispatch, randomTextureQuery.data]);

  return (
    <>
      <audio ref={playerRef} />
      <AppContext playerRef={playerRef}>
        <AuthContext noRedirect>
          <Box
            sx={{
              height: "100lvh",
              display: "flex",
              ...(isCollapsed
                ? { flexDirection: "column" }
                : {
                    flexDirection: { xs: "column", md: "row" },
                  }),
            }}
            // style={generateBackgroundStyle(currentSong, textureURL)}
          >
            <BackgroundCanvas
              coverUrl={currentSong ? getTrackCoverURL(currentSong) : undefined}
              textureUrl={textureURL}
              playerRef={playerRef}
              hasLyrics={currentSong?.hasLyrics || false}
            />
            {!isFullscreen && (
              <Box
                sx={{
                  zIndex: 2,
                  ...(isCollapsed
                    ? { order: 1 }
                    : {
                        width: { md: "clamp(25em, 33%, 45em)" },
                        padding: { md: "24px" },
                        height: { xs: "100lvh", md: "100%" },
                        position: { xs: "absolute", md: "unset" },
                        inset: { xs: 0, md: "unset" },
                      }),
                }}
              >
                <Paper
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  lang="ja"
                >
                  <Player />
                  {!isCollapsed && <CurrentPlaylist />}
                </Paper>
              </Box>
            )}
            <Box
              sx={{
                flexGrow: 1,
                maxHeight: { xs: "calc(100% - 12.5rem)", sm: "unset" },
                ...(isCollapsed
                  ? {
                      height: { md: 0, xs: "100%" },
                    }
                  : {
                      height: "100%",
                      width: 0,
                    }),
              }}
            >
              <DetailsPanel
                coverUrl={null}
                // coverUrl={currentSong ? getTrackCoverURL(currentSong) : null}
              >
                {children}
              </DetailsPanel>
            </Box>
          </Box>
        </AuthContext>
      </AppContext>
    </>
  );
}

export const getLayout = (page: ReactNode) => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <IndexLayout>{page}</IndexLayout>
    </PersistGate>
  </Provider>
);

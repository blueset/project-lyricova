"use client";

import Player from "@/components/public/Player";
import DetailsPanel from "@/components/public/DetailsPanel";
import type { ReactNode, CSSProperties } from "react";
import React, { useEffect, useRef, useCallback } from "react";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import type { Track } from "@/components/public/AppContext";
import { AppContext } from "@/components/public/AppContext";
import CurrentPlaylist from "@/components/public/CurrentPlaylist";
import type { Texture } from "@lyricova/api/graphql/types";
import { AuthContext } from "@lyricova/components";
import type { DocumentNode } from "graphql";
import store, {
  persistor,
  useAppDispatch,
  useAppSelector,
} from "@/redux/public/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import {
  currentSongSelector,
  playNext,
  playPrevious,
  stop,
} from "@/redux/public/playlist";
import { setTextureUrl } from "@/redux/public/display";
import { BackgroundCanvas } from "@/components/public/BackgroundCanvas/BackgroundCanvas";
import { cn } from "@lyricova/components/utils";
import { Card } from "@lyricova/components/components/ui/card";

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

function IndexLayout({ children }: Props) {
  const playerRef = useRef<HTMLAudioElement>(null);
  const apolloClient = useApolloClient();

  const dispatch = useAppDispatch();
  const { nowPlaying, loopMode, isCollapsed, playNow } = useAppSelector(
    (s) => s.playlist
  );
  const currentSong = useAppSelector(currentSongSelector);
  const isFullscreen = useAppSelector((s) => s.display.isFullscreen);

  // Reflect nowPlaying change to player
  useEffect(() => {
    if (!playerRef.current) return;
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
    if (!playerRef.current) return;
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
          <div
            data-collapsed={isCollapsed ? "true" : undefined}
            className="h-lvh flex flex-col not-data-collapsed:md:flex-row group/player"
          >
            <BackgroundCanvas
              coverUrl={currentSong ? getTrackCoverURL(currentSong) : undefined}
              textureUrl={textureURL}
              playerRef={playerRef}
              hasLyrics={currentSong?.hasLyrics || false}
            />
            {!isFullscreen && (
              <div
                className={cn(
                  "z-10",
                  "group-data-collapsed/player:order-1 group-data-collapsed/player:w-full",
                  "group-not-data-collapsed/player:md:w-[clamp(25em,33%,45em)] group-not-data-collapsed/player:md:p-6 group-not-data-collapsed/player:h-lvh group-not-data-collapsed/player:md:h-full group-not-data-collapsed/player:absolute group-not-data-collapsed/player:md:static group-not-data-collapsed/player:inset-0"
                )}
              >
                <Card
                  className="w-full h-full flex flex-col p-0 gap-0 rounded-none border-none group-data-collapsed/player:rounded-none md:rounded-md"
                  lang="ja"
                >
                  <Player />
                  {!isCollapsed && <CurrentPlaylist />}
                </Card>
              </div>
            )}
            <div
              className={cn(
                "grow sm:max-h-none @container/details",
                "group-data-collapsed/player:h-0",
                "group-not-data-collapsed/player:h-full group-not-data-collapsed/player:w-0"
              )}
            >
              <DetailsPanel
                coverUrl={null}
                // coverUrl={currentSong ? getTrackCoverURL(currentSong) : null}
              >
                {children}
              </DetailsPanel>
            </div>
          </div>
        </AuthContext>
      </AppContext>
    </>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <IndexLayout>{children}</IndexLayout>
      </PersistGate>
    </Provider>
  );
}

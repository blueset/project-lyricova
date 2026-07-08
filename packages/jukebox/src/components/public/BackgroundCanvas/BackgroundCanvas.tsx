/**
 * Source code in this folder is adapted from Apple Music-like Lyrics by SteveXMH, licensed under GPLv3.
 * @source https://github.com/Steve-xmh/applemusic-like-lyrics
 * @author SteveXMH
 * @license GPLv3
 */

import type { RefObject } from "react";
import { useEffect } from "react";
import { getColorSync } from "colorthief";
import dynamic from "next/dynamic";
import { usePlayerState } from "../../../hooks/usePlayerState";

const BackgroundRenderNoSSR = dynamic(
  () => import("../compat/amllBackground").then((m) => m.BackgroundRender),
  {
    ssr: false,
  },
);

interface Props {
  coverUrl?: string;
  textureUrl?: string;
  playerRef: RefObject<HTMLAudioElement>;
  hasLyrics?: boolean;
}

export function BackgroundCanvas({ coverUrl, textureUrl, playerRef }: Props) {
  const _playerState = usePlayerState(playerRef);

  useEffect(() => {
    if (textureUrl) {
      document.body.style.removeProperty("--brand-hue");
    } else {
      let canceled = false;
      const image = new Image();
      image.crossOrigin = "anonymous";
      const albumImageLoaded = new Promise<void>((resolve, reject) => {
        if (image.complete && image.naturalWidth) {
          resolve();
          return;
        }
        image.onload = () => {
          resolve();
        };
        image.onerror = (err) => {
          reject(err);
        };
      });
      image.src = String(coverUrl);
      (async () => {
        try {
          await albumImageLoaded;
          const dominant = getColorSync(image);
          if (!dominant) return;
          const hue = dominant.oklch().h;
          if (canceled) return;
          document.body.style.setProperty("--brand-hue", `${hue}`);
        } catch (err) {
          console.error("Failed to extract hue", err);
          document.body.style.removeProperty("--brand-hue");
        }
      })();

      return () => {
        canceled = true;
      };
    }
  }, [textureUrl, coverUrl]);

  if (textureUrl) {
    return (
      <div
        className="fixed inset-0 size-full"
        style={{ backgroundImage: `url("/textures/${textureUrl}")` }}
      />
    );
  } else {
    return (
      <BackgroundRenderNoSSR
        album={coverUrl}
        staticMode
        className="fixed inset-0 size-full"
      />
    );
  }
}

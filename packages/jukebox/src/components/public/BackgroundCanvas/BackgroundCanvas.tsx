/**
 * Source code in this folder is adapted from Apple Music-like Lyrics by SteveXMH, licensed under GPLv3.
 * @source https://github.com/Steve-xmh/applemusic-like-lyrics
 * @author SteveXMH
 * @license GPLv3
 */

import type { CSSProperties, RefObject } from "react";
import { useEffect, useState } from "react";
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

const fallbackBackgroundStyle: CSSProperties = {
  background:
    "radial-gradient(circle at 18% 20%, hsla(var(--brand-hue, 250), 60%, 32%, 0.85), transparent 34%), radial-gradient(circle at 82% 28%, hsla(calc(var(--brand-hue, 250) + 75), 58%, 28%, 0.65), transparent 36%), linear-gradient(135deg, hsl(var(--brand-hue, 250), 42%, 13%), hsl(calc(var(--brand-hue, 250) + 35), 38%, 8%))",
};

function getSupportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      depth: false,
      powerPreference: "low-power",
    });
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    console.log("WebGL2 support:", Boolean(gl));
    return Boolean(gl);
  } catch (e) {
    console.error("Failed to check WebGL2 support", e);
    return false;
  }
}

export function BackgroundCanvas({ coverUrl, textureUrl, playerRef }: Props) {
  const _playerState = usePlayerState(playerRef);
  const [supportsWebGL2, setSupportsWebGL2] = useState<boolean | null>(null);

  useEffect(() => {
    if (textureUrl) return;
    setSupportsWebGL2(getSupportsWebGL2());
  }, [textureUrl]);

  useEffect(() => {
    if (textureUrl) {
      document.body.style.removeProperty("--brand-hue");
    } else if (!coverUrl) {
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
  } else if (supportsWebGL2) {
    return (
      <BackgroundRenderNoSSR
        album={coverUrl}
        staticMode
        className="fixed inset-0 size-full"
      />
    );
  } else {
    return <div className="fixed inset-0 size-full" style={fallbackBackgroundStyle} />;
  }
}

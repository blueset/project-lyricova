/**
 * Source code in this folder is adapted from Apple Music-like Lyrics by SteveXMH, licensed under GPLv3.
 * @source https://github.com/Steve-xmh/applemusic-like-lyrics
 * @author SteveXMH
 * @license GPLv3
 */

import { RefObject, useEffect, useRef, useState } from "react";
import { Pixel, normalizeColor } from "./utils";
import { BUILDIN_RENDER_METHODS, CanvasBackgroundRender } from "./render";
import convert from "color-convert";
import ColorThief from "colorthief";
import { FBMWaveMethod } from "./fbm-wave";
import dynamic from "next/dynamic";
import { usePlayerState } from "../../../hooks/usePlayerState";
import Color from "colorjs.io";

const BackgroundRenderNoSSR = dynamic(
  () => import("../compat/amllBackground").then((m) => m.BackgroundRender),
  {
    ssr: false,
  }
);

interface Props {
  coverUrl?: string;
  textureUrl?: string;
  playerRef?: RefObject<HTMLAudioElement>;
  hasLyrics?: boolean;
}

export function BackgroundCanvas({
  coverUrl,
  textureUrl,
  playerRef,
  hasLyrics,
}: Props) {
  const playerState = usePlayerState(playerRef);

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
      image.src = coverUrl;
      (async () => {
        try {
          await albumImageLoaded;
          const colorThief = new ColorThief();
          const [r, g, b] = colorThief.getColor(image);
          const color = new Color("sRGB", [r / 255, g / 255, b / 255]);
          const hue = color.oklch.h;
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

export function BackgroundCanvasRender({ coverUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasBackgroundRender | null>(null);
  const [albumImageMainColors, setAlbumImageMainColors] = useState<Pixel[]>([
    [0, 0, 0],
  ]);
  const backgroundLightness = 1;
  const backgroundRenderScale = 1;
  const lyricPageOpened = false;
  const backgroundRenderMethod = FBMWaveMethod.value;
  const backgroundRenderSkipFrames = 0;
  const [canvasError, setCanvasError] = useState("");

  const obsRef = useRef(
    new ResizeObserver((entries) => {
      const entry = entries[0];
      const renderScale = Math.max(0.01, 1);
      if (entry) {
        const canvas = entry.target as HTMLCanvasElement;
        if (canvas) {
          const renderer = rendererRef.current;
          if (renderer && renderer.canvas === canvas) {
            renderer.resize(
              entry.contentRect.width * renderScale,
              entry.contentRect.height * renderScale
            );
            renderer.shouldRedraw();
          }
        }
      }
    })
  );

  useEffect(() => {
    const f = backgroundRenderSkipFrames;
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.skipFrameRate = f;
      renderer.shouldRedraw();
    }
  }, [backgroundRenderSkipFrames]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (renderer && canvas && lyricPageOpened) {
      const renderScale = Math.max(0.01, Number(backgroundRenderScale) || 1);
      renderer.resize(
        canvas.clientWidth * renderScale,
        canvas.clientHeight * renderScale
      );
      renderer.shouldRedraw();
    }
  }, [backgroundRenderScale, lyricPageOpened]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      const m = BUILDIN_RENDER_METHODS.find(
        (v) => v.value === backgroundRenderMethod
      );
      if (m) {
        renderer.setRenderMethod(m);
        renderer.shouldRedraw();
      }
    }
  }, [backgroundRenderMethod]);

  useEffect(() => {
    setCanvasError("");
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        obsRef.current.observe(canvas);
        const renderer = new CanvasBackgroundRender(canvas);
        const m = BUILDIN_RENDER_METHODS.find(
          (v) => v.value === backgroundRenderMethod
        );
        if (m) {
          renderer.setRenderMethod(m);
        }
        rendererRef.current = renderer;
        return () => {
          obsRef.current.unobserve(canvas);
          renderer.dispose();
        };
      }
    } catch (err) {
      setCanvasError(`切换渲染方式发生错误：${err}`);
    }
  }, [backgroundRenderMethod]);

  useEffect(() => {
    try {
      const colors = albumImageMainColors
        .slice(0, 4)
        .map<Pixel>(normalizeColor);
      for (let i = 0; i < 4; i++) {
        colors.push(colors[0]);
      }
      let l = Number(backgroundLightness);
      if (Number.isNaN(l)) l = 1;
      l = Math.max(Math.min(2, l), 0);
      colors.sort((a, b) => convert.rgb.hsv(a)[2] - convert.rgb.hsv(b)[2]);
      colors.forEach((c) => {
        if (l > 1) {
          const m = 2 - l;
          c[0] = Math.round(0xff - (0xff - c[0]) * m);
          c[1] = Math.round(0xff - (0xff - c[1]) * m);
          c[2] = Math.round(0xff - (0xff - c[2]) * m);
        } else if (l < 1) {
          c[0] = Math.round(c[0] * l);
          c[1] = Math.round(c[1] * l);
          c[2] = Math.round(c[2] * l);
        }
      });
      const c = [...colors];
      for (let i = 0; i < 28; i++) {
        colors.push(...c);
      }
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.setAlbumColorMap(colors);
        renderer.shouldRedraw();
      }
    } catch (err) {
      setCanvasError(`更新专辑图主要颜色表到渲染管线时发生错误：${err}`);
    }
  }, [albumImageMainColors, backgroundLightness]);

  useEffect(() => {
    setCanvasError("");
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
    image.src = coverUrl;
    (async () => {
      try {
        await albumImageLoaded;
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(image);
        setAlbumImageMainColors(palette);
        const renderer = rendererRef.current;
        if (renderer && !canceled) {
          renderer.setAlbumImage(image);
          renderer.shouldRedraw();
        }
      } catch (err) {
        setCanvasError(`更新专辑图片到渲染管线时发生错误：${err}`);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [coverUrl]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 size-full ${backgroundRenderMethod}`}
    />
  );
}

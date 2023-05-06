import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import {
  usePlainPlayerLyricsState,
  useTrackwiseTimelineControl,
} from "../../../frontendUtils/hooks";
import type { Theme } from "@mui/material";
import { styled } from "@mui/material";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import Balancer from "react-wrap-balancer";
import type { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "../../../redux/public/store";
import { currentSongSelector } from "../../../redux/public/playlist";
import gsap from "gsap";

const LyricsTextFont = 'normal 25px Inter,"Source Han Sans",sans-serif';
const FuriganaTextFont = 'normal 12px Inter,"Source Han Sans",sans-serif';
const currentColor = "white";
const nextColor = "rgba(255,255,255,0.5)";
const lyricsBase = 80;
const furiganaBase = 53;
const gap = 10;

function renderLine(
  ctx: CanvasRenderingContext2D,
  line: LyricsKitLyricsLine,
  textMeasurement: number[],
  offsetPx: number
) {
  ctx.font = LyricsTextFont;
  ctx.fillText(line.content, offsetPx, lyricsBase);
  if (line.attachments?.furigana) {
    ctx.font = FuriganaTextFont;
    line.attachments.furigana.forEach((furigana) => {
      const left = textMeasurement[furigana.leftIndex];
      const right = textMeasurement[furigana.rightIndex];
      const width = right - left;
      const furiganaWidth = ctx.measureText(furigana.content).width;
      const furiganaOffset = (width - furiganaWidth) / 2;
      ctx.fillText(
        furigana.content,
        offsetPx + left + furiganaOffset,
        furiganaBase
      );
    });
    ctx.font = LyricsTextFont;
  }
}

function renderLines(
  ctx: CanvasRenderingContext2D,
  lines: LyricsKitLyricsLine[],
  textMeasurement: number[][],
  currentFrameId: number,
  offsetPx: number
) {
  const center = ctx.canvas.width / 2;
  ctx.textBaseline = "bottom";

  let leftPtr = center,
    rightPtr = center;

  // Render center line
  const currentLine = lines[currentFrameId];
  if (currentLine) {
    if (currentLine.attachments.timeTag) {
      // clip left half for current section
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, center, ctx.canvas.height);
      ctx.clip();
      // render line
      ctx.fillStyle = currentColor;
      renderLine(
        ctx,
        currentLine,
        textMeasurement[currentFrameId],
        center - offsetPx
      );
      ctx.restore();
      ctx.save();
      // clip right half for next section
      ctx.beginPath();
      ctx.rect(center, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.clip();
      // render rest of the line
      ctx.fillStyle = nextColor;
      renderLine(
        ctx,
        currentLine,
        textMeasurement[currentFrameId],
        center - offsetPx
      );
      // Clear clip
      ctx.restore();
    } else {
      ctx.fillStyle = currentColor;
      renderLine(
        ctx,
        currentLine,
        textMeasurement[currentFrameId],
        center - offsetPx
      );
    }
    const currentWidths = textMeasurement[currentFrameId];
    const currentWidth = currentWidths[currentWidths.length - 1] ?? 0;
    leftPtr = center - offsetPx - gap;
    rightPtr = center - offsetPx + currentWidth + gap;
  }
  // Render left lines
  let leftFrameId = currentFrameId - 1;
  while (leftFrameId >= 0 && leftPtr > 0) {
    const line = lines[leftFrameId];
    ctx.fillStyle = nextColor;
    const widths = textMeasurement[leftFrameId];
    const width = widths[widths.length - 1] ?? 0;
    leftPtr -= width;
    renderLine(ctx, line, textMeasurement[leftFrameId], leftPtr);
    leftPtr -= gap;
    leftFrameId--;
  }
  // Render right lines
  let rightFrameId = currentFrameId + 1;
  while (rightFrameId < lines.length && rightPtr < ctx.canvas.width) {
    const line = lines[rightFrameId];
    ctx.fillStyle = nextColor;
    renderLine(ctx, line, textMeasurement[rightFrameId], rightPtr);
    const widths = textMeasurement[rightFrameId];
    const width = widths[widths.length - 1] ?? 0;
    rightPtr += width + gap;
    rightFrameId++;
  }
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function PictureInPictureLyrics({ lyrics, blur }: Props) {
  const { playerRef } = useAppContext();
  const { playerState, endTimes } = usePlainPlayerLyricsState(
    lyrics,
    playerRef
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const lines = lyrics.lines;
  const currentSong = useAppSelector(currentSongSelector);
  const coverImage = useMemo(() => {
    const image = new Image();
    if (currentSong?.hasCover) {
      image.src = `/api/files/${currentSong.id}/cover`;
    } else {
      image.src = "/images/disk-256.jpg";
    }
    return image;
  }, [currentSong?.id, currentSong?.hasCover]);

  const render = useCallback(
    (
      canvas: HTMLCanvasElement,
      frameId: number,
      offset: number,
      textMeasurement: number[][]
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "blur(20px)";
      // draw coverImage cover the canvas keeping aspect ratio
      const coverRatio = coverImage.width / coverImage.height;
      const canvasRatio = canvas.width / canvas.height;
      let coverWidth = canvas.width;
      let coverHeight = canvas.height;
      if (coverRatio > canvasRatio) {
        coverHeight = canvas.height;
        coverWidth = coverHeight * coverRatio;
      } else {
        coverWidth = canvas.width;
        coverHeight = coverWidth / coverRatio;
      }
      ctx.drawImage(
        coverImage,
        (canvas.width - coverWidth) / 2,
        (canvas.height - coverHeight) / 2,
        coverWidth,
        coverHeight
      );
      ctx.filter = "none";
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'normal 15px Inter,"Source Han Sans",sans-serif';
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const trackName = currentSong?.trackName ?? "Unknowe track";
      const textWidth = ctx.measureText(trackName).width;
      ctx.fillText(trackName, 20, 20);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(
        ` / ${currentSong?.artistName ?? "Unknowe artist"}`,
        20 + textWidth,
        20
      );
      renderLines(ctx, lines, textMeasurement, frameId, offset);
    },
    [coverImage, currentSong?.artistName, currentSong?.trackName, lines]
  );

  const [timeline, setTimeline] = useState<gsap.core.Timeline>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const timeline = gsap.timeline();
    if (!canvas) {
      console.error("canvas not ready", canvas);
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.font = LyricsTextFont;
    const measurement = lines.map((line) => {
      return [...line.content, ""].map((_, idx) => {
        const text = line.content.slice(0, idx);
        const measure = ctx.measureText(text);
        return measure.width;
      });
    });

    const tlRefObj = {
      lineId: -1,
      offsetPx: 0,
    };

    const callback = () => {
      render(canvas, tlRefObj.lineId, tlRefObj.offsetPx, measurement);
    };
    lines.forEach((line, lineId) => {
      const widths = measurement[lineId];
      const width = widths[widths.length - 1] ?? 0;
      timeline.set(tlRefObj, { lineId, offsetPx: 0 }, line.position);
      if (line.attachments.timeTag) {
        let lastPosition = 0;
        line.attachments.timeTag.tags.forEach((tag) => {
          const startTime = lastPosition,
            endTime = tag.timeTag;
          timeline.to(
            tlRefObj,
            {
              offsetPx: widths[tag.index],
              duration: endTime - startTime,
              ease: "none",
            },
            line.position + startTime
          );
          lastPosition = tag.timeTag;
        });
      } else {
        const endTime = endTimes[lineId + 1];
        timeline.to(
          tlRefObj,
          {
            offsetPx: width,
            duration: endTime - line.position,
            ease: "none",
          },
          line.position
        );
      }
    });
    timeline.eventCallback("onUpdate", callback);
    timeline.eventCallback("onComplete", callback);
    timeline.eventCallback("onStart", callback);
    timeline.eventCallback("onInterrupt", callback);

    setTimeline(timeline);
    return () => {
      timeline.kill();
    };
  }, [endTimes, lines, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = 800;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillText("Loading...", 20, 20);
    const stream = canvas.captureStream();
    video.srcObject = stream;

    const onPointerDown = () => {
      video.play();
      document.removeEventListener("pointerdown", onPointerDown);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useTrackwiseTimelineControl(playerState, timeline);

  return (
    <div>
      <p>
        Note: Alpha version. PIP status cannot persist across different files,
        controls on PIP are not working as expected.
      </p>
      <p>Canvas</p>
      <canvas ref={canvasRef} />
      <p>Video</p>
      <video ref={videoRef} />
    </div>
  );
}

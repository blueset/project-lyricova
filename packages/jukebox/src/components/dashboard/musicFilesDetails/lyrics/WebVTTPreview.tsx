import { useEffect, useMemo, useRef } from "react";
import type { LyricsLineJSON } from "lyrics-kit/core";
import {
  FURIGANA,
  buildTimeTag,
  TIME_TAG,
  METADATA_ROLE,
  Attachments,
} from "lyrics-kit/core";
import _ from "lodash";
import { useLyricsStore } from "./state/editorState";

interface Props {
  fileId: number;
}

function convertLine(line: LyricsLineJSON): string {
  const base = line.content;
  if (!base) return "";

  // Time tag support is disabled until major browser ships support for it
  // const timeTags = line?.attachments?.timeTag?.tags;
  // if (timeTags) {
  //   let ptr = 0;
  //   let result = "";
  //   timeTags.forEach(({ index, timeTag }) => {
  //     result +=
  //       base.substring(ptr, index) +
  //       `<${buildTimeTag(line.position + timeTag)}>`;
  //     ptr = index;
  //   });
  //   if (ptr < base.length) result += base.substring(ptr);
  //   base = result;
  // }

  const furigana = line?.attachments?.[FURIGANA]?.attachment ?? [];
  let result = "";
  let ptr = 0;
  furigana.forEach(({ content, range: [start, end] }) => {
    if (start >= base.length || end > base.length) return;
    if (start > ptr) {
      result += base.substring(ptr, start);
    }
    result += `<ruby>${base.substring(start, end)}<rt>${content}</rt></ruby>`;
    ptr = end;
  });
  if (ptr < base.length) result += base.substring(ptr);
  return result;
}

export default function LyricsPreviewPanel({ fileId }: Props) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const lyrics = useLyricsStore((s) => s.lyrics);
  const trackDataUrl = useMemo<string | null>(() => {
    if (!lyrics) return null;
    const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    const divider = isFirefox ? "|" : "";
    let webvtt = "WEBVTT\n\n";
    webvtt +=
      'STYLE\n::cue {\n  font-family: Inter, "Source Han Sans", "Noto Sans CJK", sans-serif;\n}\n\n';
    webvtt +=
      'STYLE\n::cue(.tt) {\n  font-variant-numeric: "tabular-nums";\n}\n\n';
    webvtt += "STYLE\n::cue(.pndg) {\n  opacity: 0.3;\n}\n\n";
    webvtt +=
      "STYLE\n::cue(.min) {\n  font-size: 0.75em;\n  color: #00ffff;\n}\n\n";
    webvtt +=
      "STYLE\n::cue(.lang) {\n  font-size: 0.7em;\n  color: #ffff00;\n}\n\n";

    const trackNumbers = lyrics.lines
      .flatMap((line, idx, arr) => [
        { idx, time: _.round(line.position, 3), offset: 1 },
        {
          idx,
          time: _.round(
            line.attachments?.[TIME_TAG]?.tags?.at(-1)?.timeTag
              ? line.attachments[TIME_TAG].tags.at(-1)?.timeTag + line.position
              : arr[idx + 1]?.position ?? line.position + 10,
            3
          ),
          offset: -1,
        },
      ])
      .toSorted((a, b) => a.time - b.time)
      .reduce<{
        layers: number[];
        trackToIdx: { [track: number]: number };
        idxToTrack: { [idx: number]: number };
      }>(
        (acc, { idx, offset }) => {
          if (offset === 1) {
            let firstAvailableLayer = 0;
            while (acc.trackToIdx[firstAvailableLayer] !== undefined) {
              firstAvailableLayer++;
            }
            acc.layers[idx] = firstAvailableLayer;
            acc.trackToIdx[firstAvailableLayer] = idx;
            acc.idxToTrack[idx] = firstAvailableLayer;
          } else {
            const layer = acc.idxToTrack[idx];
            acc.idxToTrack[idx] = undefined;
            acc.trackToIdx[layer] = undefined;
          }
          return acc;
        },
        { layers: [], idxToTrack: {}, trackToIdx: {} }
      ).layers;

    let lineCounter = 0;
    webvtt += lyrics.lines
      .map((v, idx) => {
        if (Number.isNaN(v.position)) return "";
        const timeTag = buildTimeTag(v.position);
        const start = timeTag.substring(0, 10);
        const startTime = v.position;
        const nextPosition = lyrics.lines[idx + 1]?.position ?? NaN;
        const end = !Number.isNaN(nextPosition)
          ? buildTimeTag(nextPosition).substring(0, 10)
          : "99:59.999";
        const vttOffsiteLine = (trackNumbers[idx] ?? 0) * 4;
        const role = parseInt(v.attachments?.[METADATA_ROLE]?.text ?? "0") % 3;
        const align = role === 0 ? "start" : role === 1 ? "end" : "middle";
        const minor = v.attachments.minor ? ".min" : "";
        const metadata = `#${idx}${
          vttOffsiteLine !== 0 ? "&" + vttOffsiteLine : ""
        }${role !== 0 ? "R" + role : ""}${v.attachments.minor ? "Min" : ""}`;
        if (v.attachments?.[TIME_TAG]?.tags) {
          const base = v.content;
          const timeTags = v.attachments[TIME_TAG]?.tags;
          let ptrTime = start;
          let result = "";
          timeTags.forEach(({ index, timeTag }) => {
            const section = base.substring(0, index);
            const formattedSection = `${convertLine({
              ...v,
              content: section,
            } as LyricsLineJSON)}`;
            const endTimeTag = buildTimeTag(startTime + timeTag);
            lineCounter++;
            result += `${lineCounter}\n${ptrTime} --> ${endTimeTag} line:${vttOffsiteLine} align:${align}\n<c.tt${minor}>[${start}] (@ ${ptrTime} ${metadata})</c>\n${formattedSection}<c.pndg>${divider}${base.substring(
              index
            )}</c>`;
            const translations = Attachments.fromJSON(
              v.attachments
            ).translations;
            for (const lang in translations) {
              result += `\n<c.lang>${lang || "-"}:</c> ${translations[lang]}`;
            }
            result += "\n\n";
            ptrTime = endTimeTag;
          });
          if (timeTags[timeTags.length - 1]?.index < base?.length) {
            const formattedSection = `${convertLine(v)}`;
            lineCounter++;
            result += `${lineCounter}\n${ptrTime} --> ${end} line:${vttOffsiteLine} align:${align}\n<c.tt${minor}>[${start}] (@ ${ptrTime} ${metadata})</c>\n${formattedSection}`;
          }
          return result.trimEnd();
        } else {
          let text = `${convertLine(v)}`;
          const translations = Attachments.fromJSON(v.attachments).translations;
          for (const lang in translations) {
            text += `\n<c.lang>${lang || "-"}:</c> ${translations[lang]}`;
          }
          lineCounter++;
          return `${lineCounter}\n${start} --> ${end} line:${vttOffsiteLine} align:${align}\n<c.tt${minor}>[${start}] (${metadata})</c>\n${text}`;
        }
      })
      .join("\n\n");
    // console.log(webvtt);
    const vttBlob = new Blob([webvtt], {
      type: "text/plain",
    });
    return URL.createObjectURL(vttBlob);
  }, [lyrics]);

  useEffect(() => {
    if (!playerRef.current) return;
    const track = playerRef.current.textTracks[0];
    if (!track) return;
    track.mode = "showing";
  }, []);

  return (
    <video
      ref={playerRef}
      src={`/api/files/${fileId}/file`}
      controls
      style={{
        // width: "calc(100vw - 5em)", height: "calc(100vh - 10em)"
        width: "100%",
        height: "100%",
      }}
    >
      <track
        src={trackDataUrl}
        kind="subtitles"
        srcLang="ja"
        label="LRCX Preview"
        default
      />
    </video>
  );
}

import { useEffect, useMemo, useRef } from "react";
import type { LyricsLine } from "lyrics-kit/core";
import { Lyrics, FURIGANA, buildTimeTag } from "lyrics-kit/core";

interface Props {
  lyricsString: string;
  fileId: number;
}

function convertLine(line: LyricsLine): string {
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

  const furigana = line?.attachments?.content?.[FURIGANA]?.attachment ?? [];
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

export default function LyricsPreviewPanel({ lyricsString, fileId }: Props) {
  const playerRef = useRef<HTMLVideoElement>();
  const lyrics = useMemo(() => {
    if (!lyricsString) return null;
    try {
      return new Lyrics(lyricsString);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      // snackbar.enqueueSnackbar(`Error while parsing lyrics: ${e}`, { variant: "error" });
      return null;
    }
  }, [lyricsString]);
  const trackDataUrl = useMemo<string | null>(() => {
    if (!lyrics) return null;
    let webvtt = "WEBVTT\n\n";
    webvtt +=
      'STYLE\n::cue {\n  font-family: Inter, "Source Han Sans", "Noto Sans CJK", sans-serif;\n}\n\n';
    webvtt +=
      'STYLE\n::cue(.tt) {\n  font-variant-numeric: "tabular-nums";\n}\n\n';
    webvtt += "STYLE\n::cue(.pndg) {\n  opacity: 0.3;\n}\n\n";
    let lineCounter = 0;
    webvtt += lyrics.lines
      .map((v, idx) => {
        if (!v.timeTag) return "";
        const start = v.timeTag.substring(0, 10);
        const startTime = v.position;
        const end =
          lyrics.lines[idx + 1]?.timeTag?.substring(0, 10) ?? "99:59.999";
        if (v.attachments.timeTag?.tags) {
          const base = v.content;
          const timeTags = v.attachments.timeTag?.tags;
          let ptrTime = start;
          let result = "";
          timeTags.forEach(({ index, timeTag }) => {
            const section = base.substring(0, index);
            const formattedSection = `${convertLine({
              ...v,
              content: section,
            } as LyricsLine)}`;
            const endTimeTag = buildTimeTag(startTime + timeTag);
            lineCounter++;
            result += `${lineCounter}\n${ptrTime} --> ${endTimeTag} line:50% align:start\n<c.tt>[${start}] (@ ${ptrTime})</c>\n${formattedSection}<c.pndg>${base.substring(
              index
            )}</c>`;
            if (v.attachments.translation()) {
              result += `\n${v.attachments.translation()}`;
            }
            result += "\n\n";
            ptrTime = endTimeTag;
          });
          if (timeTags[timeTags.length - 1].index < base.length) {
            const formattedSection = `${convertLine(v)}`;
            lineCounter++;
            result += `${lineCounter}\n${ptrTime} --> ${end} line:50% align:start\n<c.tt>[${start}] (@ ${ptrTime})</c>\n${formattedSection}`;
          }
          return result.trimEnd();
        } else {
          let text = `${convertLine(v)}`;
          if (v.attachments.translation()) {
            text += `\n${v.attachments.translation()}`;
          }
          lineCounter++;
          return `${lineCounter}\n${start} --> ${end} line:50% align:start\n<c.tt>[${start}]</c>\n${text}`;
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
    <div>
      <video
        ref={playerRef}
        src={`/api/files/${fileId}/file`}
        controls
        style={{ width: "calc(100vw - 5em)", height: "calc(100vh - 10em)" }}
      >
        <track
          src={trackDataUrl}
          kind="subtitles"
          srcLang="ja"
          label="LRCX Preview"
          default
        />
      </video>
    </div>
  );
}

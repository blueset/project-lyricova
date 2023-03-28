import { useEffect, useMemo, useRef } from "react";
import { Lyrics, LyricsLine } from "lyrics-kit";
import { FURIGANA } from "lyrics-kit/build/main/core/lyricsLineAttachment";
import { buildTimeTag } from "lyrics-kit/build/main/utils/regexPattern";

interface Props {
  lyricsString: string;
  fileId: number;
}

function convertLine(line: LyricsLine): string {
  let base = line.content;

  const timeTags = line?.attachments?.timeTag?.tags;
  if (timeTags) {
    let ptr = 0;
    let result = "";
    timeTags.forEach(({ index, timeTag }) => {
      result +=
        base.substring(ptr, index) +
        `<${buildTimeTag(line.position + timeTag)}>`;
      ptr = index;
    });
    if (ptr < base.length) result += base.substring(ptr);
    base = result;
  }

  const furigana = line?.attachments?.content?.[FURIGANA]?.attachment ?? [];
  let result = "";
  let ptr = 0;
  furigana.forEach(({ content, range: [start, end] }) => {
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
    webvtt += lyrics.lines
      .map((v, idx) => {
        const start = v.timeTag.substring(0, 10);
        const end =
          lyrics.lines[idx + 1]?.timeTag?.substring(0, 10) ?? "99:59.999";
        let text = `${convertLine(v)}`;
        if (v.attachments.translation()) {
          text += `\n${v.attachments.translation()}`;
        }

        return `${idx +
          1}\n${start} --> ${end} line:50% align:start\n<c.tt>[${start}]</c>\n${text}`;
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

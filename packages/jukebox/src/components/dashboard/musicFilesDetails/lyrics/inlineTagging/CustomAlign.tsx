import { kanaToHira, useAuthContext } from "@lyricova/components";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import {
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@lyricova/components/components/ui/tooltip";
import { useCallback, useState } from "react";
import { useLyricsStore } from "../state/editorState";
import { toast } from "sonner";
import {
  DOTS,
  FURIGANA,
  LyricsJSON,
  TAGS,
  TIME_TAG,
  WordTimeTagLabelJSON,
} from "lyrics-kit/core";
import { fetchEventData } from "fetch-sse";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@lyricova/components/components/ui/hover-card";
import { Progress } from "@lyricova/components/components/ui/progress";

function lyricsToHiragana(lyrics: LyricsJSON): string {
  const kanaLyrics = lyrics.lines
    .map((line) => {
      const furigana = line.attachments?.[FURIGANA]?.attachment ?? [];
      let result = "";
      let ptr = 0;
      furigana.forEach(({ content, range: [start, end] }) => {
        if (start >= line.content.length || end > line.content.length) return;
        if (start > ptr) {
          result += line.content.substring(ptr, start);
        }
        result += content;
        ptr = end;
      });
      if (ptr < line.content.length) result += line.content.substring(ptr);
      return result;
    })
    .join("\n");
  return kanaToHira(kanaLyrics);
}

interface AlignmentResult {
  alignedTokens: [string, number, number][][];
  segmentResults: {
    voice_recognition_result: { text: string; start: number; end: number }[];
    line_tokens: string[][];
    moras: string[][];
  };
}

function assToInlineTags(lyrics: LyricsJSON, alignmentResult: AlignmentResult) {
  if (!lyrics?.lines?.length) {
    return;
  }

  const hiraKataRegex =
    /[\p{Script=Hira}\p{Script=Kana}ー][ぁぃぅぇぉゃゅょァィゥェォャュョ]?/gu;

  const fullTokens = alignmentResult.alignedTokens.reduce((acc, token) => {
    acc.push(...token);
    return acc;
  }, [] as [string, number, number][]);
  const lineTokens = alignmentResult.segmentResults.line_tokens.map(
    (tokens) => {
      const line = [];
      for (const token of tokens) {
        if (!fullTokens.length) break;
        while (fullTokens.length && fullTokens[0][0] !== token) {
          console.warn("Token mismatch", token, fullTokens[0], tokens);
          fullTokens.shift();
        }
        line.push(fullTokens.shift()!);
      }
      return line;
    }
  );

  const lines = lineTokens.map((l) => {
    const segments = l.map((v) => {
      return {
        hira: kanaToHira(v[0].trim()),
        start: v[1],
        end: v[2],
      };
    });
    return segments;
  });

  const lyricsLines = lyrics.lines;
  let lyricsLinePtr = 0;
  lines.forEach((segments) => {
    if (segments.length < 1) {
      return;
    }

    while (
      !lyricsLines[lyricsLinePtr].content.match(hiraKataRegex) &&
      !lyricsLines[lyricsLinePtr].attachments?.[FURIGANA]?.attachment?.length
    ) {
      lyricsLinePtr++;
    }

    const lyricsLine = lyricsLines[lyricsLinePtr];
    const charQueue: { start: number; end: number; char: string }[] = [];
    let charQueuePtr = 0;
    let charQueueStart = Infinity;
    (
      lyricsLines[lyricsLinePtr].attachments?.[FURIGANA]?.attachment ?? []
    ).forEach(({ content, range: [start, end] }) => {
      if (start >= lyricsLine.content.length || end > lyricsLine.content.length)
        return;
      if (start > charQueuePtr) {
        lyricsLine.content
          .substring(charQueuePtr, start)
          .matchAll(hiraKataRegex)
          .forEach((match) => {
            charQueueStart = Math.min(
              charQueueStart,
              charQueuePtr + match.index
            );
            charQueue.push({
              start: charQueuePtr + match.index,
              end: charQueuePtr + match.index + match[0].length,
              char: match[0],
            });
          });
      }
      content.matchAll(hiraKataRegex).forEach(([c]) => {
        charQueueStart = Math.min(charQueueStart, start);
        charQueue.push({
          start,
          end,
          char: c,
        });
      });
      charQueuePtr = end;
    });
    if (charQueuePtr < lyricsLine.content.length) {
      lyricsLine.content
        .substring(charQueuePtr)
        .matchAll(hiraKataRegex)
        .forEach((match) => {
          charQueueStart = Math.min(charQueueStart, charQueuePtr + match.index);
          charQueue.push({
            start: charQueuePtr + match.index,
            end: charQueuePtr + match.index + match[0].length,
            char: match[0],
          });
        });
    }

    if (!isFinite(charQueueStart)) {
      console.warn("No characters found in line", lyricsLine.content);
      return;
    }

    const startOffset = segments[0].start;

    const tags: number[][] = Array(lyricsLine.content.length + 1)
      .fill(null)
      .map((): number[] => []);
    tags[charQueueStart].push(startOffset);

    let prevChar = "";
    let accumulatedTime = 0;

    for (const { hira, start, end } of segments) {
      if (!charQueue.length) {
        console.warn(
          "No more characters to process",
          hira,
          lyricsLine.content,
          segments
        );
        break;
      }
      const head = charQueue.shift()!;
      head.char = kanaToHira(head.char);
      if (head.char !== hira && head.char === "ー" && prevChar) {
        if ("あかさたなはまやらわがざだはぱ".includes(prevChar))
          head.char = "あ";
        else if ("いきしちにひみりぎじぢびぴ".includes(prevChar))
          head.char = "い";
        else if ("うくすつぬふむゆるゔぐずづぶぷ".includes(prevChar))
          head.char = "う";
        else if ("えけせてねへめれげぜでべぺ".includes(prevChar))
          head.char = "え";
        else if ("おこそとのほもよろごぞどぼぽ".includes(prevChar))
          head.char = "お";
      } else if (head.char !== hira && head.char === "でぃ") {
        head.char = "ぢ";
      } else if (head.char !== hira && head.char === "でゅ") {
        head.char = "ぢゅ";
      } else if (head.char !== hira && head.char === "てぃ") {
        head.char = "ち";
      } else if (head.char !== hira && head.char === "てゅ") {
        head.char = "ちゅ";
      }

      if (head.char !== hira) {
        console.warn(
          "Character mismatch",
          head.char,
          hira,
          lyricsLine.content,
          JSON.stringify(segments)
        );
        continue;
      }
      accumulatedTime = end;
      if (
        charQueue.length &&
        charQueue[0].start === head.start &&
        charQueue[0].end === head.end
      ) {
        // If next character is in the same group, insert at start position
        tags[head.start].push(accumulatedTime);
      } else if (charQueue.length) {
        // If next character is not in the same group, insert at their start position
        const nextStart = charQueue[0].start;
        tags[nextStart].push(accumulatedTime);
      } else {
        // If this is the last character, insert at its end position
        tags[head.end].push(accumulatedTime);
      }

      prevChar = hira;
    }

    useLyricsStore.setState((state) => {
      const lyricsLine = state.lyrics?.lines[lyricsLinePtr];
      if (!lyricsLine) return;

      lyricsLine.attachments[TAGS] = {
        type: "number_2d_array",
        values: tags,
      };
      const dots = tags.map((t) => t.length);
      const lastDot1 = dots.findLastIndex((t) => t === 1);
      if (lastDot1 >= 0) {
        dots[lastDot1] = -1;
      }
      lyricsLine.attachments[DOTS] = {
        type: "number_array",
        values: dots,
      };
      const timeTags: WordTimeTagLabelJSON[] = tags
        .map((t, i) => {
          if (!t.length) return null;
          return {
            index: i,
            timeTag: t[0] - startOffset,
          };
        })
        .filter((t) => t !== null) as WordTimeTagLabelJSON[];
      lyricsLine.attachments[TIME_TAG] = {
        type: "time_tag",
        tags: timeTags,
      };
    });

    lyricsLinePtr++;
  });

  useLyricsStore.getState().generate();
}

export function CustomAlign({ fileId }: { fileId: number }) {
  const authContext = useAuthContext();
  const [isAlignmentLoading, setIsAlignmentLoading] = useState(false);
  const [progress, setProgress] = useState<{
    status: string;
    progress?: number;
  } | null>(null);

  const handleGenerateTagging = useCallback(() => {
    const lyrics = useLyricsStore.getState().lyrics;
    if (!lyrics) {
      toast.error("No valid lyrics available for tagging.");
      return;
    }

    (async () => {
      setIsAlignmentLoading(true);
      const hiraganaLyrics = lyricsToHiragana(lyrics);

      let result: AlignmentResult | null = null;
      try {
        const token = authContext.jwt();
        await fetchEventData("/api/alignment/custom", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { fileId, lyrics: hiraganaLyrics },
          onMessage: (event) => {
            try {
              if (!event.data) return;
              const data = JSON.parse(event.data);
              if (data.type === "progress") {
                setProgress({
                  status: data.status,
                  progress: data.progress,
                });
              } else if (data.type === "result") {
                result = data.result;
                setProgress(null);
              } else if (data.type === "error") {
                setProgress({ status: data.error });
                toast.error(`Error while aligning: ${data.error}`);
                setIsAlignmentLoading(false);
              }
            } catch (error) {
              console.error("Error processing message:", error);
              toast.error(`Error while aligning: ${error}`);
            }
          },
          onClose: () => {
            toast.success("Alignment completed");
          },
          onError: (error) => {
            if (error === "User canceled the request") {
              toast.info("Alignment canceled");
              return;
            }
            console.error(error);
            toast.error(`Error while aligning: ${error}`);
            setIsAlignmentLoading(false);
          },
        });
      } catch (e) {
        toast.error(`Error while aligning: ${e}`);
        setIsAlignmentLoading(false);
        return;
      } finally {
      }

      assToInlineTags(lyrics, result);

      setIsAlignmentLoading(false);
    })();
  }, [fileId]);

  return (
    <HoverCard>
      <Tooltip>
        <HoverCardTrigger>
          <TooltipTrigger asChild>
            <ProgressButton
              size="sm"
              variant="outline"
              onClick={handleGenerateTagging}
              progress={isAlignmentLoading ? progress?.progress ?? true : false}
            >
              Custom
            </ProgressButton>
          </TooltipTrigger>
        </HoverCardTrigger>
        <TooltipContent>
          Generate inline tagging from custom align implementation
        </TooltipContent>
      </Tooltip>
      {progress && (
        <HoverCardContent
          className="p-4 w-auto max-w-[80ch] overflow-y-auto max-h-(--radix-hover-card-content-available-height)"
          side="bottom"
        >
          <p className="font-mono whitespace-pre-wrap">{progress.status}</p>
          {progress?.progress !== undefined && (
            <Progress
              value={progress?.progress}
              max={100}
              className="w-full mt-2"
            />
          )}
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

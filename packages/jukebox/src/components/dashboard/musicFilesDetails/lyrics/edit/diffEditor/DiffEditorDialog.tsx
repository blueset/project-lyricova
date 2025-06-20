import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import { Button } from "@lyricova/components/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import DiffEditorTextarea from "./DiffEditorBox";
import diff from "fast-diff";
import {
  FURIGANA,
  Lyrics,
  LyricsLine,
  Range,
  RangeAttribute,
  RangeAttributeLabel,
  TIME_TAG,
  WordTimeTag,
  WordTimeTagLabel,
} from "lyrics-kit/core";

function applyDiff(source: string, edited: string): string {
  try {
    const sourceLyrics = new Lyrics(source);
    const editedLyrics = new Lyrics(edited);
    const sourceLines = sourceLyrics.lines;
    const editedLines = editedLyrics.lines;
    if (sourceLines.length !== editedLines.length) {
      throw new Error("Line count mismatch");
    }
    const result = new Lyrics();
    sourceLines.forEach((sourceLine, idx) => {
      const editedLine = editedLines[idx];
      const diffArr = diff(sourceLine.content, editedLine.content).reduce<
        diff.Diff[]
      >((prev, curr) => {
        if (curr[0] !== 1 || curr[1].indexOf("⏎") === -1) {
          prev.push(curr);
        } else {
          const lines = curr[1].split("⏎");
          for (let i = 0; i < lines.length; i++) {
            prev.push([curr[0], lines[i]]);
            if (i < lines.length - 1) {
              prev.push([1, "\n"]);
            }
          }
        }
        return prev;
      }, []);
      diffArr.push([0, "\0"]); // dummy diff to trigger EOL processing
      let resultLine = new LyricsLine("", sourceLine.position);
      let resultTimeTags: WordTimeTagLabel[] = [];
      let resultFurigana: RangeAttributeLabel[] = [];
      let resultDots: string[] = [];
      let resultTags: string[] = [];

      if (sourceLine.attachments.content) {
        resultLine.attachments.content = { ...sourceLine.attachments.content };
      }
      const timeTagQueue =
        sourceLine.attachments.content[TIME_TAG]?.tags || null;
      const furiganaQueue =
        sourceLine.attachments.content[FURIGANA]?.attachment || null;
      const dotsQueue =
        sourceLine.attachments
          .getTag("dots")
          ?.split(",")
          .map<[string, number]>((v, idx) => [v, idx]) || null;
      const tagsQueue =
        sourceLine.attachments
          .getTag("tags")
          ?.split(",")
          .map<[string, number]>((v, idx) => [v, idx]) || null;

      let ptr = 0; // ptr of the source string index
      let relativeTimeOffset = 0; // relative time offset for when line break happens
      const finalizeLine = () => {
        if (resultTimeTags.length > 0) {
          if ((timeTagQueue?.length ?? 0) > 0) {
            const eolTimeTag = new WordTimeTagLabel(
              timeTagQueue[0].timeTag,
              timeTagQueue[0].index + resultLine.content.length - ptr
            );
            resultTimeTags.push(eolTimeTag);
          }
          resultLine.attachments.content[TIME_TAG] = new WordTimeTag([
            ...resultTimeTags,
          ]);
          resultTimeTags = [];
        }
        if (resultFurigana.length > 0) {
          resultLine.attachments.content[FURIGANA] = new RangeAttribute(
            resultFurigana.map((v): [string, Range] => [v.content, v.range])
          );
          resultFurigana = [];
        }
        if (resultDots.length > 0) {
          if (resultDots.indexOf("-1") === -1) {
            resultDots[resultLine.content.length] = "-1";
          }
          resultLine.attachments.setTag("dots", resultDots.join(","));
          resultDots = [];
        }
        if (resultTags.length > 0) {
          resultLine.attachments.setTag("tags", resultTags.join(","));
          resultTags = [];
        }
        result.lines.push(resultLine);
        resultLine = new LyricsLine("", sourceLine.position);
      };

      for (const [op, text] of diffArr) {
        if (op === 0) {
          const baseOffset = resultLine.content.length - ptr;
          if (text !== "\0") resultLine.content += text;
          ptr += text.length;
          while (
            (timeTagQueue?.length ?? 0) > 0 &&
            timeTagQueue[0]?.index < ptr
          ) {
            const tag = timeTagQueue.shift();
            tag.index += baseOffset;
            tag.timeTag += relativeTimeOffset;
            resultTimeTags.push(tag);
          }
          while (
            (furiganaQueue?.length ?? 0) > 0 &&
            furiganaQueue[0]?.range[1] <= ptr
          ) {
            const tag = furiganaQueue.shift();
            tag.range[0] += baseOffset;
            tag.range[1] += baseOffset;
            resultFurigana.push(tag);
          }
          while ((dotsQueue?.length ?? 0) > 0 && dotsQueue[0][1] <= ptr) {
            resultDots.push(dotsQueue.shift()[0]);
          }
          while ((tagsQueue?.length ?? 0) > 0 && tagsQueue[0][1] <= ptr) {
            resultTags.push(tagsQueue.shift()[0]);
          }
        } else if (op === 1 && text !== "\n") {
          resultLine.content += text;
          for (let i = 0; i < text.length; i++) {
            resultDots.push("0");
            resultTags.push("");
          }
        } else if (op === 1 && text === "\n") {
          finalizeLine();
          resultLine.position =
            resultLine.position + (timeTagQueue?.[0]?.timeTag ?? 0.001);
          relativeTimeOffset -= timeTagQueue?.[0]?.timeTag ?? 0.001;
        } else if (op === -1) {
          ptr += text.length;
          while ((timeTagQueue?.[0]?.index ?? Infinity) < ptr)
            timeTagQueue.shift();
          while ((furiganaQueue?.[0]?.range[1] ?? Infinity) <= ptr)
            furiganaQueue.shift();
          while ((dotsQueue?.[0]?.[1] ?? Infinity) <= ptr) dotsQueue.shift();
          while ((tagsQueue?.[0]?.[1] ?? Infinity) <= ptr) tagsQueue.shift();
        }
      }

      finalizeLine();
    });
    return result.toString();
  } catch (e) {
    alert("Error: " + (e as Error).message);
    console.error(e);
    return source;
  }
}

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
}

export default function DiffEditorDialog({ isOpen, toggleOpen }: Props) {
  const [sourceValue, setSourceValue] = useState("");
  const [editedValue, setEditedValue] = useState("");

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        navigator.clipboard.writeText(editedValue);
      }
      toggleOpen(open);
    },
    [editedValue, toggleOpen]
  );

  useEffect(() => {
    if (isOpen) {
      const selectedText = window.getSelection()?.toString()?.trim() ?? "";
      setSourceValue(selectedText);
      setEditedValue(selectedText);
    }
  }, [isOpen]);

  const handleApplyDiff = useCallback(() => {
    setEditedValue(applyDiff(sourceValue, editedValue));
  }, [editedValue, sourceValue]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-auto grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Diff editor</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto -mr-6 pr-6">
          <div className="col-span-1">
            <DiffEditorTextarea
              title="Source"
              value={sourceValue}
              onChange={setSourceValue}
            />
          </div>
          <div className="col-span-1">
            <DiffEditorTextarea
              title="Edited"
              value={editedValue}
              onChange={setEditedValue}
              lineBreakButton
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="default" onClick={handleApplyDiff}>
            Apply Diff
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

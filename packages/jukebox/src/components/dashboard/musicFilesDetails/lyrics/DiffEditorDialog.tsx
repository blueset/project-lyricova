import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
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
  TRANSLATION,
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

      if (sourceLine.attachments.content[TRANSLATION]) {
        resultLine.attachments.content[TRANSLATION] =
          sourceLine.attachments.content[TRANSLATION];
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
          if (timeTagQueue.length > 0) {
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
          while (timeTagQueue.length > 0 && timeTagQueue[0]?.index < ptr) {
            const tag = timeTagQueue.shift();
            tag.index += baseOffset;
            tag.timeTag += relativeTimeOffset;
            resultTimeTags.push(tag);
          }
          while (
            furiganaQueue.length > 0 &&
            furiganaQueue[0]?.range[1] <= ptr
          ) {
            const tag = furiganaQueue.shift();
            tag.range[0] += baseOffset;
            tag.range[1] += baseOffset;
            resultFurigana.push(tag);
          }
          while (dotsQueue.length > 0 && dotsQueue[0][1] <= ptr) {
            resultDots.push(dotsQueue.shift()[0]);
          }
          while (tagsQueue.length > 0 && tagsQueue[0][1] <= ptr) {
            resultTags.push(tagsQueue.shift()[0]);
          }
        } else if (op === 1 && text !== "\n") {
          resultLine.content += text;
        } else if (op === 1 && text === "\n") {
          finalizeLine();
          resultLine.position =
            resultLine.position + (timeTagQueue?.[0]?.timeTag ?? 0.001);
          relativeTimeOffset -= timeTagQueue?.[0]?.timeTag ?? 0.001;
        } else if (op === -1) {
          ptr += text.length;
        }
      }

      finalizeLine();
    });
    return result.toString();
  } catch (e) {
    alert("Error: " + e.message);
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

  const handleClose = useCallback(() => {
    navigator.clipboard.writeText(editedValue);
    toggleOpen(false);
  }, [editedValue, toggleOpen]);

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
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
      scroll="paper"
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>Diff editor</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DiffEditorTextarea
              title="Source"
              value={sourceValue}
              onChange={setSourceValue}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DiffEditorTextarea
              title="Edited"
              value={editedValue}
              onChange={setEditedValue}
              lineBreakButton
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleApplyDiff}>
          Apply Diff
        </Button>
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { LyricsLine, RangeAttribute, FURIGANA } from "lyrics-kit/core";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef } from "react";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import _ from "lodash";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";

interface FloatingWindowProps {
  nodeIdx: number;
  start: number;
  end: number;
  top: number;
  left: number;
}

type RenderableFuriganaElement =
  | string
  | {
      base: string;
      value: string;
    };

interface Props {
  line: LyricsLine;
  setLine: (line: LyricsLine) => void;
}

export default function EditFuriganaLine({ line, setLine }: Props) {
  const [renderableFurigana, setRenderableFurigana] = useNamedState<
    RenderableFuriganaElement[]
  >([], "renderableFurigana");
  const [
    floatingWindow,
    setFloatingWindow,
  ] = useNamedState<FloatingWindowProps | null>(null, "floatingWindow");
  const [floatingWindowInput, setFloatingWindowInput] = useNamedState(
    "",
    "floatingWindowInput"
  );
  const lineContainerRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const result: RenderableFuriganaElement[] = [];
    const content = line.content;
    let i = 0;
    if (line?.attachments.content[FURIGANA]) {
      line.attachments.content[FURIGANA].attachment.forEach((elm) => {
        if (elm.range[0] > i) result.push(content.substring(i, elm.range[0]));
        result.push({
          base: content.substring(elm.range[0], elm.range[1]),
          value: elm.content,
        });
        i = elm.range[1];
      });
    }
    if (i < content.length) result.push(content.substring(i, content.length));
    setRenderableFurigana(result);
    setFloatingWindow(null);
    setFloatingWindowInput(null);
  }, [line, setFloatingWindow, setFloatingWindowInput, setRenderableFurigana]);

  const updateLine = useCallback(
    (rf?: RenderableFuriganaElement[]) => {
      const { tags } = (rf || renderableFurigana).reduce<{
        len: number;
        tags: [string, [number, number]][];
      }>(
        ({ len, tags }, value) => {
          if (typeof value === "string")
            return { len: len + value.length, tags };
          else {
            tags.push([value.value, [len, len + value.base.length]]);
            return { len: len + value.base.length, tags };
          }
        },
        { len: 0, tags: [] }
      );

      if (tags.length < 1) delete line.attachments.content[FURIGANA];
      else line.attachments.content[FURIGANA] = new RangeAttribute(tags);

      setLine(line);
    },
    [line, renderableFurigana, setLine]
  );

  const removeRange = useCallback(
    (idx: number) => () => {
      const self = renderableFurigana[idx];
      if (typeof self !== "object") return;
      const before = renderableFurigana[idx - 1],
        after = renderableFurigana[idx + 1];
      let result: RenderableFuriganaElement[];
      if (typeof before === "string" && typeof after === "string") {
        result = renderableFurigana
          .slice(0, idx - 1)
          .concat([before + self.base + after])
          .concat(renderableFurigana.slice(idx + 2, renderableFurigana.length));
      } else if (typeof before === "string") {
        result = renderableFurigana
          .slice(0, idx - 1)
          .concat([before + self.base])
          .concat(renderableFurigana.slice(idx + 1, renderableFurigana.length));
      } else if (typeof after === "string") {
        result = renderableFurigana
          .slice(0, idx)
          .concat([self.base + after])
          .concat(renderableFurigana.slice(idx + 2, renderableFurigana.length));
      } else {
        result = renderableFurigana
          .slice(0, idx)
          .concat([self.base])
          .concat(renderableFurigana.slice(idx + 1, renderableFurigana.length));
      }
      setRenderableFurigana(result);
      updateLine(result);
    },
    [renderableFurigana, setRenderableFurigana, updateLine]
  );

  const addFurigana = useCallback(
    (nodeIdx: number, start: number, end: number, value: string) => {
      const node = renderableFurigana[nodeIdx];
      if (typeof node !== "string") return;
      const before = node.substring(0, start),
        base = node.substring(start, end),
        after = node.substring(end, node.length);
      let result = renderableFurigana.slice(0, nodeIdx);
      if (before) result.push(before);
      result.push({ base, value });
      if (after) result.push(after);
      result = result.concat(
        renderableFurigana.slice(nodeIdx + 1, renderableFurigana.length)
      );
      setRenderableFurigana(result);
      updateLine(result);
    },
    [renderableFurigana, setRenderableFurigana, updateLine]
  );

  const onSelect = useCallback(() => {
    const selection = document.getSelection();
    const trigger =
      selection.anchorNode &&
      selection.focusNode &&
      selection.anchorNode === selection.focusNode &&
      selection.toString().length > 0 &&
      lineContainerRef.current &&
      lineContainerRef.current.contains(selection.anchorNode);
    if (!trigger) return;
    const show =
      selection.anchorNode.parentElement &&
      selection.anchorNode.parentElement.dataset.furiganaCreatable === "true" &&
      selection.rangeCount > 0;

    if (show) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const id = parseInt(selection.anchorNode.parentElement.dataset.index);
      const start = Math.min(selection.anchorOffset, selection.focusOffset),
        end = Math.max(selection.anchorOffset, selection.focusOffset);
      setFloatingWindow({
        nodeIdx: id,
        start,
        end,
        top: rect.top + rect.height,
        left: rect.left,
      });
    } else {
      setFloatingWindow(null);
      setFloatingWindowInput("");
    }
  }, [setFloatingWindow, setFloatingWindowInput]);

  useEffect(() => {
    const debounced = _.debounce(onSelect, 250);
    document.addEventListener("selectionchange", debounced);
    return () => {
      document.removeEventListener("selectionchange", debounced);
    };
  }, [onSelect]);

  const handleFloatingInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFloatingWindowInput(event.target.value);
    },
    [setFloatingWindowInput]
  );

  const handleFloatingInputConfirm = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!floatingWindow) return;
      if (!floatingWindowInput) return;
      const { nodeIdx, start, end } = floatingWindow;
      addFurigana(nodeIdx, start, end, floatingWindowInput);
      setFloatingWindow(null);
      setFloatingWindowInput("");
    },
    [
      addFurigana,
      floatingWindow,
      floatingWindowInput,
      setFloatingWindow,
      setFloatingWindowInput,
    ]
  );

  return (
    <div>
      <Typography variant="h4" component="div" ref={lineContainerRef}>
        {renderableFurigana.map((v, idx) => {
          if (typeof v === "string")
            return (
              <span key={idx} data-index={idx} data-furigana-creatable={true}>
                {v}
              </span>
            );
          else
            return (
              <Box
                component="span"
                key={idx}
                data-index={idx}
                sx={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  "& > ruby": {
                    display: "inline-block",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    padding: 0.5,
                    marginTop: 0.5,
                    marginBottom: 0.5,
                  },
                  "& > button": {
                    visibility: "hidden",
                  },
                  "&:hover > button, &:focus > button": {
                    visibility: "visible",
                  },
                }}
              >
                <ruby>
                  {v.base}
                  <rt>{v.value}</rt>
                </ruby>
                <IconButton
                  size="small"
                  onClick={removeRange(idx)}
                  color="primary"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            );
        })}
      </Typography>
      {floatingWindow && (
        <Paper
          style={{ top: floatingWindow.top, left: floatingWindow.left }}
          sx={{
            position: "fixed",
            width: "fit-content",
            zIndex: 1500,
          }}
          elevation={5}
        >
          <form
            onSubmit={handleFloatingInputConfirm}
            style={{ display: "flex", alignItems: "center" }}
          >
            <TextField
              id="outlined-multiline-flexible"
              label={(renderableFurigana[
                floatingWindow.nodeIdx
              ] as string).slice(floatingWindow.start, floatingWindow.end)}
              value={floatingWindowInput}
              onChange={handleFloatingInputChange}
              margin="dense"
              variant="outlined"
            />
            <IconButton type="submit" disabled={!floatingWindowInput}>
              <CheckIcon />
            </IconButton>
            <IconButton onClick={() => setFloatingWindow(null)}>
              <CloseIcon />
            </IconButton>
          </form>
        </Paper>
      )}
    </div>
  );
}

import type { LyricsLine } from "lyrics-kit/core";
import { FURIGANA } from "lyrics-kit/core";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNamedState } from "../../../../../hooks/useNamedState";
import _ from "lodash";
import { X, Check } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import { Input } from "@lyricova/components/components/ui/input";
import { Label } from "@lyricova/components/components/ui/label";
import { cn } from "@lyricova/components/utils";
import {
  Dialog,
  DialogTitle,
  DialogPlainContent,
  DialogPortal,
} from "@lyricova/components/components/ui/dialog";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

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

export default function EditFuriganaLine() {
  const { line, addFuriganaToSelectedLine, removeFuriganaFromSelectedLine } =
    useLyricsStore(
      useShallow((state) => {
        return {
          line: state.lyrics?.lines[state.furigana.selectedLine],
          addFuriganaToSelectedLine: state.furigana.addFuriganaToSelectedLine,
          removeFuriganaFromSelectedLine:
            state.furigana.removeFuriganaFromSelectedLine,
        };
      })
    );
  const renderableFurigana = useMemo(() => {
    const renderableFurigana: RenderableFuriganaElement[] = [];
    if (line) {
      const content = line.content;
      let i = 0;
      if (line?.attachments?.[FURIGANA]) {
        line.attachments[FURIGANA].attachment.forEach((elm) => {
          if (elm.range[0] > i)
            renderableFurigana.push(content.substring(i, elm.range[0]));
          renderableFurigana.push({
            base: content.substring(elm.range[0], elm.range[1]),
            value: elm.content,
          });
          i = elm.range[1];
        });
      }
      if (i < content.length)
        renderableFurigana.push(content.substring(i, content.length));
    }
    return renderableFurigana;
  }, [line]);

  const [floatingWindow, setFloatingWindow] =
    useNamedState<FloatingWindowProps | null>(null, "floatingWindow");
  const [floatingWindowInput, setFloatingWindowInput] = useNamedState(
    "",
    "floatingWindowInput"
  );
  const lineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFloatingWindow(null);
    setFloatingWindowInput("");
  }, [line, setFloatingWindow, setFloatingWindowInput]);

  const addFurigana = useCallback(
    (nodeIdx: number, start: number, end: number, value: string) => {
      const node = renderableFurigana[nodeIdx];
      if (typeof node !== "string") return;
      const offset = renderableFurigana
        .slice(0, nodeIdx)
        .reduce((acc, value) => {
          if (typeof value === "string") return acc + value.length;
          else return acc + value.base.length;
        }, 0);
      addFuriganaToSelectedLine(offset + start, offset + end, value);
    },
    [addFuriganaToSelectedLine, renderableFurigana]
  );

  const onSelect = useCallback(() => {
    const selection = document.getSelection();
    const trigger =
      selection?.anchorNode &&
      selection.focusNode &&
      selection.anchorNode === selection.focusNode &&
      selection.toString().length > 0 &&
      lineContainerRef.current &&
      lineContainerRef.current.contains(selection.anchorNode);
    if (!trigger) return;

    const parentElement = selection.anchorNode?.parentElement;
    const show =
      parentElement &&
      parentElement.dataset.furiganaCreatable === "true" &&
      selection.rangeCount > 0;

    if (show && parentElement.dataset.index) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const id = parseInt(parentElement.dataset.index, 10);
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

  const removeRange = useCallback(
    (idx: number) => () => {
      const self = renderableFurigana[idx];
      if (typeof self !== "object") return;
      const start = renderableFurigana.slice(0, idx).reduce((acc, value) => {
        if (typeof value === "string") return acc + value.length;
        else return acc + value.base.length;
      }, 0);
      const end = start + self.base.length;
      removeFuriganaFromSelectedLine(start, end);
      onSelect();
    },
    [onSelect, removeFuriganaFromSelectedLine, renderableFurigana]
  );

  useEffect(() => {
    const debounced = _.debounce(onSelect, 250);
    document.addEventListener("selectionchange", debounced);
    return () => {
      document.removeEventListener("selectionchange", debounced);
      debounced.cancel();
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
      if (!floatingWindow || !floatingWindowInput) return;
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

  const floatingWindowBaseText = floatingWindow
    ? (renderableFurigana[floatingWindow.nodeIdx] as string)?.slice?.(
        floatingWindow.start,
        floatingWindow.end
      ) ?? "❓"
    : "";

  return (
    <div>
      <div className="font-medium text-3xl" ref={lineContainerRef}>
        {renderableFurigana.map((v, idx) => {
          if (typeof v === "string")
            return (
              <span key={idx} data-index={idx} data-furigana-creatable={true}>
                {v}
              </span>
            );
          else
            return (
              <span
                key={idx}
                data-index={idx}
                className={cn(
                  "group inline-flex flex-col items-center",
                  "focus-within:outline-none"
                )}
              >
                <ruby
                  className={cn(
                    "my-0.5 p-0.5 border border-border rounded",
                    "text-center"
                  )}
                >
                  {v.base}
                  <rt className="text-xs">{v.value}</rt>{" "}
                  {/* Adjusted rt size */}
                </ruby>
                <Button
                  variant="ghost"
                  size="icon"
                  className="invisible group-focus-within:visible group-hover:visible w-6 h-6"
                  onClick={removeRange(idx)}
                  aria-label={`Remove furigana for ${v.base}`}
                >
                  <X />
                </Button>
              </span>
            );
        })}
      </div>
      <Dialog open={!!floatingWindow} modal={false}>
        <DialogPortal>
          <DialogPlainContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[1500] fixed shadow-lg p-2 w-fit translate-0 pointer-events-auto"
            style={{ top: floatingWindow?.top, left: floatingWindow?.left }}
          >
            <DialogTitle className="sr-only">Edit Furigana</DialogTitle>
            <form
              onSubmit={handleFloatingInputConfirm}
              className="flex items-center"
            >
              <div className="flex flex-col">
                <Label
                  htmlFor="furigana-input"
                  className="px-1 text-muted-foreground text-xs"
                >
                  {floatingWindowBaseText}
                </Label>
                <Input
                  id="furigana-input"
                  value={floatingWindowInput}
                  onChange={handleFloatingInputChange}
                  className="h-8"
                />
              </div>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={!floatingWindowInput}
                className="w-8 h-8"
                aria-label="Confirm furigana"
              >
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFloatingWindow(null)}
                className="w-8 h-8"
                aria-label="Cancel furigana input"
              >
                <X />
              </Button>
            </form>
          </DialogPlainContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

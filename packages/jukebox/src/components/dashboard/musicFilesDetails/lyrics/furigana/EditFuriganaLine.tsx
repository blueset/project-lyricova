import type { LyricsLine } from "lyrics-kit/core";
import { RangeAttribute, FURIGANA } from "lyrics-kit/core";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
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
import { codeToFuriganaGroups } from "./ApplyAllFurigana";

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

function sanitizeSequence(
  sequence: RenderableFuriganaElement[]
): RenderableFuriganaElement[] {
  return sequence.reduce<RenderableFuriganaElement[]>((acc, value) => {
    if (acc.length === 0) {
      acc.push(value);
    } else {
      const last = acc[acc.length - 1];
      if (typeof last === "string" && typeof value === "string") {
        acc[acc.length - 1] = last + value;
      } else {
        acc.push(value);
      }
    }
    return acc;
  }, []);
}

interface Props {
  line: LyricsLine;
  setLine: (line: LyricsLine) => void;
}

export default function EditFuriganaLine({ line, setLine }: Props) {
  const [renderableFurigana, setRenderableFurigana] = useNamedState<
    RenderableFuriganaElement[]
  >([], "renderableFurigana");
  const [floatingWindow, setFloatingWindow] =
    useNamedState<FloatingWindowProps | null>(null, "floatingWindow");
  const [floatingWindowInput, setFloatingWindowInput] = useNamedState(
    "",
    "floatingWindowInput"
  );
  const lineContainerRef = useRef<HTMLDivElement>(null);

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
    setFloatingWindowInput("");
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

  const addFurigana = useCallback(
    (nodeIdx: number, start: number, end: number, value: string) => {
      const node = renderableFurigana[nodeIdx];
      if (typeof node !== "string") return;
      const before = node.substring(0, start),
        base = node.substring(start, end),
        after = node.substring(end, node.length);
      let result = renderableFurigana.slice(0, nodeIdx);
      if (before) result.push(before);

      if (base.length > 1 && (value.includes(",") || value.includes(";"))) {
        const processedSequence = codeToFuriganaGroups(base, value);
        result = result.concat(
          processedSequence.map((v) => {
            if (typeof v === "string") return v;
            else return { base: v[0], value: v[1] };
          })
        );
      } else {
        result.push({ base, value });
      }

      if (after) result.push(after);
      result = result.concat(
        renderableFurigana.slice(nodeIdx + 1, renderableFurigana.length)
      );
      result = sanitizeSequence(result);
      setRenderableFurigana(result);
      updateLine(result);
    },
    [renderableFurigana, setRenderableFurigana, updateLine]
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
      result = sanitizeSequence(result);
      setRenderableFurigana(result);
      updateLine(result);
      onSelect();
    },
    [onSelect, renderableFurigana, setRenderableFurigana, updateLine]
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

  const floatingWindowBaseText = floatingWindow
    ? (renderableFurigana[floatingWindow.nodeIdx] as string)?.slice?.(
        floatingWindow.start,
        floatingWindow.end
      ) ?? "❓"
    : "";

  return (
    <div>
      <div className="text-3xl font-medium" ref={lineContainerRef}>
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
                    "border border-border rounded p-0.5 my-0.5",
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
                  className="invisible group-hover:visible group-focus-within:visible h-6 w-6"
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
            className="fixed z-[1500] w-fit shadow-lg p-2 pointer-events-auto translate-0"
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
                  className="text-xs text-muted-foreground px-1"
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
                className="h-8 w-8"
                aria-label="Confirm furigana"
              >
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFloatingWindow(null)}
                className="h-8 w-8"
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

import { Textarea } from "@lyricova/components/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import { Button } from "@lyricova/components/components/ui/button";
import { CornerDownLeft } from "lucide-react";
import { createRef, useMemo, useState } from "react";
import { FURIGANA, Lyrics, LyricsLine, TIME_TAG } from "lyrics-kit/core";
import { cn } from "@lyricova/components/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyricova/components/components/ui/tabs";

function PreviewLine({ line }: { line: LyricsLine }) {
  const rubyGroups = useMemo((): [string, string | null, number][] => {
    const furigana = line?.attachments?.content?.[FURIGANA]?.attachment;
    if (!furigana) {
      return [[line.content, null, 0]];
    }
    const groups: [string, string | null, number][] = [];
    let ptr = 0;
    for (const label of furigana) {
      const prev = line.content.slice(ptr, label.range[0]);
      if (prev) groups.push([prev, null, ptr]);
      groups.push([
        line.content.slice(label.range[0], label.range[1]),
        label.content,
        label.range[0],
      ]);
      ptr = label.range[1];
    }
    const last = line.content.slice(ptr);
    if (last) groups.push([last, null, ptr]);
    return groups;
  }, [line]);
  const hasTagMapping = useMemo(() => {
    return new Set([
      ...(line.attachments?.content?.[TIME_TAG]?.tags ?? []).map(
        (t) => t.index
      ),
    ]);
  }, [line]);
  return (
    <div>
      {rubyGroups.map(([base, ruby, count]) => {
        const baseElm = [...base].map((v, idx) => (
          <span
            key={idx}
            className={cn(
              "border-secondary",
              hasTagMapping.has(idx + count) && "border-s"
            )}
          >
            {v}
          </span>
        ));
        return ruby ? (
          <ruby key={count}>
            {baseElm}
            <rt>{ruby}</rt>
          </ruby>
        ) : (
          <span key={count}>{baseElm}</span>
        );
      })}
      {hasTagMapping.has(line.content.length) && (
        <span
          className={cn(
            "border-secondary border-s text-muted-foreground opacity-50"
          )}
        >
          ¶
        </span>
      )}
    </div>
  );
}

interface Props {
  title: string;
  value: string;
  lineBreakButton?: boolean;
  onChange: (value: string) => void;
}

export default function DiffEditorTextarea({
  title,
  value,
  lineBreakButton,
  onChange,
}: Props) {
  const [panel, setPanel] = useState<string>("edit");
  const textfieldRef = createRef<HTMLTextAreaElement>();

  const lyricsObj = useMemo(() => {
    try {
      return new Lyrics(value);
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div className="flex flex-col space-y-2 h-full">
      <Tabs value={panel} onValueChange={setPanel} className="w-full">
        <div className="flex flex-row items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
          <span className="text-xs font-medium tracking-wider uppercase inline-block">
            {title}
          </span>
          <div className="flex flex-row gap-2">
            {lineBreakButton && panel === "edit" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Insert line break (⏎)"
                    onClick={() => {
                      const elm = textfieldRef.current;
                      if (!elm) return;
                      const start = elm.selectionStart;
                      const end = elm.selectionEnd;
                      elm.setRangeText("⏎", start, end, "end");
                      onChange(elm.value);
                      elm.focus();
                    }}
                  >
                    <CornerDownLeft />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insert line break (⏎)</TooltipContent>
              </Tooltip>
            )}
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="edit">
          <Textarea
            className="w-full font-mono flex-grow resize-none" // Added flex-grow and resize-none
            ref={textfieldRef}
            autoResize
            value={value || ""}
            onChange={(evt) => onChange(evt.target.value)}
            lang="ja"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="flex-grow overflow-auto">
            {" "}
            {/* Added flex-grow and overflow-auto */}
            {lyricsObj?.lines.map((l, idx) => (
              <PreviewLine key={idx} line={l} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

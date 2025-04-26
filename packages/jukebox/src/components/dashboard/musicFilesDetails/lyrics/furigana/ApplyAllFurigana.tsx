import { CopyCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@lyricova/components/components/ui/button";
import { Input } from "@lyricova/components/components/ui/input";
import { Label } from "@lyricova/components/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { useNamedState } from "../../../../../hooks/useNamedState";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";
import { codeToFuriganaGroups } from "../state/furiganaSlice";

type FuriganaGroup = string | [string, string];

function furiganaGroupsToCode(furiganaGroups: FuriganaGroup[]): {
  baseText: string;
  furiganaText: string;
} {
  let baseText = "";
  const furiganas: string[] = [];

  for (const group of furiganaGroups) {
    if (Array.isArray(group)) {
      const [base, furigana] = group;
      baseText += base;
      furiganas.push(furigana + ";".repeat([...base].length - 1));
    } else {
      baseText += group;
      [...group].forEach(() => furiganas.push(""));
    }
  }

  return { baseText, furiganaText: furiganas.join(",") };
}

function furiganaFromDom(elm: Node): FuriganaGroup[] {
  const result: FuriganaGroup[] = [];
  const walker = document.createTreeWalker(
    elm,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  let currentNode: Node | null = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof Text) {
      if (result.length > 0 && typeof result[result.length - 1] === "string") {
        result[result.length - 1] += currentNode.textContent;
      } else {
        result.push(currentNode.textContent);
      }
    } else if (currentNode instanceof HTMLElement) {
      if (currentNode.nodeName === "RUBY") {
        console.log("Found ruby", currentNode);
        const rts = currentNode.querySelectorAll("rt");
        rts.forEach((rt) => {
          const furigana = rt.textContent;
          if (!furigana) return;
          let baseNode = rt.previousSibling;
          while (baseNode && !(baseNode instanceof Text)) {
            baseNode = baseNode.previousSibling;
          }
          if (!baseNode || !(baseNode instanceof Text)) return;
          const base = baseNode.textContent;
          if (base) {
            result.push([base, furigana]);
          }
        });
        if (rts.length > 0) {
          let lastNode = rts[rts.length - 1].nextSibling;
          while (lastNode) {
            if (
              result.length > 0 &&
              typeof result[result.length - 1] === "string"
            ) {
              result[result.length - 1] += lastNode.textContent;
            } else {
              result.push(lastNode.textContent);
            }
            lastNode = lastNode.nextSibling;
          }
        }
        currentNode = walker.nextSibling();
        continue;
      }
    }
    currentNode = walker.nextNode();
  }

  return result.map((v) => {
    if (typeof v === "string") {
      return v.replace(/\n+/g, "");
    } else {
      return [v[0].replace(/\n+/g, ""), v[1].replace(/\n+/g, "")];
    }
  });
}

export function ApplyAllFurigana() {
  const { applyPatternToAllLines } = useLyricsStore(
    useShallow((state) => ({
      applyPatternToAllLines: state.furigana.applyPatternToAllLines,
    }))
  );
  const [baseText, setBaseText] = useNamedState<string>("", "baseText");
  const [furiganaText, setFuriganaText] = useNamedState<string>(
    "",
    "furiganaText"
  );
  const [isOpen, setIsOpen] = useState(false);

  const furiganaGroups = useMemo(() => {
    return codeToFuriganaGroups(baseText, furiganaText);
  }, [baseText, furiganaText]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (!event.clipboardData.types.includes("text/html")) return;
      const html = event.clipboardData.getData("text/html");
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      if (!doc.querySelector("ruby")) return;
      const groups = furiganaFromDom(doc.body);
      const { baseText, furiganaText } = furiganaGroupsToCode(groups);
      setBaseText(baseText);
      setFuriganaText(furiganaText);
      event.preventDefault();
      event.stopPropagation();
    },
    [setBaseText, setFuriganaText]
  );

  const handleApply = useCallback(() => {
    applyPatternToAllLines(baseText, furiganaText);
  }, [applyPatternToAllLines, baseText, furiganaText]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost">
                <CopyCheck />{" "}
                <span className="hidden md:inline">Apply all</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Apply pattern to all lines</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-4 space-y-4">
        <div className="text-center text-2xl">
          {furiganaGroups.map((group, index) =>
            Array.isArray(group) ? (
              <ruby key={index} className="border-x border-solid">
                {group[0]}
                <rt>{group[1]}</rt>
              </ruby>
            ) : (
              <span key={index}>{group}</span>
            )
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="baseText">Base text</Label>
          <Input
            id="baseText"
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            placeholder="VOCALOIDが大好き"
            onPaste={handlePaste}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="furiganaText">Furigana text</Label>
          <Input
            id="furiganaText"
            value={furiganaText}
            onChange={(e) => setFuriganaText(e.target.value)}
            placeholder="ボー;,カ;,ロ;,イ,ド,,だい,す,"
            onPaste={handlePaste}
          />
        </div>
        <Button size="sm" onClick={handleApply}>
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}

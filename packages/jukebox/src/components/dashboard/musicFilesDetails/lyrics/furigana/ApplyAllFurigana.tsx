import { CopyCheck } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  FURIGANA,
  LyricsLine,
  RangeAttribute,
  RangeAttributeLabel,
} from "lyrics-kit/core";

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

type FuriganaGroup = string | [string, string];

/**
 * @example
 * baseText: "VOCALOIDが大好き"
 * furiganaText: "ボー;,カ;,ロ;,イ,ド,,だい,す,"
 * result: [["VO", "ボー"], ["CA", "カ"], ["LO", "ロ"], ["I", "イ"], ["D", "ド"], "が", ["大", "だい"], ["好", "す"], "き"]
 *
 * Constraints:
 * furiganaText matches /^.*(;*,.*)*$/
 * furiganaText.count(";") + furiganaText.count(",") == [...baseText].length - 1
 */
export function codeToFuriganaGroups(
  baseText: string,
  furiganaText: string
): FuriganaGroup[] {
  const result: FuriganaGroup[] = [];

  if (baseText && furiganaText) {
    // Split the furiganaText into segments by commas
    const segments = furiganaText.split(",");

    let baseIndex = 0;

    for (let i = 0; i < segments.length && baseIndex < baseText.length; i++) {
      const segment = segments[i];

      if (segment === "") {
        // Empty segment means no furigana for this character
        result.push(baseText[baseIndex]);
        baseIndex++;
      } else {
        // Count semicolons to determine group size
        const semicolonCount = (segment.match(/;/g) || []).length;
        // Remove semicolons to get the actual furigana
        const furigana = segment.replace(/;/g, "");

        // Calculate how many characters to group together
        const groupSize = semicolonCount + 1; // +1 for the current character

        // Extract the base group from baseText
        const baseGroup = baseText.substring(baseIndex, baseIndex + groupSize);

        // Add the [baseGroup, furigana] pair to the result
        result.push([baseGroup, furigana]);

        // Move index forward by the group size
        baseIndex += groupSize;
      }
    }

    // Add any remaining characters from baseText
    if (baseIndex < baseText.length) {
      result.push(baseText.substring(baseIndex));
    }
  } else if (baseText) {
    result.push(baseText);
  }

  return result;
}

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

export function ApplyAllFurigana({
  setLines,
}: {
  setLines: Dispatch<SetStateAction<LyricsLine[]>>;
}) {
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
    if (!baseText || !furiganaText) return;
    const groups = codeToFuriganaGroups(baseText, furiganaText);
    setLines((lines) =>
      lines.map((line) => {
        const matches: number[] = [];
        let matchIdx = line.content.indexOf(baseText);
        while (matchIdx !== -1) {
          matches.push(matchIdx);
          matchIdx = line.content.indexOf(baseText, matchIdx + 1);
        }
        if (matches.length < 1) return line;
        let furiganaAttribute =
          line?.attachments?.content?.[FURIGANA]?.attachment || [];

        // Filter and adjust existing ranges
        furiganaAttribute = furiganaAttribute.filter((label) => {
          const [labelStart, labelEnd] = label.range;

          // Check against all match ranges
          for (const matchStart of matches) {
            const matchEnd = matchStart + [...baseText].length;
            // Full overlap - remove the label
            if (matchStart <= labelStart && matchEnd >= labelEnd) {
              return false;
            }

            // Partial overlap from left - adjust start
            if (
              matchStart <= labelStart &&
              matchEnd > labelStart &&
              matchEnd < labelEnd
            ) {
              label.range[0] = matchEnd;
              return true;
            }

            // Partial overlap from right - adjust end
            if (
              matchStart > labelStart &&
              matchStart < labelEnd &&
              matchEnd >= labelEnd
            ) {
              label.range[1] = matchStart;
              return true;
            }
          }
          return true;
        });

        // Add new furigana ranges for each match
        matches.forEach((start) => {
          let pos = start;
          groups.forEach((group) => {
            if (Array.isArray(group)) {
              furiganaAttribute.push(
                new RangeAttributeLabel(group[1], [
                  pos,
                  pos + [...group[0]].length,
                ])
              );
              pos += [...group[0]].length;
            } else {
              pos += [...group].length;
            }
          });
        });

        if (furiganaAttribute.length > 0) {
          furiganaAttribute.sort((a, b) => {
            const [aStart] = a.range;
            const [bStart] = b.range;
            return aStart - bStart;
          });
          line.attachments.content[FURIGANA] = new RangeAttribute(
            furiganaAttribute.map((l): [string, [number, number]] => [
              l.content,
              l.range,
            ])
          );
        } else {
          delete line.attachments.content[FURIGANA];
        }
        return line;
      })
    );
    setIsOpen(false);
  }, [baseText, furiganaText, setLines]);

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

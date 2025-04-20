// filepath: /workspaces/packages/jukebox/src/components/dashboard/musicFilesDetails/lyrics/furigana/FuriganaLineButton.tsx
import { memo } from "react";
import { FURIGANA, LyricsLine } from "lyrics-kit/core";
import { CheckSquare } from "lucide-react";
import FuriganaLyricsLine from "../../../../FuriganaLyricsLine";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { cn } from "@lyricova/components/utils";
import { furiganaHighlight } from "./furiganaHighlights";

interface FuriganaLineButtonProps {
  line: LyricsLine;
  idx: number;
  selectedLine: number | null;
  setSelectedLine: (idx: number) => void;
  romajiMatching: [number, string][][];
  applyFuriganaToAll: (idx: number) => () => void;
}

export const FuriganaLineButton = memo(
  function FuriganaLineButton({
    line,
    idx,
    selectedLine,
    setSelectedLine,
    romajiMatching,
    applyFuriganaToAll,
  }: FuriganaLineButtonProps) {
    return (
      <div className="group relative">
        <button
          className={cn(
            "w-full text-left px-3 py-2 rounded-md transition-colors hover:bg-muted/50",
            selectedLine === idx && "bg-muted"
          )}
          onClick={() => setSelectedLine(idx)}
        >
          <div lang="ja" className="text-3xl min-h-12 mr-8">
            <div className="flex flex-row flex-wrap items-end-safe">
              <FuriganaLyricsLine
                lyricsKitLine={line}
                rubyStyles={furiganaHighlight()}
              />
            </div>
            {romajiMatching[idx] && (
              <div className="text-sm">
                {romajiMatching[idx].map(([i, text], idx) => (
                  <span
                    key={idx}
                    lang="ja"
                    className={cn(
                      i < 0 && "line-through text-error-foreground",
                      i === 0 && "text-muted-foreground",
                      i > 0 && "text-success-foreground"
                    )}
                  >
                    {text}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={applyFuriganaToAll(idx)}
              >
                <CheckSquare />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Apply furigana to all identical lines
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prevIsSelected = prevProps.selectedLine === prevProps.idx;
    const nextIsSelected = nextProps.selectedLine === nextProps.idx;
    if (
      prevIsSelected !== nextIsSelected ||
      prevProps.romajiMatching[prevProps.idx] !==
        nextProps.romajiMatching[nextProps.idx] ||
      prevProps.applyFuriganaToAll !== nextProps.applyFuriganaToAll ||
      prevProps.setSelectedLine !== nextProps.setSelectedLine ||
      prevProps.line.content !== nextProps.line.content ||
      !!prevProps?.line?.attachments?.content[FURIGANA] !==
        !!nextProps?.line?.attachments?.content[FURIGANA]
    ) {
      return false;
    }
    const prevFurigana =
      prevProps.line.attachments?.content[FURIGANA]?.attachment;
    const nextFurigana =
      nextProps.line.attachments?.content[FURIGANA]?.attachment;
    if (prevFurigana && nextFurigana) {
      if (prevFurigana.length !== nextFurigana.length) {
        return false;
      }
      for (let i = 0; i < prevFurigana.length; i++) {
        if (
          prevFurigana[i].content !== nextFurigana[i].content ||
          prevFurigana[i].range[0] !== nextFurigana[i].range[0] ||
          prevFurigana[i].range[1] !== nextFurigana[i].range[1]
        ) {
          return false;
        }
      }
    }
    return true;
  }
);

export default FuriganaLineButton;

import { memo } from "react";
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
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

interface FuriganaLineButtonProps {
  idx: number;
}

const furiganaHighlighter = furiganaHighlight();

export const FuriganaLineButton = memo(
  function FuriganaLineButton({ idx }: FuriganaLineButtonProps) {
    const {
      romajiMatchingLine,
      line,
      isSelected,
      setSelectedLine,
      applyIdenticalFurigana,
    } = useLyricsStore(
      useShallow((state) => ({
        line: state.lyrics?.lines[idx],
        romajiMatchingLine: state.furigana.romajiMatching[idx],
        isSelected: state.furigana.selectedLine == idx,
        setSelectedLine: state.furigana.setSelectedLine,
        applyIdenticalFurigana: state.furigana.applyIdenticalFurigana,
      }))
    );
    // console.log("romajiMatchingLine", romajiMatchingLine);
    return (
      <div className="group relative">
        <button
          className={cn(
            "hover:bg-muted/50 px-3 py-2 rounded-md w-full text-left transition-colors",
            isSelected && "bg-muted"
          )}
          onClick={() => setSelectedLine(idx)}
        >
          <div lang="ja" className="mr-8 min-h-12 text-3xl">
            <div className="flex flex-row flex-wrap items-end-safe">
              <FuriganaLyricsLine
                lyricsKitJsonLine={line}
                rubyStyles={furiganaHighlighter}
              />
            </div>
            {romajiMatchingLine && (
              <div className="text-sm">
                {romajiMatchingLine.map(([i, text], idx) => (
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
        <div className="top-1/2 right-2 absolute opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1/2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyIdenticalFurigana(idx)}
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
    return prevProps.idx === nextProps.idx;
  }
);

export default FuriganaLineButton;

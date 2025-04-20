import type { Verse } from "@lyricova/api/graphql/types";
import classes from "./OtherVerse.module.scss";
import { VerseRenderer } from "./VerseRenderer";
import { Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";

interface OtherVerseProps {
  verse: Verse;
}

export function OtherVerse({ verse }: OtherVerseProps) {
  return (
    <div
      className={`container verticalPadding ${classes.verse}`}
      lang={verse.language}
    >
      <h2 className={classes.verseTitle}>
        {verse.language}{" "}
        {verse.isOriginal && (
          <Tooltip>
            <TooltipTrigger>
              <Star className="align-text-bottom size-3" />
            </TooltipTrigger>
            <TooltipContent side="top">Original</TooltipContent>
          </Tooltip>
        )}
      </h2>
      <div>
        <VerseRenderer verse={verse} />
      </div>
      {verse.translator && <cite>Translation by {verse.translator}</cite>}
    </div>
  );
}

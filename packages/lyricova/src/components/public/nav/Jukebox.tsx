import { jukeboxUrl } from "../../../utils/consts";
import { AudioLines } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";

export function Jukebox() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghostBright" size="icon" asChild>
          <a href={jukeboxUrl} data-nav-icon="jukebox">
            <AudioLines />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Jukebox</TooltipContent>
    </Tooltip>
  );
}

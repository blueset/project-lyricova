import { Wallpaper } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Link } from "../Link";

export function Screensavers() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghostBright" size="icon" asChild>
          <Link href="/screensavers" data-nav-icon="screensavers">
            <Wallpaper />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Screensavers</TooltipContent>
    </Tooltip>
  );
}

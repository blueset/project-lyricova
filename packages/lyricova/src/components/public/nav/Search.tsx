import { Search as SearchIcon } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Link } from "../Link";

export function Search() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghostBright" size="icon" asChild>
          <Link href="/search" data-nav-icon="search">
            <SearchIcon />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Search</TooltipContent>
    </Tooltip>
  );
}

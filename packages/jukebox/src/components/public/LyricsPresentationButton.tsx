import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import {
  Maximize,
  Minimize,
  MoreVertical,
  PanelTopOpen,
  PictureInPicture2,
} from "lucide-react";
import TooltipIconButton from "@/components/dashboard/TooltipIconButton";

export type LyricsPresentationMode =
  | "normal"
  | "fullscreen"
  | "pictureInPicture";

interface LyricsPresentationButtonProps {
  isDocumentPictureInPictureOpening: boolean;
  isDocumentPictureInPictureSupported: boolean;
  mode: LyricsPresentationMode;
  onEnterDocumentPictureInPicture: () => void;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  onReturnToMainWindow: () => void;
}

export function LyricsPresentationButton({
  isDocumentPictureInPictureOpening,
  isDocumentPictureInPictureSupported,
  mode,
  onEnterDocumentPictureInPicture,
  onEnterFullscreen,
  onExitFullscreen,
  onReturnToMainWindow,
}: LyricsPresentationButtonProps) {
  if (mode === "fullscreen") {
    return (
      <TooltipIconButton
        title="Exit Fullscreen"
        aria-label="Exit Fullscreen"
        variant="ghostBright"
        onClick={onExitFullscreen}
      >
        <Minimize />
      </TooltipIconButton>
    );
  }

  if (mode === "pictureInPicture") {
    return (
      <Button
        title="Return to main window"
        aria-label="Return to main window"
        variant="ghostBright"
        size="icon"
        onClick={onReturnToMainWindow}
      >
        <PanelTopOpen />
      </Button>
    );
  }

  if (!isDocumentPictureInPictureSupported) {
    return (
      <TooltipIconButton
        title="Fullscreen"
        aria-label="Fullscreen"
        variant="ghostBright"
        onClick={onEnterFullscreen}
      >
        <Maximize />
      </TooltipIconButton>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghostBright"
              size="icon"
              aria-label="Lyrics display options"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Lyrics display options</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEnterFullscreen}>
          <Maximize />
          Enter full screen
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isDocumentPictureInPictureOpening}
          onSelect={onEnterDocumentPictureInPicture}
        >
          <PictureInPicture2 />
          Enter Picture-in-Picture
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

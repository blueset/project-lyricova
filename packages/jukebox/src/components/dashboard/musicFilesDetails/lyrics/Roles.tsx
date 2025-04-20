import { Lyrics, LyricsLine } from "lyrics-kit/core";
import { toast } from "sonner";
import { useMemo, useEffect, memo, useCallback } from "react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import { cn } from "@lyricova/components/utils";
import { useNamedStateWithRef } from "@/hooks/useNamedStateWithRef";
import { Toggle } from "@lyricova/components/components/ui/toggle";

const RowItem = memo(function RowItem({
  line,
  idx,
  selected,
  onClick,
  onRoleChange,
  onMinorChange,
}: {
  line: LyricsLine;
  idx: number;
  selected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRoleChange?: (value: string) => void;
  onMinorChange?: (pressed: boolean) => void;
}) {
  const handleRoleChangeInternal = useCallback(
    (value: string) => {
      if (value && onRoleChange) {
        onRoleChange(value);
      }
    },
    [onRoleChange]
  );

  const handleMinorChangeInternal = useCallback(
    (pressed: boolean) => {
      if (onMinorChange) {
        onMinorChange(pressed);
      }
    },
    [onMinorChange]
  );

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-auto py-1 px-2 data-[selected=true]:bg-info data-[selected=true]:text-accent-foreground rounded-none",
        selected && "bg-accent text-accent-foreground"
      )}
      data-index={idx}
      data-selected={selected}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={String(line.attachments.role ?? 0)}
          onValueChange={handleRoleChangeInternal}
          size="sm"
          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking toggle group
        >
          <ToggleGroupItem value="0" className="py-0 px-2 h-auto">
            0
          </ToggleGroupItem>
          <ToggleGroupItem value="2" className="py-0 px-2 h-auto">
            2
          </ToggleGroupItem>
          <ToggleGroupItem value="1" className="py-0 px-2 h-auto">
            1
          </ToggleGroupItem>
        </ToggleGroup>
        <Toggle
          variant="outline"
          size="sm"
          className={cn(
            "py-0 px-2 h-auto",
            line.attachments.minor && "bg-secondary text-secondary-foreground"
          )}
          pressed={line.attachments.minor}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            handleMinorChangeInternal(!line.attachments.minor);
          }}
        >
          {line.attachments.minor ? "Min" : "Maj"}
        </Toggle>
        <span>{line.content}</span>
      </div>
    </Button>
  );
});

function getTargetLines(
  event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
  selectedLines: number[]
) {
  const eventLine = parseInt(
    event.currentTarget.closest("[data-index]")?.getAttribute("data-index") ??
      "-1"
  );
  if (selectedLines.includes(eventLine)) {
    return selectedLines;
  }
  return [eventLine];
}

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
}

export default function Roles({ lyrics, setLyrics, fileId }: Props) {
  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      toast.error(`Error occurred while loading lyrics text: ${e}`);
      return null;
    }
  }, [lyrics]);

  // Parse and set `lines`.
  const [lines, setLines, linesRef] = useNamedStateWithRef<LyricsLine[]>(
    [],
    "lines"
  );
  useEffect(() => {
    if (parsedLyrics !== null) {
      setLines(parsedLyrics.lines);

      return () => {
        parsedLyrics.lines = linesRef.current;
        setLyrics(parsedLyrics.toString());
      };
    }
    // dropping dependency [parsedLyrics] to prevent loop with parsedLyrics.
  }, [setLines, setLyrics]);

  const [selectedLines, setSelectedLines, selectedLinesRef] =
    useNamedStateWithRef<number[]>([], "selectedLines");

  const handleListItemClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const index = parseInt(
        event.currentTarget.getAttribute("data-index") ?? "-1"
      );
      const shiftKey = event.shiftKey;
      const ctrlCmdKey = event.ctrlKey || event.metaKey;
      if (ctrlCmdKey) {
        setSelectedLines((prevSelectedLines) => {
          if (prevSelectedLines.includes(index)) {
            return prevSelectedLines.filter((i) => i !== index);
          } else {
            return [...prevSelectedLines, index].sort((a, b) => a - b);
          }
        });
      } else if (shiftKey) {
        setSelectedLines((prevSelectedLines) => {
          if (prevSelectedLines.length === 0) {
            return [index];
          } else {
            const start = prevSelectedLines.at(0); // Use first selected as start
            const end = index;
            const rangeStart = Math.min(start ?? end, end);
            const rangeEnd = Math.max(start ?? end, end);
            return [
              ...Array.from(
                { length: rangeEnd - rangeStart + 1 },
                (_, i) => i + rangeStart
              ),
            ];
          }
        });
      } else {
        setSelectedLines([index]);
      }
    },
    [setSelectedLines]
  );

  const handleRoleChangeForRow = useCallback(
    (value: string) => {
      const role = parseInt(value);
      setLines((prevLines) =>
        prevLines.map((line, i) => {
          if (selectedLinesRef.current.includes(i)) {
            line = Object.assign(Object.create(line), line);
            line.attachments.role = role;
          }
          return line;
        })
      );
    },
    [setLines, selectedLinesRef]
  );

  const handleMinorChangeForRow = useCallback(
    (pressed: boolean) => {
      setLines((prevLines) =>
        prevLines.map((line, i) => {
          if (selectedLinesRef.current.includes(i)) {
            line = Object.assign(Object.create(line), line);
            line.attachments.minor = pressed;
          }
          return line;
        })
      );
    },
    [selectedLinesRef, setLines]
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className="sticky top-0.5 left-0 z-10" // Adjusted top slightly
      >
        <audio className="w-full" src={`/api/files/${fileId}/file`} controls />
      </div>
      <div>
        <div className="flex flex-col">
          {lines.map((line, idx) => (
            <RowItem
              key={idx}
              line={line}
              idx={idx}
              selected={selectedLines.includes(idx)}
              onClick={handleListItemClick}
              onRoleChange={handleRoleChangeForRow}
              onMinorChange={handleMinorChangeForRow}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

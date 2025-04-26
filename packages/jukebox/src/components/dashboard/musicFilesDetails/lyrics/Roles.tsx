import {
  Lyrics,
  LyricsLine,
  METADATA_MINOR,
  METADATA_ROLE,
} from "lyrics-kit/core";
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
import { useLyricsStore } from "./state/editorState";
import { useShallow } from "zustand/shallow";

const RowItem = memo(function RowItem({ idx }: { idx: number }) {
  const {
    lineContent,
    lineRole,
    lineMinor,
    selected,
    setSelectedLines,
    setRoleByIndex,
    setMinorByIndex,
    setRoleOfSelectedLines,
    setMinorOfSelectedLines,
  } = useLyricsStore(
    useShallow((state) => ({
      lineContent: state.lyrics?.lines[idx].content,
      lineRole: state.lyrics?.lines[idx].attachments[METADATA_ROLE]?.text,
      lineMinor: state.lyrics?.lines[idx].attachments[METADATA_MINOR]?.text,
      selected: state.role.selectedLines.includes(idx),
      setSelectedLines: state.role.setSelectedLines,
      setRoleByIndex: state.role.setRoleByIndex,
      setMinorByIndex: state.role.setMinorByIndex,
      setMinorOfSelectedLines: state.role.setMinorOfSelectedLines,
      setRoleOfSelectedLines: state.role.setRoleOfSelectedLines,
    }))
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const index = parseInt(
        event.currentTarget.getAttribute("data-index") ?? "-1"
      );
      const shiftKey = event.shiftKey;
      const ctrlCmdKey = event.ctrlKey || event.metaKey;
      const prevSelectedLines = useLyricsStore.getState().role.selectedLines;
      let newSelectedLines: number[] = [];
      if (ctrlCmdKey) {
        if (prevSelectedLines.includes(index)) {
          newSelectedLines = prevSelectedLines.filter((i) => i !== index);
        } else {
          newSelectedLines = [...prevSelectedLines, index].sort(
            (a, b) => a - b
          );
        }
      } else if (shiftKey) {
        if (prevSelectedLines.length === 0) {
          newSelectedLines = [index];
        } else {
          const start = prevSelectedLines.at(-1);
          const end = index;
          const rangeStart = Math.min(start ?? end, end);
          const rangeEnd = Math.max(start ?? end, end);
          newSelectedLines = [
            ...prevSelectedLines.filter((i) => i < rangeStart || i > rangeEnd),
            ...Array.from(
              { length: rangeEnd - rangeStart + 1 },
              (_, i) => i + rangeStart
            ),
          ];
        }
      } else {
        newSelectedLines = [index];
      }
      setSelectedLines(newSelectedLines);
    },
    [setSelectedLines]
  );

  const handleRoleChangeInternal = useCallback(
    (value: string) => {
      const selected = useLyricsStore
        .getState()
        .role.selectedLines.includes(idx);
      if (selected) {
        setRoleOfSelectedLines(parseInt(value) || 0);
      } else {
        setRoleByIndex(idx, parseInt(value) || 0);
      }
    },
    [idx, setRoleByIndex, setRoleOfSelectedLines]
  );

  const handleMinorChangeInternal = useCallback(() => {
    const pressed =
      useLyricsStore.getState().lyrics?.lines[idx].attachments[METADATA_MINOR]
        ?.text === "1";
    const selected = useLyricsStore.getState().role.selectedLines.includes(idx);
    if (selected) {
      setMinorOfSelectedLines(!pressed);
    } else {
      setMinorByIndex(idx, !pressed);
    }
  }, [idx, setMinorOfSelectedLines, setMinorByIndex]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-auto py-1 px-2 data-[selected=true]:bg-info data-[selected=true]:text-accent-foreground rounded-none pl-36",
          selected && "bg-accent text-accent-foreground"
        )}
        data-index={idx}
        data-selected={selected}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <span>{lineContent}</span>
        </div>
      </Button>
      <div className="absolute top-0 left-2 bottom-0 flex items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={lineRole || "0"}
          onValueChange={handleRoleChangeInternal}
          size="sm"
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
            lineMinor && "bg-secondary text-secondary-foreground"
          )}
          pressed={lineMinor === "1"}
          onClick={handleMinorChangeInternal}
        >
          {lineMinor ? "Min" : "Maj"}
        </Toggle>
      </div>
    </div>
  );
});

interface Props {
  fileId: number;
}

export default function Roles({ fileId }: Props) {
  const { linesCount } = useLyricsStore(
    useShallow((state) => ({
      linesCount: state.lyrics?.lines.length ?? 0,
    }))
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
          {Array(linesCount)
            .fill(null)
            .map((_, idx) => (
              <RowItem key={idx} idx={idx} />
            ))}
        </div>
      </div>
    </div>
  );
}

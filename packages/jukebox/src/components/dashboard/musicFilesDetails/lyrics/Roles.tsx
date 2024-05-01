import { Lyrics, LyricsLine } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import { useMemo, useRef, useEffect, useState, memo, useCallback } from "react";
import { useNamedState } from "../../../../hooks/useNamedState";
import {
  Box,
  List,
  ListItemButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  styled,
} from "@mui/material";
import { FullWidthAudio } from "../FullWIdthAudio";

const SmallButton = styled(ToggleButton)({
  minWidth: "24px !important",
  paddingBlock: 0,
});
const MajMinButton = styled(ToggleButton)({
  minWidth: "45px",
  paddingBlock: 0,
});

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
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onRoleChange?: (event: React.MouseEvent<HTMLElement>, role: number) => void;
  onMinorChange?: (event: React.MouseEvent<HTMLElement>, minor: boolean) => void;
}) {
  return (
    <ListItemButton data-index={idx} selected={selected} onClick={onClick}>
      <Stack direction="row" spacing={1} alignItems="center">
        <ToggleButtonGroup value={line.attachments.role} size="small" onChange={onRoleChange} exclusive>
          <SmallButton value={0}>0</SmallButton>
          <SmallButton value={2}>2</SmallButton>
          <SmallButton value={1}>1</SmallButton>
        </ToggleButtonGroup>
        <MajMinButton
          size="small"
          value={line.attachments.minor}
          selected={line.attachments.minor}
          onChange={onMinorChange}
        >
          {line.attachments.minor ? "Min" : "Maj"}
        </MajMinButton>
        <span>{line.content}</span>
      </Stack>
    </ListItemButton>
  );
});

function getTargetLines(event: React.MouseEvent<HTMLElement>, selectedLines: number[]) {
  const eventLine = parseInt(
    event.currentTarget.closest("[data-index]")?.getAttribute("data-index") ?? "-1"
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
  const snackbar = useSnackbar();

  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while loading lyrics text: ${e}`,
        { variant: "error" }
      );
      return null;
    }
  }, [lyrics, snackbar]);

  // Parse and set `lines`.
  const [lines, setLines] = useNamedState<LyricsLine[]>([], "lines");
  const linesRef = useRef<LyricsLine[]>();
  linesRef.current = lines;
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

  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const selectedLinesRef = useRef<number[]>();
  selectedLinesRef.current = selectedLines;

  const handleListItemClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
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
            return [...prevSelectedLines, index];
          }
        });
      } else if (shiftKey) {
        setSelectedLines((prevSelectedLines) => {
          if (prevSelectedLines.length === 0) {
            return [index];
          } else {
            const start = prevSelectedLines.at(-1);
            const end = index;
            return [
              ...Array.from({ length: end - start + 1 }, (_, i) => i + start),
            ];
          }
        });
      } else {
        setSelectedLines([index]);
      }
    },
    []
  );

  const handleRoleChange = useCallback(
    (event: React.MouseEvent<HTMLElement>, role: number | null) => {
      if (role === null) return;
      event.stopPropagation();
      const indexes = getTargetLines(event, selectedLinesRef.current);
      setLines((prevLines) => 
        prevLines.map((line, idx) => {
          if (indexes.includes(idx)) {
            line = Object.assign(Object.create(line), line);
            line.attachments.role = role;
          }
          return line;
        })
      );
    },
    [setLines]
  );

  const handleMinorChange = useCallback(
    (event: React.MouseEvent<HTMLElement>, minor: boolean | null) => {
      if (minor === null) return;
      event.stopPropagation();
      minor = !minor;
      const indexes = getTargetLines(event, selectedLinesRef.current);
      setLines((prevLines) => 
        prevLines.map((line, idx) => {
          if (indexes.includes(idx)) {
            line = Object.assign(Object.create(line), line);
            line.attachments.minor = minor;
          }
          return line;
        })
      );
    },
    [setLines]
  );

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          position: "sticky",
          top: 2,
          left: 0,
          zIndex: 2,
        }}
      >
        <FullWidthAudio src={`/api/files/${fileId}/file`} controls />
      </Box>
      <Box>
        <List dense>
          {lines.map((line, idx) => (
            <RowItem
              key={idx}
              line={line}
              idx={idx}
              selected={selectedLines.includes(idx)}
              onClick={handleListItemClick}
              onRoleChange={handleRoleChange}
              onMinorChange={handleMinorChange}
            />
          ))}
        </List>
      </Box>
    </Stack>
  );
}

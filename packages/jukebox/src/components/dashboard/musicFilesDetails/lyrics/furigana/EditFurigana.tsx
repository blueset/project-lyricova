import {
  Box,
  Button,
  Grid2 as Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  ToggleButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { LyricsLine } from "lyrics-kit/core";
import { Lyrics, RangeAttribute, FURIGANA } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import { useNamedState } from "../../../../../hooks/useNamedState";
import FuriganaLyricsLine from "../../../../FuriganaLyricsLine";
import { gql, useApolloClient } from "@apollo/client";
import EditFuriganaLine from "./EditFuriganaLine";
import type { DocumentNode } from "graphql";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DifferenceIcon from "@mui/icons-material/Difference";
import { FullWidthAudio } from "../../FullWIdthAudio";
import { furiganaRomajiMatching } from "./FuriganaRomajiMatching";
import { furiganaHighlight } from "./furiganaHighlights";
import { ApplyAllFurigana } from "./ApplyAllFurigana";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
` as DocumentNode;

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
  songId: number;
}

export default function EditFurigana({
  lyrics,
  setLyrics,
  fileId,
  songId,
}: Props) {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();
  const theme = useTheme();

  const [selectedLine, setSelectedLine] = useNamedState(null, "selectedLine");
  const [autoApplyIdentical, setAutoApplyIdentical] = useNamedState(
    true,
    "autoApplyIdentical"
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLines, setLyrics]);

  // Romaji matching from VocaDB
  const [romajiMatching, setRomajiMatching] = useNamedState<
    [number, string][][]
  >([], "romajiMatching");

  // Generate furigana
  const overwriteFurigana = useCallback(async () => {
    try {
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: lines.map((v) => v.content).join("\n") },
        fetchPolicy: "network-only",
      });
      if (result.data) {
        // Copy `lines` for React to recognize it as a new state
        const newLines = [...lines];
        result.data.transliterate.karaoke.forEach((v, idx) => {
          const line = newLines[idx];
          if (!line) return;
          if (v.length < 1) {
            delete line.attachments.content[FURIGANA];
          } else {
            const { tags, content } = v.reduce<{
              len: number;
              content: string;
              tags: [string, [number, number]][];
            }>(
              ({ len, tags, content }, [base, furigana]) => {
                if (base === furigana)
                  return {
                    len: len + base.length,
                    tags,
                    content: content + base,
                  };
                else {
                  tags.push([furigana, [len, len + base.length]]);
                  return {
                    len: len + base.length,
                    tags,
                    content: content + base,
                  };
                }
              },
              { len: 0, tags: [], content: "" }
            );

            if (tags.length < 1) delete line.attachments.content[FURIGANA];
            else {
              line.attachments.content[FURIGANA] = new RangeAttribute(tags);
              line.content = content;
            }
          }
        });
        setLines(newLines);
      }
    } catch (e) {
      console.error(`Error occurred while generating furigana: ${e}`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while generating furigana: ${e}`,
        { variant: "error" }
      );
    }
  }, [apolloClient, lines, setLines, snackbar]);

  // Apply furigana to all identical lines
  const applyFuriganaToAll = useCallback(
    (idx: number) => () => {
      const line = lines[idx];
      if (!line?.content) return;
      const furigana = line.attachments.content[FURIGANA];
      setLines((l) => {
        const newLines = [...l];
        newLines.forEach((v, i) => {
          if (i === idx) return;
          if (v.content === line.content) {
            if (furigana) v.attachments.content[FURIGANA] = furigana;
            else delete v.attachments.content[FURIGANA];
          }
        });
        return newLines;
      });
    },
    [lines, setLines]
  );

  // Save current line furigana
  const saveCurrentLine = useCallback(
    (idx: number) => (line: LyricsLine) => {
      // Copy `lines` for React to recognize it as a new state
      setLines((l) => {
        const newLines = [...l];
        newLines[idx] = line;
        return newLines;
      });

      // Auto apply furigana to identical lines if enabled
      if (autoApplyIdentical) {
        setTimeout(() => applyFuriganaToAll(idx)(), 0);
      }
    },
    [setLines, autoApplyIdentical, applyFuriganaToAll]
  );

  return (
    <Grid container spacing={2}>
      <Grid
        size={12}
        sx={{
          position: "sticky",
          top: 2,
          left: 0,
          zIndex: 2,
        }}
      >
        <FullWidthAudio src={`/api/files/${fileId}/file`} controls />
      </Grid>
      <Grid
        size={{ xs: 12, sm: 5 }}
        sx={{
          position: "sticky",
          top: 60,
          left: 0,
          height: "fit-content",
          zIndex: 2,
        }}
      >
        <Toolbar disableGutters sx={{ p: 0 }}>
          <Tooltip title="Overwrite with generated furigana">
            <IconButton onClick={overwriteFurigana}>
              <AutoFixHighIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Match with VocaDB Romanization">
            <IconButton
              onClick={() =>
                furiganaRomajiMatching({ apolloClient, lines, songId }).then(
                  (result) => {
                    // console.log(result);
                    setRomajiMatching(result);
                  }
                )
              }
            >
              <DifferenceIcon />
            </IconButton>
          </Tooltip>
          <ApplyAllFurigana setLines={setLines} />
          <Tooltip title="Auto-apply furigana to identical lines">
            <ToggleButton
              value="check"
              selected={autoApplyIdentical}
              size="small"
              color="secondary"
              onChange={() => setAutoApplyIdentical((v) => !v)}
            >
              <PlaylistAddCheckIcon />
            </ToggleButton>
          </Tooltip>
        </Toolbar>
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          {selectedLine != null && selectedLine < lines.length && (
            <EditFuriganaLine
              line={lines[selectedLine]}
              setLine={saveCurrentLine(selectedLine)}
            />
          )}
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 7 }}>
        <List dense>
          {lines.map((v, idx) => (
            <ListItem
              key={idx}
              disablePadding
              secondaryAction={
                <Tooltip
                  title="Apply furigana to all identical lines"
                  placement="bottom-end"
                >
                  <IconButton onClick={applyFuriganaToAll(idx)}>
                    <PlaylistAddCheckIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{
                "& .MuiListItemSecondaryAction-root": {
                  visibility: "hidden",
                },
                "&:hover .MuiListItemSecondaryAction-root, &:focus .MuiListItemSecondaryAction-root":
                  {
                    visibility: "visible",
                  },
              }}
            >
              <ListItemButton
                onClick={() => setSelectedLine(idx)}
                selected={selectedLine === idx}
              >
                <ListItemText
                  primaryTypographyProps={{
                    variant: "body1",
                    lang: "ja",
                    sx: {
                      fontSize: "2em",
                      minHeight: "1em",
                    },
                  }}
                >
                  <FuriganaLyricsLine
                    lyricsKitLine={v}
                    rubyStyles={furiganaHighlight(theme)}
                  />
                  {romajiMatching[idx] && (
                    <Box sx={{ lineHeight: 1 }}>
                      {romajiMatching[idx].map(([i, text], idx) => (
                        <Typography
                          key={idx}
                          lang="ja"
                          component="span"
                          variant="body2"
                          sx={{
                            textDecoration: i === -1 ? "line-through" : "none",
                            color:
                              i === 0
                                ? "text.primary"
                                : i === -1
                                ? "primary.main"
                                : "secondary.main",
                          }}
                        >
                          {text}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}

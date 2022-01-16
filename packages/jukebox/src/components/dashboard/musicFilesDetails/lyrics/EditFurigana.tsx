import { Box, Button, Grid, List, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import DismissibleAlert from "../../DismissibleAlert";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef } from "react";
import { buildTimeTag, resolveTimeTag } from "lyrics-kit/build/main/utils/regexPattern";
import { Lyrics, LyricsLine, RangeAttribute } from "lyrics-kit";
import { useSnackbar } from "notistack";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { FURIGANA, TRANSLATION } from "lyrics-kit/build/main/core/lyricsLineAttachment";
import FuriganaLyricsLine from "../../../FuriganaLyricsLine";
import { makeStyles } from "@mui/material/styles";
import { gql, useApolloClient } from "@apollo/client";
import EditFuriganaLine from "./EditFuriganaLine";
import { DocumentNode } from "graphql";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
` as DocumentNode;

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
}

export default function EditFurigana({ lyrics, setLyrics, fileId }: Props) {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const [selectedLine, setSelectedLine] = useNamedState(null, "selectedLine");

  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(`Error occurred while loading lyrics text: ${e}`, { variant: "error" });
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

  // Generate furigana
  const overrideFurigana = useCallback(async () => {
    try {
      const result = await apolloClient.query<{ transliterate: { karaoke: [string, string][][] } }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: lines.map(v => v.content).join("\n") },
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
            const { tags } = v.reduce<{
              len: number; tags: [string, [number, number]][];
            }>(({ len, tags }, [base, furigana]) => {
              if (base === furigana) return { len: len + base.length, tags };
              else {
                tags.push([furigana, [len, len + base.length]]);
                return { len: len + base.length, tags };
              }
            }, { len: 0, tags: [] });
            if (tags.length < 1) delete line.attachments.content[FURIGANA];
            else line.attachments.content[FURIGANA] = new RangeAttribute(tags);
          }
        });
        setLines(newLines);
      }
    } catch (e) {
      console.error(`Error occurred while generating furigana: ${e}`, e);
      snackbar.enqueueSnackbar(`Error occurred while generating furigana: ${e}`, { variant: "error" });
    }
  }, [apolloClient, lines, setLines, snackbar]);

  // Save current line furigana
  const saveCurrentLine = useCallback((idx: number) => (line: LyricsLine) => {
    // Copy `lines` for React to recognize it as a new state
    setLines((l) => {
      l[idx] = line;
      return l;
    });
  }, [setLines]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sx={{
        position: "sticky",
        top: 2,
        left: 0,
        zIndex: 2,
      }} >
        <audio src={`/api/files/${fileId}/file`} controls style={{width: "100%"}} />
      </Grid>
      <Grid item xs={12} sm={5} sx={{
        position: "sticky",
        top: 10,
        left: 0,
        height: "fit-content",
        zIndex: 2,
      }}>
        <Box sx={{marginTop: 2, marginBottom: 2}}>
          <Button variant="outlined" onClick={overrideFurigana}>Override with generated furigana</Button>
        </Box>
        <Box sx={{marginTop: 2, marginBottom: 2}}>
          {selectedLine != null && selectedLine < lines.length &&
          <EditFuriganaLine line={lines[selectedLine]} setLine={saveCurrentLine(selectedLine)} />}
        </Box>
      </Grid>
      <Grid item xs={12} sm={7}>
        <List dense>
          {lines.map((v, idx) =>
            <ListItem key={idx} button onClick={() => setSelectedLine(idx)} selected={selectedLine === idx}>
              <ListItemText primaryTypographyProps={{ variant: "body1", lang: "ja", sx: {
                  fontSize: "2em",
                  minHeight: "1em",
                }}}>
                <FuriganaLyricsLine lyricsKitLine={v} />
              </ListItemText>
            </ListItem>
          )}
        </List>
      </Grid>
    </Grid>
  );
}
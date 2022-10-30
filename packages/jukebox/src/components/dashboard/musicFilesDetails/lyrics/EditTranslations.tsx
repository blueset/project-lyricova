import { Grid, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import DismissibleAlert from "../../DismissibleAlert";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef } from "react";
import { buildTimeTag, resolveTimeTag } from "lyrics-kit/build/main/utils/regexPattern";
import { Lyrics } from "lyrics-kit";
import { useSnackbar } from "notistack";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { TRANSLATION } from "lyrics-kit/build/main/core/lyricsLineAttachment";

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditTranslations({ lyrics, setLyrics }: Props) {
  const snackbar = useSnackbar();

  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;
    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(`Error while loading lyrics text: ${e}`, { variant: "error" });
      return null;
    }
  }, [lyrics, snackbar]);

  const [translatedLines, setTranslatedLines] = useNamedState<(string | null)[]>([], "translatedLines");
  const translatedLinesRef = useRef<(string | null)[]>();
  translatedLinesRef.current = translatedLines;

  // Build `translatedLines`.
  useEffect(() => {
    if (parsedLyrics) {
      const lines = parsedLyrics.lines.map(v => v?.attachments?.translation() ?? null);
      setTranslatedLines(lines);
    } else {
      setTranslatedLines([]);
    }

    return () => {
      if (parsedLyrics) {
        const translatedLines = translatedLinesRef.current;
        parsedLyrics.lines.forEach((v, idx) => {
          if (translatedLines[idx]) v.attachments.setTranslation(translatedLines[idx]);
          else delete v.attachments.content[TRANSLATION];
        });
        setLyrics(parsedLyrics.toString());
      }
    };
    // Dropping dependencies [lyrics, parsedLyrics to prevent infinite loop between this effect and `parsedLyrics`
  }, [setLyrics, setTranslatedLines]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTranslatedLines(event.target.value.split("\n"));
  }, [setTranslatedLines]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <DismissibleAlert severity="warning">Switch to another tab to save changes.</DismissibleAlert>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant="overline">Preview</Typography>
        {parsedLyrics?.lines.map((v, idx) =>
          <div key={idx}>
            <Typography variant="body2" display="inline" color="textSecondary" lang="ja">{v.content} ✲</Typography> <Typography variant="body2" display="inline" lang="zh">{translatedLines[idx]}</Typography>
          </div>
        )}
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          id="translations"
          label="Translations"
          fullWidth
          value={translatedLines.join("\n")}
          inputProps={{ lang: "zh" }}
          onChange={handleChange}
          multiline
          variant="outlined"
        />
      </Grid>
    </Grid>
  );
}
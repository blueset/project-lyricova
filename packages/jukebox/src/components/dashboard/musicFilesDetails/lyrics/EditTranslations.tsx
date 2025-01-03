import {
  Button,
  CircularProgress,
  Grid2 as Grid,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DismissibleAlert from "../../DismissibleAlert";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lyrics, TRANSLATION } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useNamedState } from "../../../../hooks/useNamedState";
import { smartypantsu } from "smartypants";
import { gql, useApolloClient } from "@apollo/client";

const TRANSLATION_ALIGNMENT_QUERY = gql`
  query ($translation: String!, $original: String!) {
    translationAlignment(translation: $translation, original: $original)
  }
`;

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditTranslations({ lyrics, setLyrics }: Props) {
  const snackbar = useSnackbar();

  const apolloClient = useApolloClient();
  const [isAlignmentLoading, setIsAlignmentLoading] = useState(false);

  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;
    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(`Error while loading lyrics text: ${e}`, {
        variant: "error",
      });
      return null;
    }
  }, [lyrics, snackbar]);

  const [languages, setLanguages] = useNamedState<(string | undefined)[]>(
    [],
    "languages"
  );
  const [currentLanguageIdx, setCurrentLanguageIdx] = useNamedState<number>(
    0,
    "currentLanguageIdx"
  );
  const currentLanguage = languages[currentLanguageIdx];
  const currentLanguageRef = useRef<string | undefined>();
  currentLanguageRef.current = currentLanguage;

  const [translatedLines, setTranslatedLines] = useNamedState<
    (string | null)[]
  >([], "translatedLines");
  const translatedLinesRef = useRef<(string | null)[]>();
  translatedLinesRef.current = translatedLines;

  // Build `translatedLines`.
  useEffect(() => {
    if (parsedLyrics) {
      const languages = parsedLyrics.translationLanguages;
      setLanguages(languages);
      const defaultLanguage = languages[0] || undefined;
      setCurrentLanguageIdx(0);

      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(defaultLanguage) ?? null
      );
      setTranslatedLines(lines);
    } else {
      setTranslatedLines([]);
    }

    return () => {
      if (parsedLyrics) {
        const translatedLines = translatedLinesRef.current;
        parsedLyrics.lines.forEach((v, idx) => {
          v.attachments.setTranslation(
            translatedLines[idx],
            currentLanguageRef.current
          );
        });
        setLyrics(parsedLyrics.toString());
      }
    };
    // Dropping dependencies [parsedLyrics] to prevent infinite loop between this effect and `parsedLyrics`
  }, [setLyrics, setTranslatedLines, setCurrentLanguageIdx, setLanguages]);

  useEffect(() => {
    if (parsedLyrics) {
      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(currentLanguage) ?? null
      );
      setTranslatedLines(lines);
    }
  }, [currentLanguage, parsedLyrics, setTranslatedLines]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTranslatedLines(event.target.value.split("\n"));
    },
    [setTranslatedLines]
  );

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLanguages((languages) => {
        const newLanguages = [...languages];
        const oldLang = newLanguages[currentLanguageIdx];
        const newLang = event.target.value;
        newLanguages[currentLanguageIdx] = newLang;
        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(translatedLines[idx], newLang);
          v.attachments.setTranslation(null, oldLang);
        });
        return newLanguages;
      });
    },
    [currentLanguageIdx, parsedLyrics, setLanguages, setLyrics, translatedLines]
  );

  const handleLanguageSwitch = useCallback(
    (event: React.MouseEvent<HTMLElement>, value: number) => {
      if (value === null) return;
      // commit current language translations
      const translatedLines = translatedLinesRef.current;
      parsedLyrics?.lines.forEach((v, idx) => {
        v.attachments.setTranslation(translatedLines[idx], currentLanguage);
      });
      setLyrics(parsedLyrics.toString());
      setCurrentLanguageIdx(value);
    },
    [currentLanguage, parsedLyrics, setCurrentLanguageIdx, setLyrics]
  );

  const handleDeleteLanguage = useCallback(
    (idx: number) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      setLanguages((languages) => {
        const newLanguages = [...languages];
        const deletedLang = newLanguages.splice(idx, 1)[0];
        setCurrentLanguageIdx((idx) => Math.min(idx, newLanguages.length - 1));

        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(null, deletedLang);
        });
        setLyrics(parsedLyrics.toString());
        return newLanguages;
      });
    },
    [setCurrentLanguageIdx, setLanguages]
  );

  const handleAddLanguage = useCallback(() => {
    setLanguages((languages) => {
      setCurrentLanguageIdx(languages.length);
      return [...languages, `lang-${languages.length}`];
    });
  }, [setCurrentLanguageIdx, setLanguages]);

  const handleFixQuotes = useCallback(() => {
    setTranslatedLines((lines) => {
      try {
        return lines.map((line) => {
          return typeof line === "string" ? smartypantsu(line) : line;
        });
      } catch (e) {
        snackbar.enqueueSnackbar(`Error while applying rules: ${e}`, {
          variant: "error",
        });
        console.error(e);
        return lines;
      }
    });
  }, [setTranslatedLines]);

  const handleAlignment = useCallback(async () => {
    const translation = translatedLines.join("\n");
    const original = parsedLyrics?.lines.map((v) => v.content).join("\n") || "";
    setIsAlignmentLoading(true);
    try {
      const { data } = await apolloClient.query<{
        translationAlignment: string;
      }>({
        query: TRANSLATION_ALIGNMENT_QUERY,
        variables: { translation, original },
      });
      setTranslatedLines(data.translationAlignment.split("\n"));
      snackbar.enqueueSnackbar("Alignment completed", {
        variant: "success",
      });
    } catch (e) {
      snackbar.enqueueSnackbar(`Error while aligning: ${e}`, {
        variant: "error",
      });
    } finally {
      setIsAlignmentLoading(false);
    }
  }, [apolloClient, parsedLyrics, snackbar, translatedLines]);

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Stack direction="column" spacing={1}>
          <DismissibleAlert severity="warning">
            Switch to another tab to save changes.
          </DismissibleAlert>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Language"
              size="small"
              value={currentLanguage || ""}
              placeholder="Unknown"
              onChange={handleLanguageChange}
            />
            <span>Translations:</span>
            <ToggleButtonGroup
              value={currentLanguageIdx}
              size="small"
              onChange={handleLanguageSwitch}
              exclusive
            >
              {languages.map((v, idx) => (
                <ToggleButton key={idx} value={idx}>
                  #{idx} ({v || "Unknown"})
                  <IconButton size="small" onClick={handleDeleteLanguage(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <IconButton onClick={handleAddLanguage}>
              <AddIcon />
            </IconButton>
            <Button variant="outlined" onClick={handleFixQuotes}>
              Fix quotes
            </Button>
            <Button
              variant="outlined"
              onClick={handleAlignment}
              disabled={isAlignmentLoading}
            >
              GPT Alignment
              {isAlignmentLoading && (
                <CircularProgress size={16} sx={{ ml: 1 }} />
              )}
            </Button>
          </Stack>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography variant="overline">Preview</Typography>
        {parsedLyrics?.lines.map((v, idx) => (
          <div key={idx}>
            <Typography
              variant="body2"
              display="inline"
              sx={{
                color:
                  v.content.trim() && !translatedLines[idx]
                    ? "secondary.light"
                    : "textSecondary",
              }}
              lang="ja"
            >
              {v.content}
            </Typography>
            <Typography variant="body2" display="inline" color="textSecondary">
              {" ✲ "}
            </Typography>
            <Typography
              variant="body2"
              display="inline"
              lang={currentLanguage || "zh"}
              sx={{
                color:
                  translatedLines[idx] && !v.content.trim()
                    ? "secondary.light"
                    : "textSecondary",
              }}
            >
              {translatedLines[idx]}
            </Typography>
          </div>
        ))}
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          id="translations"
          label="Translations"
          fullWidth
          value={translatedLines.join("\n")}
          onChange={handleChange}
          multiline
          variant="outlined"
          slotProps={{
            htmlInput: { lang: currentLanguage || "zh" },
          }}
        />
      </Grid>
    </Grid>
  );
}

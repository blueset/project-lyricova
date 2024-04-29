import {
  Button,
  Grid,
  styled,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { FURIGANA, Lyrics } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import { gql, useApolloClient } from "@apollo/client";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
`;

const SpacedButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

interface Props {
  lyrics: string;
  lrcx: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditPlainLyrics({ lyrics, lrcx, setLyrics }: Props) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLyrics(event.target.value);
    },
    [setLyrics]
  );

  const languages = useMemo(() => {
    return new Lyrics(lrcx).translationLanguages;
  }, [lrcx]);
  const [selectedLanguageIdx, setSelectedLanguageIdx] = useState(0);

  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const copyFromLRCX = useCallback(
    (useFurigana: boolean) => () => {
      try {
        const parsed = new Lyrics(lrcx);
        setLyrics(parsed.toPlainLRC({ lineOptions: { useFurigana, translationLanguage: languages[selectedLanguageIdx] } }));
      } catch (e) {
        snackbar.enqueueSnackbar(`Error while copying: ${e}`, {
          variant: "error",
        });
      }
    },
    [lrcx, setLyrics, snackbar, languages, selectedLanguageIdx]
  );

  const copyFromLRCXWithSmartFurigana = useCallback(async () => {
    try {
      const parsed = new Lyrics(lrcx);
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: parsed.lines.map((v) => v.content).join("\n") },
      });
      if (result.data) {
        result.data.transliterate.karaoke.forEach((v, idx) => {
          const line = parsed.lines[idx];
          if (!line || v.length < 1) return;
          const { tags } = v.reduce<{
            len: number;
            tags: [string, [number, number]][];
          }>(
            ({ len, tags }, [base, furigana]) => {
              if (base === furigana) return { len: len + base.length, tags };
              else {
                tags.push([furigana, [len, len + base.length]]);
                return { len: len + base.length, tags };
              }
            },
            { len: 0, tags: [] }
          );
          if (line.attachments?.content?.[FURIGANA]?.attachment?.length) {
            line.attachments.content[FURIGANA].attachment =
              line.attachments.content[FURIGANA].attachment.filter(
                (label) =>
                  tags.findIndex(
                    (tag) =>
                      tag[0] === label.content &&
                      tag[1][0] === label.range[0] &&
                      tag[1][1] === label.range[1]
                  ) < 0
              );
          }
        });
        setLyrics(parsed.toPlainLRC({ lineOptions: { useFurigana: true, translationLanguage: languages[selectedLanguageIdx] } }));
      }
    } catch (e) {
      snackbar.enqueueSnackbar(`Error while copying: ${e}`, {
        variant: "error",
      });
    }
  }, [apolloClient, languages, lrcx, selectedLanguageIdx, setLyrics, snackbar]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="overline" display="block">
            Common operations
          </Typography>
          <SpacedButton
            variant="outlined"
            disabled={!lrcx}
            onClick={copyFromLRCX(false)}
          >
            Copy from LRCX
          </SpacedButton>
          <SpacedButton
            variant="outlined"
            disabled={!lrcx}
            onClick={copyFromLRCX(true)}
          >
            Copy from LRCX with Furigana
          </SpacedButton>
          <SpacedButton
            variant="outlined"
            disabled={!lrcx}
            onClick={copyFromLRCXWithSmartFurigana}
          >
            Copy from LRCX with Smart Furigana
          </SpacedButton>
        </Grid>
        {languages.length ? (
          <Grid item xs={12} sm={6}>
            <Typography variant="overline" display="block">
              Translation Language
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={selectedLanguageIdx}
              onChange={(_, value) => setSelectedLanguageIdx(value)}
              exclusive
            >
              {languages.map((v, idx) => (
                <ToggleButton key={idx} value={idx}>
                  {v || "Unknown"}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        ) : null}
      </Grid>
      <TextField
        id="lyrics-source"
        label="Lyrics source"
        fullWidth
        value={lyrics || ""}
        inputProps={{ sx: { fontFamily: "monospace" }, lang: "ja" }}
        onChange={handleChange}
        multiline
        variant="outlined"
      />
    </>
  );
}

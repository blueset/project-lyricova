import { Button, Grid, styled, TextField, Typography } from "@mui/material";
import type { ChangeEvent } from "react";
import { useCallback } from "react";
import { useNamedState } from "../../../../frontendUtils/hooks";
import VocaDBLyricsDialog from "./VocaDBLyricsDialog";
import HMikuWikiSearchDialog from "./HMikuWikiSearchDialog";
import DiffEditorDialog from "./DiffEditorDialog";

function replaceWithPattern(
  lines: [string, string][],
  pattern: RegExp
): string | null {
  const linesMatchPattern = lines
    .map((v) => (v[1].match(pattern) ? 1 : 0))
    .reduce((prev, curr) => prev + curr, 0);
  if (linesMatchPattern / lines.length > 0.25) {
    const result: string[] = [];
    for (const [tag, text] of lines) {
      const match = text.match(pattern);
      if (match) {
        result.push(`${tag || ""}${match[1]}`);
        result.push(`${tag || ""}[tr]${match[2]}`);
      } else {
        result.push(`${tag || ""}${text || ""}`);
      }
    }
    return result.join("\n");
  }
  return null;
}

function smartTranslationSeparation(text: string): string {
  const lines = text.split("\n").map((v): [string, string] => {
    const groups = v.trimEnd().match(/^(\[.+\])?(.*)$/);
    if (groups) return [groups[1], groups[2]];
    return ["", ""];
  });
  // Cases:
  // Most lines has " / ", /, 【】
  let result = replaceWithPattern(lines, /^(.*?) \/ (.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)\/(.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)／(.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)【(.*)】$/);
  if (result !== null) return result;
  return text;
}

const SpacedButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

interface Props {
  lyrics: string;
  songId?: number;
  title?: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditLyrics({
  lyrics,
  setLyrics,
  songId,
  title,
}: Props) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLyrics(event.target.value);
    },
    [setLyrics]
  );

  const trimSpaces = useCallback(() => {
    setLyrics(
      lyrics.replace(/^(\[.+\])?(?:[ 　\t]*)(.*?)(?:[ 　\t]*)$/gm, "$1$2")
    );
  }, [lyrics, setLyrics]);

  const separateTranslations = useCallback(() => {
    setLyrics(smartTranslationSeparation(lyrics || ""));
  }, [lyrics, setLyrics]);

  const [showVocaDBDialog, toggleVocaDBDialog] = useNamedState(
    false,
    "showVocaDBDialog"
  );
  const [showHMikuWikiDialog, toggleHMikuWikiDialog] = useNamedState(
    false,
    "showHMikuWikiDialog"
  );
  const [showDiffDialog, toggleDiffDialog] = useNamedState(
    false,
    "showDiffDialog"
  );

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Typography variant="overline" display="block">
            Load plain text
          </Typography>
          <SpacedButton
            variant="outlined"
            disabled={songId == null}
            onClick={() => toggleVocaDBDialog(true)}
          >
            Load lyrics from VocaDB
          </SpacedButton>
          <SpacedButton
            variant="outlined"
            onClick={() => toggleHMikuWikiDialog(true)}
          >
            Search from 初音ミク@wiki
          </SpacedButton>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Typography variant="overline" display="block">
            Common operations
          </Typography>
          <SpacedButton variant="outlined" onClick={trimSpaces}>
            Trim spaces
          </SpacedButton>
          <SpacedButton variant="outlined" onClick={separateTranslations}>
            Smart translation extraction
          </SpacedButton>
          <SpacedButton variant="outlined" onClick={() => setLyrics("")}>
            Clear
          </SpacedButton>
          <SpacedButton
            variant="outlined"
            onClick={() => toggleDiffDialog(true)}
          >
            Diff editor
          </SpacedButton>
        </Grid>
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
      <VocaDBLyricsDialog
        isOpen={showVocaDBDialog}
        toggleOpen={toggleVocaDBDialog}
        songId={songId}
      />
      <HMikuWikiSearchDialog
        isOpen={showHMikuWikiDialog}
        toggleOpen={toggleHMikuWikiDialog}
        keyword={title}
      />
      <DiffEditorDialog isOpen={showDiffDialog} toggleOpen={toggleDiffDialog} />
    </>
  );
}

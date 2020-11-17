import { Button, Grid, TextField, Typography } from "@material-ui/core";
import { ChangeEvent, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useNamedState } from "../../../../frontendUtils/hooks";
import VocaDBLyricsDialog from "./VocaDBLyricsDialog";
import HMikuWikiSearchDialog from "./HMikuWikiSearchDialog";

function replaceWithPattern(lines: [string, string][], pattern: RegExp): string | null {
  const linesMatchPattern = lines.map(v => v[1].match(pattern) ? 1 : 0).reduce((prev, curr) => prev + curr, 0);
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
    const groups = v.match(/^(\[.+\])?(.*)$/);
    if (groups) return [groups[1], groups[2]];
    return ["", ""];
  });
  // Cases:
  // Most lines has " / ", /, 【】
  let result = replaceWithPattern(lines, /^(.*?) \/ (.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)\/(.*)$/);
  if (result !== null) return result;
  result = replaceWithPattern(lines, /^(.*?)【(.*)】$/);
  if (result !== null) return result;
  return text;
}

const useStyle = makeStyles((theme) => ({
  textField: {
    fontFamily: "monospace",
  },
  button: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }
}));

interface Props {
  lyrics: string;
  songId?: number;
  title?: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditLyrics({ lyrics, setLyrics, songId, title }: Props) {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLyrics(event.target.value);
  }, [setLyrics]);

  const styles = useStyle();

  const trimSpaces = useCallback(() => {
    setLyrics(lyrics.replace(/^(\[.+\])(?:[ 　\t]*)(.*?)(?:[ 　\t]*)$/gm, "$1$2"));
  }, [lyrics, setLyrics]);

  const separateTranslations = useCallback(() => {
    setLyrics(smartTranslationSeparation(lyrics || ""));
  }, [lyrics, setLyrics]);

  const [showVocaDBDialog, toggleVocaDBDialog] = useNamedState(false, "showVocaDBDialog");
  const [showHMikuWikiDialog, toggleHMikuWikiDialog] = useNamedState(false, "showHMikuWikiDialog");

  return <>
    <Grid container spacing={2}>
      <Grid item xs={12} lg={4}>
        <Typography variant="overline" display="block">Load plain text</Typography>
        <Button className={styles.button} variant="outlined" disabled={songId == null} onClick={() => toggleVocaDBDialog(true)}>Load lyrics from VocaDB</Button>
        <Button className={styles.button} variant="outlined" onClick={() => toggleHMikuWikiDialog(true)}>Search from 初音ミク@wiki</Button>
      </Grid>
      <Grid item xs={12} lg={4}>
        <Typography variant="overline" display="block">Common operations</Typography>
        <Button className={styles.button} variant="outlined" onClick={trimSpaces}>Trim spaces</Button>
        <Button className={styles.button} variant="outlined" onClick={separateTranslations}>Smart translation extraction</Button>
        <Button className={styles.button} variant="outlined" onClick={() => setLyrics("")}>Clear</Button>
      </Grid>
    </Grid>
    <TextField
      id="lyrics-source"
      label="Lyrics source"
      fullWidth
      value={lyrics || ""}
      inputProps={{ className: styles.textField, lang: "ja" }}
      onChange={handleChange}
      multiline
      variant="outlined"
    />
    <VocaDBLyricsDialog isOpen={showVocaDBDialog} toggleOpen={toggleVocaDBDialog} songId={songId} />
    <HMikuWikiSearchDialog isOpen={showHMikuWikiDialog} toggleOpen={toggleHMikuWikiDialog} keyword={title} />
  </>;
}

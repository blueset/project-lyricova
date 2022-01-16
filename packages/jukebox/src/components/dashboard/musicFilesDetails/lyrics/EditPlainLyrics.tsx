import { Button, Grid, styled, TextField, Typography } from "@mui/material";
import { ChangeEvent, useCallback } from "react";
import { makeStyles } from "@mui/material/styles";
import { useNamedState } from "../../../../frontendUtils/hooks";
import VocaDBLyricsDialog from "./VocaDBLyricsDialog";
import HMikuWikiSearchDialog from "./HMikuWikiSearchDialog";
import { Lyrics } from "lyrics-kit";
import { useSnackbar } from "notistack";

const SpacedButton = styled(Button)({marginRight: 1, marginBottom: 1});

interface Props {
  lyrics: string;
  lrcx: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditPlainLyrics({ lyrics, lrcx, setLyrics, }: Props) {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLyrics(event.target.value);
  }, [setLyrics]);

  const snackbar = useSnackbar();

  const copyFromLRCX = useCallback((useFurigana: boolean) => () => {
    try {
      const parsed = new Lyrics(lrcx);
      setLyrics(parsed.toPlainLRC({ lineOptions: { useFurigana } }));
    } catch (e) {
      snackbar.enqueueSnackbar(`Error while copying: ${e}`, {variant: "error"});
    }
  }, [lrcx, setLyrics, snackbar]);

  return <>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="overline" display="block">Common operations</Typography>
        <SpacedButton variant="outlined" disabled={!lrcx}
                onClick={copyFromLRCX(false)}>Copy from LRCX</SpacedButton>
        <SpacedButton variant="outlined" disabled={!lrcx}
                onClick={copyFromLRCX(true)}>Copy from LRCX with Furigana</SpacedButton>
      </Grid>
    </Grid>
    <TextField
      id="lyrics-source"
      label="Lyrics source"
      fullWidth
      value={lyrics || ""}
      inputProps={{ sx:{ fontFamily: "monospace" }, lang: "ja" }}
      onChange={handleChange}
      multiline
      variant="outlined"
    />
  </>;
}

import { Button, duration, Grid, Typography } from "@material-ui/core";
import { useCallback, useMemo, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import LyricsPreview from "./LyricsPreview";
import { lyricsAnalysis } from "../../../utils/lyricsCheck";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useSnackbar } from "notistack";
import { Lyrics } from "lyrics-kit";
import { useNamedState } from "../../../frontendUtils/hooks";
import LyricsEditDialog from "./LyricsEditDialog";

const useStyle = makeStyles((theme) => ({
  player: {
    width: "100%",
  },
  button: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

interface Props {
  fileId: number;
  lrcLyrics?: string;
  lrcxLyrics?: string;
  title: string;
  artists: string;
  duration: number;
  songId?: number;
  refresh: () => unknown | Promise<unknown>;
}

export default function LyricsPanel({ fileId, lrcLyrics, lrcxLyrics, refresh, title, artists, duration, songId }: Props) {
  const [isLyricsEditDialogOpen, toggleLyricsEditDialogOpen] = useNamedState(false, "isLyricsEditDialogOpen");
  const handleOpenLyricsEditDialog = useCallback(() => toggleLyricsEditDialogOpen(true), [toggleLyricsEditDialogOpen]);

  const styles = useStyle();
  dayjs.extend(utc);

  const effectiveLyricsText = lrcxLyrics || lrcLyrics || null;
  const snackbar = useSnackbar();
  const lyrics = useMemo(() => {
    if (!effectiveLyricsText) return null;
    try {
      return new Lyrics(effectiveLyricsText);
    } catch (e) {
      snackbar.enqueueSnackbar(`Error while parsing lyrics: ${e}`, { variant: "error" });
      return null;
    }
  }, [effectiveLyricsText, snackbar]);

  let lyricsNode = <Typography variant="h6" component="div">No lyrics</Typography>;
  if (lyrics) {
    lyricsNode = <LyricsPreview lyrics={lyrics} fileId={fileId} />;
  }

  const analysisResult = useMemo(() => lyricsAnalysis(lyrics), [effectiveLyricsText]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={9}>
          {lyricsNode}
        </Grid>
        <Grid item xs={12} sm={3}>
          <Typography variant="h6" component="h3">Lyric state</Typography>
          <p>
            <Typography>Lyrics type: {lrcxLyrics ?
              <Typography component="span" color="secondary">LRCX</Typography> : lrcLyrics ? "LRC" :
                <Typography component="span" color="textSecondary">No lyrics</Typography>}</Typography>
            {effectiveLyricsText !== null && (<>
              {lrcxLyrics !== null && <>
                  <Typography>Has translation: {analysisResult.hasTranslation ?
                    <Typography component="span" color="secondary">Yes</Typography> :
                    <Typography component="span">No</Typography>}</Typography>
                  <Typography>Has inline time tags: {analysisResult.hasInlineTimeTags ?
                    <Typography component="span" color="secondary">Yes</Typography> :
                    <Typography component="span">No</Typography>}</Typography>
                  <Typography>Has furigana: {analysisResult.hasFurigana ?
                    <Typography component="span" color="secondary">Yes</Typography> :
                    <Typography component="span">No</Typography>}</Typography>
              </>}
              <Typography>Has “Simplified Japanese”: {analysisResult.hasSimplifiedJapanese ?
                <Typography component="span" color="error">Yes</Typography> :
                <Typography component="span" color="secondary">No</Typography>}</Typography>
              <Typography>Last
                timestamp: {dayjs.utc(analysisResult.lastTimestamp * 1000).format("HH:mm:ss")}</Typography>
            </>)}
          </p>
          <Typography variant="h6" component="h3">What to do?</Typography>
          <Button className={styles.button} variant="outlined" onClick={handleOpenLyricsEditDialog}>Adjust</Button>
        </Grid>
      </Grid>
      <LyricsEditDialog
        refresh={refresh}
        fileId={fileId}
        isOpen={isLyricsEditDialogOpen}
        toggleOpen={toggleLyricsEditDialogOpen}
        initialLyrics={effectiveLyricsText}
        title={title}
        artists={artists}
        duration={duration}
        songId={songId}
      />
    </>
  );
}
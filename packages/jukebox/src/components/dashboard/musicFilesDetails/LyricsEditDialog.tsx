import {
  AppBar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tab,
  Tabs, Toolbar
} from "@material-ui/core";
import { useCallback, useEffect, useMemo } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import { TabContext, TabPanel } from "@material-ui/lab";
import LyricsPreview from "./LyricsPreview";
import { Lyrics } from "lyrics-kit";
import { useSnackbar } from "notistack";
import EditLyrics from "./lyrics/EditLyrics";
import SearchLyrics from "./lyrics/SearchLyrics";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import TaggingLyrics from "./lyrics/TaggingLyrics";
import EditPlainLyrics from "./lyrics/EditPlainLyrics";
import EditTranslations from "./lyrics/EditTranslations";
import EditFurigana from "./lyrics/EditFurigana";
import { gql, useApolloClient } from "@apollo/client";

const WRITE_LYRICS_MUTATION = gql`
  mutation($fileId: Int!, $lyrics: String!, $ext: String!) {
    writeLyrics(fileId: $fileId, lyrics: $lyrics, ext: $ext)
  } 
`;

const WRITE_LYRICS_TO_FILE_MUTATION = gql`
  mutation($fileId: Int!, $lyrics: String!) {
    writeLyricsToMusicFile(fileId: $fileId, lyrics: $lyrics)
  } 
`;

const useStyles = makeStyles(() => ({
  content: {
    padding: 0,
  },
  tabs: {
    flexGrow: 1,
  },
}));

function PreviewPanel({ lyricsString, fileId }: {
  lyricsString: string,
  fileId: number,
}) {
  const snackbar = useSnackbar();
  const lyricsObj = useMemo(() => {
    if (!lyricsString) return null;
    try {
      return new Lyrics(lyricsString);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      snackbar.enqueueSnackbar(`Error while parsing lyrics: ${e}`, { variant: "error" });
      return null;
    }
  }, [lyricsString, snackbar]);
  return <LyricsPreview lyrics={lyricsObj} fileId={fileId} />;
}

interface Props {
  initialLrc?: string;
  initialLrcx?: string;
  refresh: () => void;
  fileId: number;
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;

  title?: string;
  artists?: string;
  duration: number;
  songId?: number;
}

export default function LyricsEditDialog({ initialLrc, initialLrcx, refresh, fileId, isOpen, toggleOpen, title, artists, duration, songId }: Props) {

  const [lrc, setLrc] = useNamedState(initialLrc || "", "lrc");
  const [lrcx, setLrcx] = useNamedState(initialLrcx || "", "lrcx");
  const styles = useStyles();
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const effectiveLyrics = lrcx || lrc;

  const [submitting, toggleSubmitting] = useNamedState(false, "submitting");
  useEffect(() => {
    setLrc(initialLrc);
    setLrcx(initialLrcx || initialLrc);
  }, [isOpen, initialLrc, initialLrcx, setLrc, setLrcx]);

  // Tab status
  const [tabIndex, setTabIndex] = useNamedState("preview", "tabIndex");
  const onTabSwitch = useCallback((event, newValue: string) => {
    setTabIndex(newValue);
  }, [setTabIndex]);

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setLrc("");
    setLrcx("");
  }, [toggleOpen, setLrc, setLrcx]);

  const handleSubmit = useCallback(async () => {
    // toggleOpen(false);
    toggleSubmitting(true);
    const promises = [];
    if (lrc) {
      promises.push(apolloClient.mutate<{writeLyrics: boolean}>({
        mutation: WRITE_LYRICS_MUTATION,
        variables: {fileId, lyrics: lrc, ext: "lrc"},
      }));
      const tagsStripped = lrc.replace(/^(\[[0-9:.]+\])/gm, "");
      promises.push(apolloClient.mutate<{writeLyrics: boolean}>({
        mutation: WRITE_LYRICS_TO_FILE_MUTATION,
        variables: {fileId, lyrics: tagsStripped},
      }));
    }
    if (lrcx && lrcx !== lrc) {
      promises.push(apolloClient.mutate<{writeLyrics: boolean}>({
        mutation: WRITE_LYRICS_MUTATION,
        variables: {fileId, lyrics: lrcx, ext: "lrcx"},
      }));
    }
    try {
      await Promise.all(promises);
      handleClose();
      refresh();
    } catch (e) {
      console.error(`Error occurred while saving: ${e}`, e);
      snackbar.enqueueSnackbar(`Error occurred while saving: ${e}`, { variant: "error" });
    }
    toggleSubmitting(false);
  }, [apolloClient, fileId, handleClose, lrc, lrcx, refresh, snackbar, toggleSubmitting]);

  return (
    <Dialog open={isOpen} onClose={handleClose} fullScreen maxWidth={false} scroll="paper"
            aria-labelledby="form-dialog-title">
      <TabContext value={tabIndex}>
        <AppBar position="static" color="default">
          <Toolbar disableGutters variant="dense">
            <Tabs value={tabIndex} onChange={onTabSwitch}
                  className={styles.tabs}
                  aria-label="Lyrics edit dialog tabs"
                  indicatorColor="secondary"
                  textColor="secondary"
                  variant="scrollable"
                  scrollButtons="auto"
            >
              <Tab label="Preview" value="preview" />
              <Tab label="Download" value="download" />
              <Tab label="Edit" value="edit" />
              <Tab label="Edit Plain" value="editLrc" />
              <Tab label="Tagging" value="tagging" />
              <Tab label="Translation" value="translation" />
              <Tab label="Furigana" value="furigana" />
            </Tabs>
            <IconButton color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <DialogContent dividers className={styles.content}>
          <TabPanel value="preview">
            <PreviewPanel lyricsString={effectiveLyrics} fileId={fileId} />
          </TabPanel>
          <TabPanel value="download">
            <SearchLyrics title={title} artists={artists} duration={duration} />
          </TabPanel>
          <TabPanel value="edit">
            <EditLyrics lyrics={lrcx} setLyrics={setLrcx} songId={songId} title={title} />
          </TabPanel>
          <TabPanel value="editLrc">
            <EditPlainLyrics lyrics={lrc} lrcx={lrcx} setLyrics={setLrc} />
          </TabPanel>
          <TabPanel value="tagging">
            <TaggingLyrics lyrics={lrcx} setLyrics={setLrcx} fileId={fileId} />
          </TabPanel>
          <TabPanel value="translation">
            <EditTranslations lyrics={lrcx} setLyrics={setLrcx} />
          </TabPanel>
          <TabPanel value="furigana">
            <EditFurigana lyrics={lrcx} setLyrics={setLrcx} />
          </TabPanel>
        </DialogContent>
      </TabContext>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button disabled={submitting} onClick={handleSubmit} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
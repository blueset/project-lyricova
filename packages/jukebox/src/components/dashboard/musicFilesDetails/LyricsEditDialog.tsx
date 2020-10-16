import {
  AppBar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Tab,
  Tabs, Toolbar
} from "@material-ui/core";
import { useCallback, useEffect, useMemo } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import { TabContext, TabPanel } from "@material-ui/lab";
import LyricsPreview from "./LyricsPreview";
import { Lyrics } from "lyrics-kit";
import lyrics from "./lyrics";
import { useSnackbar } from "notistack";
import EditLyrics from "./lyrics/EditLyrics";
import SearchLyrics from "./lyrics/SearchLyrics";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import TaggingLyrics from "./lyrics/TaggingLyrics";
import EditPlainLyrics from "./lyrics/EditPlainLyrics";

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
    if (!lyrics) return null;
    try {
      return new Lyrics(lyricsString);
    } catch (e) {
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

  const handleSubmit = useCallback(() => {
    // toggleOpen(false);
    toggleSubmitting(true);
    toggleSubmitting(false);
  }, [toggleSubmitting]);

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
              <Tab label="Inline" value="inline" />
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
          <TabPanel value="inline">Inline</TabPanel>
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
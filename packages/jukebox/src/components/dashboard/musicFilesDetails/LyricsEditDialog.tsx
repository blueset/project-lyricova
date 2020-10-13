import { AppBar, Button, Dialog, DialogActions, Divider, Tab, Tabs } from "@material-ui/core";
import { useCallback, useEffect, useMemo } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import { TabContext, TabPanel } from "@material-ui/lab";
import LyricsPreview from "./LyricsPreview";
import { Lyrics } from "lyrics-kit";
import lyrics from "./lyrics";
import { useSnackbar } from "notistack";
import EditLyrics from "./lyrics/EditLyrics";
import SearchLyrics from "./lyrics/SearchLyrics";

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
  initialLyrics?: string;
  refresh: () => void;
  fileId: number;
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;

  title?: string;
  artists?: string;
  duration: number;
}

export default function LyricsEditDialog({ initialLyrics, refresh, fileId, isOpen, toggleOpen, title, artists, duration }: Props) {

  const [lyrics, setLyrics] = useNamedState(initialLyrics || "", "lyrics");


  const [submitting, toggleSubmitting] = useNamedState(false, "submitting");
  useEffect(() => setLyrics(initialLyrics), [initialLyrics, setLyrics]);


  // Tab status
  const [tabIndex, setTabIndex] = useNamedState("preview", "tabIndex");
  const onTabSwitch = useCallback((event, newValue: string) => {
    setTabIndex(newValue);
  }, [setTabIndex]);

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setLyrics("");
  }, [toggleOpen, setLyrics]);

  const handleSubmit = useCallback(() => {
    // toggleOpen(false);
    toggleSubmitting(true);
    toggleSubmitting(false);
  }, [toggleSubmitting]);

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth={false} aria-labelledby="form-dialog-title"
            scroll="paper">
      <TabContext value={tabIndex}>
        <AppBar position="static" color="default">
          <Tabs value={tabIndex} onChange={onTabSwitch}
                aria-label="Lyrics edit dialog tabs"
                indicatorColor="secondary"
                textColor="secondary"
                variant="scrollable"
                scrollButtons="auto"
          >
            <Tab label="Preview" value="preview" />
            <Tab label="Download" value="download" />
            <Tab label="Edit" value="edit" />
            <Tab label="Tagging" value="tagging" />
            <Tab label="Inline" value="inline" />
          </Tabs>
        </AppBar>
        <TabPanel value="preview">
          <PreviewPanel lyricsString={lyrics} fileId={fileId} />
        </TabPanel>
        <TabPanel value="download">
          <SearchLyrics title={title} artists={artists} duration={duration} />
        </TabPanel>
        <TabPanel value="edit">
          <EditLyrics lyrics={lyrics} setLyrics={setLyrics} />
        </TabPanel>
        <TabPanel value="tagging">Tagging</TabPanel>
        <TabPanel value="inline">Inline</TabPanel>
      </TabContext>
      <Divider />
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
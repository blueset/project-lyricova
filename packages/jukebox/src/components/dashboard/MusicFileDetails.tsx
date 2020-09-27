import { gql, useLazyQuery } from "@apollo/client";
import { MusicFile } from "../../models/MusicFile";
import { AppBar, Button, Card, CardActions, Divider, Tab, Tabs } from "@material-ui/core";
import { useCallback, useEffect } from "react";
import { useNamedState } from "../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core/styles";
import { TabContext, TabPanel } from "@material-ui/lab";
import { Field, Form, Formik } from "formik";
import { TextField } from "formik-material-ui";
import InfoPanel from "./musicFilesDetails/info";

const SINGLE_FILE_DATA = gql`
  query($id: Int!) {
    musicFile(id: $id) {
      id
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      songId
      song {
        name
      }
    }
  }
`;

const useStyle = makeStyles((theme) => ({
  card: {
    margin: theme.spacing(2),
  },
}));

interface MusicFileDetailsProps {
  fileId?: number;
}

export default function MusicFileDetails({fileId}: MusicFileDetailsProps) {

  const styles = useStyle();

  const [getFile, fileData] = useLazyQuery<{
    musicFile: MusicFile,
  }>(SINGLE_FILE_DATA, {variables: {id: fileId}});

  useEffect(() => {
    if (fileId != null) {
      getFile();
    }
  }, [fileId, getFile]);

  const [tabIndex, setTabIndex] = useNamedState("info","tabIndex");

  const onTabSwitch = useCallback((event, newValue: string) => {
    setTabIndex(newValue);
  }, [setTabIndex]);

  return <>
    <Card className={styles.card}>
      <TabContext value={tabIndex}>
      <AppBar position="static" color="default">
        <Tabs value={tabIndex} onChange={onTabSwitch}
              aria-label="Music file details tabs"
              indicatorColor="secondary"
              textColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
        >
          <Tab label="Info" value="info"/>
          <Tab label="Cover art" value="cover-art"/>
          <Tab label="Lyrics" value="lyrics"/>
          <Tab label="Playlists" value="playlists"/>
        </Tabs>
      </AppBar>
      <TabPanel value="info">
        <InfoPanel
          trackName={fileData.data?.musicFile.trackName ?? ""}
          trackSortOrder={fileData.data?.musicFile.trackSortOrder ?? ""}
          artistName={fileData.data?.musicFile.artistName ?? ""}
          artistSortOrder={fileData.data?.musicFile.artistSortOrder ?? ""}
          albumName={fileData.data?.musicFile.albumName ?? ""}
          albumSortOrder={fileData.data?.musicFile.albumSortOrder ?? ""}
          song={fileData.data?.musicFile.song ?? null}
          album={fileData.data?.musicFile.album ?? null}
          fileId={fileId} />
      </TabPanel>
      <TabPanel value="cover-art">Cover art</TabPanel>
      <TabPanel value="lyrics">Lyrics</TabPanel>
      <TabPanel value="playlists">Playlists</TabPanel>
      </TabContext>
      <Divider />
      <CardActions>
        <Button color="secondary">Mark as reviewed</Button>
      </CardActions>
    </Card>
  </>;
}
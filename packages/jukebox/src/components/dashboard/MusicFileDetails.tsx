import { gql, useLazyQuery } from "@apollo/client";
import { MusicFile } from "../../models/MusicFile";
import { AppBar, Button, Card, CardActions, CardContent, Tab, Tabs } from "@material-ui/core";
import { useCallback, useEffect } from "react";
import { useNamedState } from "../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core/styles";
import { TabContext, TabPanel } from "@material-ui/lab";

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
    {fileData.data?.musicFile.trackName ?? "..."}, {fileData.data?.musicFile.trackSortOrder ?? "..."}
    <Card className={styles.card}>
      <TabContext value={tabIndex}>
      <AppBar position="static" color="default">
        <Tabs value={tabIndex} onChange={onTabSwitch}
              aria-label="Music file details tabs"
              indicatorColor="secondary"
              textColor="secondary"
        >
          <Tab label="Info" value="info"/>
          <Tab label="VocaDB" value="voca-db"/>
          <Tab label="Cover art" value="cover-art"/>
          <Tab label="Lyrics" value="lyrics"/>
          <Tab label="Playlists" value="playlists"/>
        </Tabs>
      </AppBar>
      <TabPanel value="info">Info</TabPanel>
      <TabPanel value="voca-db">VocaDB</TabPanel>
      <TabPanel value="cover-art">Cover art</TabPanel>
      <TabPanel value="lyrics">Lyrcs</TabPanel>
      <TabPanel value="playlists">Playlists</TabPanel>
      </TabContext>
      <CardActions>
        <Button color="secondary">Mark as reviewed</Button>
      </CardActions>
    </Card>
  </>;
}
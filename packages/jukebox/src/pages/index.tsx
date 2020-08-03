import { Grid } from "@material-ui/core";
import style from "./index.module.scss";
import Player from "../components/public/Player";
import DetailsPanel from "../components/public/DetailsPanel";
import React, { RefObject } from "react";
import { gql, useQuery, QueryResult } from "@apollo/client";

const MUSIC_FILES_QUERY = gql`
  query GetMusicFiles {
    musicFiles {
      totalCount
    }
  }
`;

export default function Index() {
  const playerRef: RefObject<HTMLAudioElement> = React.createRef();
  const mediaFilesQuery = useQuery(MUSIC_FILES_QUERY);

  let node;
  if (mediaFilesQuery.loading) {
    node = <div>Loading</div>;
  } else if (mediaFilesQuery.error) {
    node = <div>Error: {mediaFilesQuery.error}</div>;
  } else {
    node = <div>{JSON.stringify(mediaFilesQuery.data)}</div>;
  }
  return (
    <>
      <audio ref={playerRef} src="api/files/493/file"></audio>
      <Grid container spacing={0} className={style.gridContainer}>
        <Grid item lg={3} sm={4} xs={12} className={style.playerGridItem}>
          <Player playerRef={playerRef}></Player>
        </Grid>
        <Grid item lg={9} sm={8} xs={12}>
          {node}
          <DetailsPanel></DetailsPanel>
        </Grid>
      </Grid>
    </>
  );
}

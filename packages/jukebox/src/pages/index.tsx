import { Grid } from "@material-ui/core";
import style from "./index.module.scss";
import Player from "../components/public/Player";
import DetailsPanel from "../components/public/DetailsPanel";
import React, { RefObject } from "react";
import Head from "next/head";

export default class Index extends React.Component {
  private playerRef: RefObject<HTMLAudioElement>;

  constructor(props: {}) {
    super(props);
    this.playerRef = React.createRef();
  }
  render() {
    return (
      <>
        <Head>
          <title>Lyricova Jukebox</title>
        </Head>
        <audio ref={this.playerRef} src="api/files/493/file"></audio>
        <Grid container spacing={0} className={style.gridContainer}>
          <Grid item lg={3} sm={4} xs={12} className={style.playerGridItem}>
            <Player playerRef={this.playerRef}></Player>
          </Grid>
          <Grid item lg={9} sm={8} xs={12}>
            <DetailsPanel></DetailsPanel>
          </Grid>
        </Grid>
      </>
    );
  }
}

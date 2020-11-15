import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import ArtistsList from "../../../components/public/library/ArtistsList";
import { VDBArtistType } from "../../../types/vocadb";
import { gql, useQuery } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import { Artist } from "../../../models/Artist";
import { Alert } from "@material-ui/lab";
import { Avatar, Box, ButtonBase, Divider, Grid, Typography } from "@material-ui/core";
import { NextComposedLink } from "../../../components/Link";
import RecentActorsIcon from "@material-ui/icons/RecentActors";
import React from "react";
import { Playlist } from "../../../models/Playlist";
import PlaylistAvatar from "../../../components/PlaylistAvatar";


const PLAYLISTS_LIST_QUERY = gql`
  query {
    playlists {
      slug
      name
      filesCount
    }
  }
`;

const useStyles = makeStyles((theme) => ({
  item: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    height: "4rem",
    width: "4rem",
    marginRight: theme.spacing(1),
    fontSize: "2.25em",
  },
  text: {
    flexGrow: 1,
    width: 0,
  }
}));

export default function PlaylistsList() {
  const query = useQuery<{ playlists: Playlist[] }>(PLAYLISTS_LIST_QUERY);
  const styles = useStyles();

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error) return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  return (
    <Box p={4}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="overline">{query.data.playlists.length} playlists</Typography>
          <Divider />
        </Grid>
        {query.data.playlists.map(v =>
          <Grid item xs={12} md={6} key={`playlist-${v.slug}`}>
            <ButtonBase component={NextComposedLink} href={`/library/playlists/${v.slug}`} className={styles.item}>
              <PlaylistAvatar name={v.name} slug={v.slug} className={styles.image} />
              <div className={styles.text}>
                <Typography variant="body1">{v.name}</Typography>
                <Typography variant="body2"
                            color="textSecondary">{v.filesCount} {v.filesCount < 2 ? "file" : "files"}</Typography>
              </div>
            </ButtonBase>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

PlaylistsList.layout = getLayout;
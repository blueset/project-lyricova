import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import {
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import { NextComposedLink } from "lyricova-common/components/Link";
import React from "react";
import type { Playlist } from "lyricova-common/models/Playlist";
import PlaylistAvatar, { gradients } from "../../../components/PlaylistAvatar";
import type { DocumentNode } from "graphql";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalPlayIcon from "@mui/icons-material/LocalPlay";
import WhatshotIcon from "@mui/icons-material/Whatshot";

const PLAYLISTS_LIST_QUERY = gql`
  query {
    playlists {
      slug
      name
      filesCount
    }
  }
` as DocumentNode;

export default function PlaylistsList() {
  const query = useQuery<{ playlists: Playlist[] }>(PLAYLISTS_LIST_QUERY);

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error)
    return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  return (
    <Box p={4}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="overline">
            {query.data.playlists.length} curated playlists
          </Typography>
          <Divider />
        </Grid>
        {query.data.playlists.map((v) => (
          <Grid item xs={12} md={6} key={`playlist-${v.slug}`}>
            <ButtonBase
              component={NextComposedLink}
              href={`/library/playlists/${v.slug}`}
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <PlaylistAvatar
                name={v.name}
                slug={v.slug}
                sx={{
                  height: "4rem",
                  width: "4rem",
                  marginRight: 1,
                  fontSize: "2.25em",
                }}
              />
              <div style={{ flexGrow: 1, width: 0 }}>
                <Typography variant="body1">{v.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {v.filesCount} {v.filesCount < 2 ? "file" : "files"}
                </Typography>
              </div>
            </ButtonBase>
          </Grid>
        ))}
        <Grid item xs={12}>
          <Typography variant="overline">3 generated playlists</Typography>
          <Divider />
        </Grid>
        <Grid item xs={12} md={6}>
          <ButtonBase
            component={NextComposedLink}
            href="/library/playlists/new"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                height: "4rem",
                width: "4rem",
                marginRight: 1,
                fontSize: "2.25em",
                color: "white",
                backgroundImage: `linear-gradient(225deg, ${gradients[1].colors.join(
                  ", "
                )})`,
              }}
            >
              <AutoAwesomeIcon fontSize="inherit" />
            </Avatar>
            <div style={{ flexGrow: 1, width: 0 }}>
              <Typography variant="body1">Recently added</Typography>
              <Typography variant="body2" color="textSecondary">
                Tracks added in 30 days
              </Typography>
            </div>
          </ButtonBase>
        </Grid>
        <Grid item xs={12} md={6}>
          <ButtonBase
            component={NextComposedLink}
            href="/library/playlists/recent"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                height: "4rem",
                width: "4rem",
                marginRight: 1,
                fontSize: "2.25em",
                color: "white",
                backgroundImage: `linear-gradient(225deg, ${gradients[2].colors.join(
                  ", "
                )})`,
              }}
            >
              <LocalPlayIcon fontSize="inherit" />
            </Avatar>
            <div style={{ flexGrow: 1, width: 0 }}>
              <Typography variant="body1">Recently played</Typography>
              <Typography variant="body2" color="textSecondary">
                Tracks played in 30 days
              </Typography>
            </div>
          </ButtonBase>
        </Grid>
        <Grid item xs={12} md={6}>
          <ButtonBase
            component={NextComposedLink}
            href="/library/playlists/popular"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                height: "4rem",
                width: "4rem",
                marginRight: 1,
                fontSize: "2.25em",
                color: "white",
                backgroundImage: `linear-gradient(225deg, ${gradients[3].colors.join(
                  ", "
                )})`,
              }}
            >
              <WhatshotIcon fontSize="inherit" />
            </Avatar>
            <div style={{ flexGrow: 1, width: 0 }}>
              <Typography variant="body1">Most played</Typography>
              <Typography variant="body2" color="textSecondary">
                Most played tracks
              </Typography>
            </div>
          </ButtonBase>
        </Grid>
      </Grid>
    </Box>
  );
}

PlaylistsList.layout = getLayout;

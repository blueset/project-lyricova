import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { makeStyles } from "@mui/material/styles";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import React, { ReactNode } from "react";
import { Album } from "../../../models/Album";
import { Avatar, Box, ButtonBase, Grid, Typography } from "@mui/material";
import { NextComposedLink } from "../../../components/Link";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import { DocumentNode } from "graphql";

const ALBUMS_QUERY = gql`
  query {
    albumsHasFiles {
      id
      name
      sortOrder
      coverUrl
      artists {
        name
        ArtistOfAlbum {
          categories
        }
      }
    }
  }
` as DocumentNode;

export default function LibraryAlbums() {
  const query = useQuery<{ albumsHasFiles: Album[] }>(ALBUMS_QUERY);

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error) return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  return (
    <Grid gap={2} sx={{padding: 2}} xs={2} md={4} lg={6} xl={8}>
      {query.data.albumsHasFiles.map(val => {
        return (
          <Box key={val.id} sx={{minWidth: 0}}>
            <ButtonBase sx={{width: "100%"}} component={NextComposedLink} href={`/library/albums/${val.id}`}>
              <Avatar sx={{
                width: "100%",
                height: 0,
                overflow: "hidden",
                paddingTop: "100%",
                position: "relative",
                marginBottom: 1,
                "&:hover": {
                  filter: "brightness(1.2)",
                },
                "& > img": {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                },
              }} src={val.coverUrl || "/images/disk-512.jpg"} variant="rounded" />
            </ButtonBase>
            <Typography variant="body2" noWrap>{val.name}</Typography>
            <Typography variant="body2" color="textSecondary" noWrap>{formatArtistsPlainText(val.artists)}</Typography>
          </Box>
        );
      })}
    </Grid>
  );
}

LibraryAlbums.layout = getLayout;
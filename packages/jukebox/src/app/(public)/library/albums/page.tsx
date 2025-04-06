"use client";

import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import React from "react";
import type { Album } from "@lyricova/api/graphql/types";
import { Avatar, ButtonBase, Grid, Typography } from "@mui/material";
import { NextComposedLink, formatArtistsPlainText } from "@lyricova/components";
import type { DocumentNode } from "graphql";

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
  if (query.error)
    return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  return (
    <Grid container spacing={2} sx={{ padding: 2 }}>
      {query.data.albumsHasFiles.map((val) => {
        return (
          <Grid
            key={val.id}
            sx={{ minWidth: 0 }}
            size={{
              xs: 6,
              md: 3,
              lg: 2,
              xl: 2,
            }}
          >
            <ButtonBase
              sx={{ width: "100%" }}
              component={NextComposedLink}
              href={`/library/albums/${val.id}`}
            >
              <Avatar
                sx={{
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
                }}
                src={val.coverUrl || "/images/disk-512.jpg"}
                slotProps={{
                  img: {
                    loading: "lazy",
                  },
                }}
                variant="rounded"
              />
            </ButtonBase>
            <Typography variant="body2" noWrap lang="ja">
              {val.name}
            </Typography>
            <Typography variant="body2" color="textSecondary" noWrap lang="ja">
              {formatArtistsPlainText(val.artists)}
            </Typography>
          </Grid>
        );
      })}
    </Grid>
  );
}

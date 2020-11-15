import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import { makeStyles } from "@material-ui/core/styles";
import { gql, useQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import React, { ReactNode } from "react";
import { Album } from "../../../models/Album";
import { Avatar, ButtonBase, Typography } from "@material-ui/core";
import { NextComposedLink } from "../../../components/Link";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";

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
`;

const useStyles = makeStyles((theme) => ({
  grid: {
    display: "grid",
    // Using `2, 2` to force `theme.spacing` to generate a string.
    // by default `theme.spacing(2)` only produces a number which the csx converter cannot attach unit
    // properly on the `gap` property.
    gap: theme.spacing(2, 2),
    padding: theme.spacing(2),
    [theme.breakpoints.up("xs")]: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    [theme.breakpoints.up("md")]: {
      gridTemplateColumns: "repeat(4, 1fr)",
    },
    [theme.breakpoints.up("lg")]: {
      gridTemplateColumns: "repeat(6, 1fr)",
    },
    [theme.breakpoints.up("xl")]: {
      gridTemplateColumns: "repeat(8, 1fr)",
    },
  },
  cell: {
    minWidth: 0,
  },
  buttonBase: {
    width: "100%",
  },
  cover: {
    width: "100%",
    height: 0,
    overflow: "hidden",
    paddingTop: "100%",
    position: "relative",
    marginBottom: theme.spacing(1),
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
  },
}));

export default function LibraryAlbums() {
  const styles = useStyles();
  const query = useQuery<{ albumsHasFiles: Album[] }>(ALBUMS_QUERY);

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error) return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  return (
    <div className={styles.grid}>
      {query.data.albumsHasFiles.map(val => {
        return (
          <div key={val.id} className={styles.cell}>
            <ButtonBase className={styles.buttonBase} component={NextComposedLink} href={`/library/albums/${val.id}`}>
              <Avatar className={styles.cover} src={val.coverUrl || "/images/disk-512.jpg"} variant="rounded" />
            </ButtonBase>
            <Typography variant="body2" noWrap>{val.name}</Typography>
            <Typography variant="body2" color="textSecondary" noWrap>{formatArtistsPlainText(val.artists)}</Typography>
          </div>
        );
      })}
    </div>
  );
}

LibraryAlbums.layout = getLayout;
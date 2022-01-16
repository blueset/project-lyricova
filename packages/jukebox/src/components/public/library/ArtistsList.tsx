import { VDBArtistType } from "../../../types/vocadb";
import { gql, useQuery } from "@apollo/client";
import { Artist } from "../../../models/Artist";
import { Alert } from "@material-ui/lab";
import React from "react";
import { Avatar, Box, ButtonBase, Divider, Grid, Typography } from "@mui/material";
import { makeStyles } from "@mui/material/styles";
import RecentActorsIcon from "@mui/icons-material/RecentActors";
import { NextComposedLink } from "../../Link";
import { DocumentNode } from "graphql";

const ARTISTS_LIST_QUERY = gql`
  query($types: [String!]!) {
    artistsHasFiles(types: $types) {
      id
      name
      sortOrder
      type
      mainPictureUrl
    }
  }
` as DocumentNode;

interface Props {
  types: VDBArtistType[],
  typeName: "producers" | "vocalists";
}

export default function ArtistsList({ types, typeName }: Props) {
  const query = useQuery<{ artistsHasFiles: Artist[] }>(ARTISTS_LIST_QUERY, { variables: { types } });

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error) return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  let lastKey: string | null = null;
  const convertedList: (Artist | string)[] = [];

  query.data.artistsHasFiles.forEach(i => {
    let key: string;
    if (i.sortOrder === null || i.sortOrder === "") key = "?";
    else {
      const firstChar = i.sortOrder.charAt(0);
      if (firstChar.codePointAt(0) < 65 /* "A" */) key = "#";
      else key = firstChar.toLocaleUpperCase();
    }
    if (key !== lastKey) {
      convertedList.push(key);
      lastKey = key;
    }
    convertedList.push(i);
  });

  return (
    <Box p={4}>
      <Grid container spacing={2}>
        {convertedList.map(v => {
          if (typeof v === "string") {
            return <Grid item xs={12} key={`header-${v}`}>
              <Typography variant="h6">{v}</Typography>
              <Divider />
            </Grid>;
          } else {
            return <Grid item xs={12} md={6} key={`artist-${v.id}`}>
              <ButtonBase component={NextComposedLink} href={`/library/${typeName}/${v.id}`} sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}>
                <Avatar variant="rounded" src={v.mainPictureUrl} sx={{
                  height: "3em",
                  width: "3em",
                  marginRight: 1,
                }}>
                  <RecentActorsIcon fontSize="large" />
                </Avatar>
                <div style={{flexGrow: 1, width: 0,}}>
                  <Typography variant="body1">{v.name}</Typography>
                  <Typography variant="body2" color="textSecondary">{v.type}</Typography>
                </div>
              </ButtonBase>
            </Grid>;
          }
        })}
      </Grid>
    </Box>
  );
}
import { gql, useQuery } from "@apollo/client";
import { makeStyles } from "@mui/material/styles";
import { MusicFile } from "../../models/MusicFile";
import { useRouter } from "next/router";
import React, { ReactNode, useCallback, useMemo } from "react";
import { Avatar, Box, Chip, Divider, Grid, styled, Typography, Alert } from "@mui/material";
import clsx from "clsx";
import { Artist } from "../../models/Artist";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ButtonRow from "../ButtonRow";
import { NextComposedLink } from "../Link";
import { formatTime } from "../../frontendUtils/strings";
import filesize from "filesize";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { DocumentNode } from "graphql";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";
import { Theme } from "@emotion/react";

const SINGLE_FILE_SONG_QUERY = gql`
  query($id: Int!) {
    musicFile(id: $id) {
      id
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      hasCover
      duration
      fileSize

      song {
        id
        artists {
          id
          name
          ArtistOfSong {
            categories
          }
        }
      }

      album {
        id
        name
      }
    }
  }
` as DocumentNode;

const ResponsiveTableCellSx: SxProps<Theme> = {
  display: {md: "table-cell"},
  paddingTop: {md: 1},
  paddingBottom: {md: 1},
  borderBottom: {md: 1},
  borderBottomColor: {md: "divider"},
};

interface Props {
  partialFile: Partial<MusicFile>;
  fileId: number | null;
}

export default function FileSongInfo({ partialFile, fileId }: Props) {
  const idToQuery = fileId ?? partialFile.id;

  const query = useQuery<{ musicFile: MusicFile }>(SINGLE_FILE_SONG_QUERY, { variables: { id: idToQuery } });
  const router = useRouter();

  let banner: ReactNode = null;
  if (query.loading) banner = <Alert severity="info">Loading...</Alert>;
  else if (query.error) banner = <Alert severity="error">Error: {`${query.error}`}</Alert>;

  const file: Partial<MusicFile> = query.data?.musicFile ?? (
    fileId == null ? partialFile : {
      id: fileId, trackName: "", artistName: "", albumName: "", hasCover: false, fileSize: 0, duration: 0,
    }
  );

  const TableRow = useCallback(({ heading, children }: { heading: ReactNode, children: ReactNode }) =>
    <Box sx={{display: {md: "table-row"},}}>
      <Typography sx={{
        ...ResponsiveTableCellSx,
        minWidth: "8em",
        width: "30%",
        maxWidth: "20em",
      }} variant="overline"
      color="textSecondary">{heading}</Typography>
      <Typography sx={ResponsiveTableCellSx} variant="body1">{children}</Typography>
      <Divider sx={{display: {md: "none"}}} />
    </Box>, []
  );

  const [producers, vocalists] = useMemo((): [Artist[], Artist[]] => {
    const song = file.song;
    const producers: Artist[] = [], vocalists: Artist[] = [];

    if (song?.artists) {
      for (const i of song.artists) {
        const categories = i?.ArtistOfSong?.categories || [i.ArtistOfAlbum?.categories];
        if (categories.indexOf("Producer") >= 0 || categories.indexOf("Circle") >= 0) {
          producers.push(i);
        } else if (categories.indexOf("Vocalist") >= 0) {
          vocalists.push(i);
        }
      }
    }

    return [producers, vocalists];
  }, [file.song]);

  return (
    <>
      {fileId !== null &&
      <Chip label="Now playing" icon={<ArrowBackIcon />} clickable
            sx={{marginBottom: 4}}
            variant="outlined" onClick={() => router.push("/info")}
      />
      }
      {banner}
      <Grid container spacing={2}>
        {file.hasCover && <Grid item md={4} xs={12}>
            <Box sx={{
              position: {md: "sticky"},
              top: {md: 2},
              marginBottom: 4,
            }}>
              {file.hasCover &&
              <Avatar variant="rounded" src={`/api/files/${file.id}/cover`} sx={{
                width: "calc(100% - 16px)",
                paddingTop: "calc(100% - 16px)",
                height: 0,
                overflow: "hidden",
                position: "relative",
                marginBottom: 2,
                "& > img": {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                },
              }} />}
            </Box>
        </Grid>}
        <Grid item md={file.hasCover ? 8 : 12} xs={12}>
          <Typography variant="overline" color="textSecondary">
            {fileId == null ? "Now playing" : "File details"}
          </Typography>
          <Typography sx={{lineHeight: 1.2, fontWeight: "bold",}} variant="h5">{file.trackName}</Typography>
          <Typography sx={{lineHeight: 1.2,}} variant="h6">{file.artistName}</Typography>
          <Typography sx={{lineHeight: 1.2,}} variant="body1" color="textSecondary">{file.albumName}</Typography>

          <Box sx={{
            marginTop: 2,
            marginBottom: 2,
            display: {md: "table"},
            width: {md: "100%"},
            borderCollapse: {md: "collapse"},
            tableLayout: {md: "fixed"},
          }}>
            {producers.length > 0 && <TableRow heading="Producers">
                <ButtonRow sx={{margin: 0}}>
                  {
                    producers.map(v =>
                      <Chip label={v.name} component={NextComposedLink}
                            href={`/library/producers/${v.id}`} clickable
                            variant="outlined" key={v.id} />
                    )
                  }
                </ButtonRow>
            </TableRow>}
            {vocalists.length > 0 && <TableRow heading="Vocalists">
                <ButtonRow sx={{margin: 0}}>
                  {
                    vocalists.map(v =>
                      <Chip label={v.name} component={NextComposedLink}
                            href={`/library/vocalists/${v.id}`} clickable
                            variant="outlined" key={v.id} />
                    )
                  }
                </ButtonRow>
            </TableRow>}
            {file.album && <TableRow heading="Album">
                <Chip label={file.album.name} component={NextComposedLink}
                      href={`/library/albums/${file.album.id}`} clickable
                      variant="outlined" />
            </TableRow>}
            {file.trackSortOrder && <TableRow heading="Title sort key">{file.trackSortOrder}</TableRow>}
            {file.artistSortOrder && <TableRow heading="Artist sort key">{file.artistSortOrder}</TableRow>}
            {file.albumSortOrder && <TableRow heading="Album sort key">{file.albumSortOrder}</TableRow>}
            <TableRow heading="Duration">{formatTime(file.duration)}</TableRow>
            <TableRow heading="File size">{filesize(file.fileSize)}</TableRow>
            {file.song?.id >= 0 && <TableRow heading="External links">
                <Chip label="VocaDB" component={NextComposedLink}
                      target="_blank" href={`https://vocadb.net/S/${file.song.id}`} clickable
                      icon={<OpenInNewIcon fontSize="small" />} variant="outlined" />
            </TableRow>}
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

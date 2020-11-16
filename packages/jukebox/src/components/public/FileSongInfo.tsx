import { gql, useQuery } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import { MusicFile } from "../../models/MusicFile";
import { useRouter } from "next/router";
import React, { ReactNode, useCallback, useMemo } from "react";
import { Alert } from "@material-ui/lab";
import { Avatar, Chip, Divider, Grid, Typography } from "@material-ui/core";
import clsx from "clsx";
import { Artist } from "../../models/Artist";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ButtonRow from "../ButtonRow";
import { NextComposedLink } from "../Link";
import { formatTime } from "../../frontendUtils/strings";
import filesize from "filesize";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

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
`;

const useStyles = makeStyles((theme) => ({
  cover: {
    width: "calc(100% - 16px)",
    paddingTop: "calc(100% - 16px)",
    height: 0,
    overflow: "hidden",
    position: "relative",
    marginBottom: theme.spacing(2),
    "& > img": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    },
  },
  sidePanel: {
    [theme.breakpoints.up("md")]: {
      position: "sticky",
      top: theme.spacing(2),
    },
    marginBottom: theme.spacing(4),
  },
  headings: {
    lineHeight: 1.2,
  },
  majorHeadings: {
    fontWeight: "bold",
  },
  responsiveTable: {
    margin: theme.spacing(2, 0),
    [theme.breakpoints.up("md")]: {
      display: "table",
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
  },
  responsiveTableRow: {
    [theme.breakpoints.up("md")]: {
      display: "table-row",
    },
  },
  responsiveTableCell: {
    [theme.breakpoints.up("md")]: {
      display: "table-cell",
      padding: theme.spacing(1, 0),
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  responsiveTableCellHeader: {
    [theme.breakpoints.up("md")]: {
      minWidth: "8em",
      width: "30%",
      maxWidth: "20em",
    },
  },
  responsiveTableDivider: {
    [theme.breakpoints.up("md")]: {
      display: "none",
    },
  },
  artistButtonRow: {
    margin: 0,
  },
  navigationRow: {
    marginBottom: theme.spacing(4),
  },
}));

interface Props {
  partialFile: Partial<MusicFile>;
  fileId: number | null;
}

export default function FileSongInfo({ partialFile, fileId }: Props) {

  const idToQuery = fileId == null ? partialFile.id : fileId;

  const query = useQuery<{ musicFile: MusicFile }>(SINGLE_FILE_SONG_QUERY, { variables: { id: idToQuery } });
  const styles = useStyles();
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
    <div className={styles.responsiveTableRow}>
      <Typography className={clsx(styles.responsiveTableCell, styles.responsiveTableCellHeader)} variant="overline"
                  color="textSecondary">{heading}</Typography>
      <Typography className={styles.responsiveTableCell} variant="body1">{children}</Typography>
      <Divider className={styles.responsiveTableDivider} />
    </div>, [styles]
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
            className={styles.navigationRow}
            variant="outlined" onClick={() => router.push("/info")}
      />
      }
      {banner}
      <Grid container spacing={2}>
        {file.hasCover && <Grid item md={4} xs={12}>
            <div className={styles.sidePanel}>
              {file.hasCover &&
              <Avatar variant="rounded" src={`/api/files/${file.id}/cover`} className={styles.cover} />}
            </div>
        </Grid>}
        <Grid item md={file.hasCover ? 8 : 12} xs={12}>
          <Typography variant="overline" color="textSecondary">
            {fileId == null ? "Now playing" : "File details"}
          </Typography>
          <Typography className={clsx(styles.headings, styles.majorHeadings)} variant="h5">{file.trackName}</Typography>
          <Typography className={styles.headings} variant="h6">{file.artistName}</Typography>
          <Typography className={styles.headings} variant="body1" color="textSecondary">{file.albumName}</Typography>

          <div className={styles.responsiveTable}>
            {producers.length > 0 && <TableRow heading="Producers">
                <ButtonRow className={styles.artistButtonRow}>
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
                <ButtonRow className={styles.artistButtonRow}>
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
          </div>
        </Grid>
      </Grid>
    </>
  );
}

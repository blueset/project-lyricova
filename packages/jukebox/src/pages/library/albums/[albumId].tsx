import { useRouter } from "next/router";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import {
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton,
  List,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Typography
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { makeStyles } from "@material-ui/core/styles";
import { gql, useQuery } from "@apollo/client";
import { AlbumFragments, MusicFileFragments } from "../../../graphql/fragments";
import { Alert } from "@material-ui/lab";
import React, { Fragment } from "react";
import { Album } from "../../../models/Album";
import _ from "lodash";
import filesize from "filesize";
import { Song } from "../../../models/Song";
import ButtonRow from "../../../components/ButtonRow";
import PlaylistPlayIcon from "@material-ui/icons/PlaylistPlay";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import FindInPageIcon from "@material-ui/icons/FindInPage";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import { formatArtists } from "../../../frontendUtils/artists";
import Link from "../../../components/Link";
import { useAppContext } from "../../../components/public/AppContext";
import { useAuthContext } from "../../../components/public/AuthContext";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import { MusicFile } from "../../../models/MusicFile";
import TrackListRow from "../../../components/public/library/TrackListRow";

const ALBUM_QUERY = gql`
  query($id: Int!) {
    album(id: $id) {
      files {
        ...MusicFileForPlaylistAttributes
        duration
        fileSize
        songId
      }
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

type ConvertedTrack = Song & {
  foundFile: MusicFile | null;
};

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
  },
  navigationRow: {
    margin: theme.spacing(1, 0),
  },
  trackInfoRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing(1),
  },
  trackInfoMain: {
    flexGrow: 1,
  },
  grid: {
    marginTop: theme.spacing(2),
  },
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
  subheader: {
    backgroundColor: theme.palette.background.default,
  },
  sidePanel: {
    [theme.breakpoints.up("md")]: {
      position: "sticky",
      top: 0,
    },
    marginBottom: theme.spacing(4),
  },
}));

export default function LibrarySingleAlbum() {
  const router = useRouter();
  const { playlist } = useAppContext();
  const { user } = useAuthContext();
  const albumId = parseInt(router.query.albumId as string);
  const styles = useStyles();
  const popupState = usePopupState({ variant: "popover", popupId: "single-album-overflow-menu" });

  const query = useQuery<{ album: Album }>(ALBUM_QUERY, { variables: { id: albumId } });

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error) return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  const album = query.data.album;
  const trackCount = album.files.length;
  const totalMinutes = Math.round(_.sumBy(album.files, "duration") / 60);
  const totalSize = _.sumBy(album.files, "fileSize");
  const canPlay = trackCount > 0;

  const convertedTracks =
    _.sortBy(
      album.songs.map(v => ({
        ...v,
        foundFile: album.files.find(f => f.songId === v.id) ?? null
      } as ConvertedTrack)),
      v => v.SongInAlbum.diskNumber, v => v.SongInAlbum.trackNumber
    );

  const diskSeparatedTracked: (ConvertedTrack | number | null)[] = [];

  for (const i of convertedTracks) {
    if (diskSeparatedTracked.length < 1 ||
      (
        (diskSeparatedTracked[diskSeparatedTracked.length - 1] as ConvertedTrack).SongInAlbum?.diskNumber != i.SongInAlbum.diskNumber
      )
    ) {
      diskSeparatedTracked.push(i.SongInAlbum.diskNumber);
    }
    diskSeparatedTracked.push(i);
  }

  const playAll = () => playlist.loadTracks(album.files);
  const shuffleAll = () => {
    playAll();
    playlist.toggleShuffle();
  };

  return (
    <div className={styles.container}>
      <Chip label="Albums" icon={<ArrowBackIcon />} clickable size="small" className={styles.navigationRow}
            onClick={() => router.push("/library/albums")} />
      <Grid container className={styles.grid}>
        <Grid item md={4} xs={12}>
          <div className={styles.sidePanel}>
            {album.coverUrl && <Avatar variant="rounded" src={album.coverUrl} className={styles.cover} />}
            <Typography variant="body2" color="textSecondary">
              {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes} {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </Typography>
          </div>
        </Grid>
        <Grid item md={8} xs={12}>
          <Box ml={2}>
            <Typography variant="h5">{album.name}</Typography>
            <Typography variant="h6" color="textSecondary">{formatArtists(album.artists, v => v.map(
              (artist, idx) => <Fragment key={artist.id}>
                {idx > 0 && ", "}
                <Link href={`/library/artists/${artist.id}`}>{artist.name}</Link>
              </Fragment>
            ))}</Typography>
            <div className={styles.trackInfoRow}>
              <ButtonRow className={styles.trackInfoMain}>
                {canPlay && <Chip icon={<PlaylistPlayIcon />} label="Play" clickable onClick={playAll} />}
                {canPlay && <Chip icon={<ShuffleIcon />} label="Shuffle" clickable onClick={shuffleAll} />}
                {album.id >= 0 && <Chip icon={<FindInPageIcon />} label="VocaDB" clickable
                                        onClick={() => window.open(`https://vocadb.net/Al/${album.id}`, "_blank")} />}
              </ButtonRow>
              <IconButton {...bindTrigger(popupState)}><MoreVertIcon /></IconButton>
              <Menu
                id={"single-album-overflow-menu"}
                getContentAnchorEl={null}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                {...bindMenu(popupState)}
              >
                <MenuItem disabled={!user} onClick={() => {
                  window.open(`/dashboard/albums/${album.id}`);
                  popupState.close();
                }}>
                  <ListItemText
                    primary="Edit album entity"
                  />
                </MenuItem>
              </Menu>
            </div>
          </Box>
          <List>
            {diskSeparatedTracked.map(v => {
              if (v === null) {
                return <ListSubheader className={styles.subheader} key="unknownDisc">Unknown disc</ListSubheader>;
              } else if (typeof v === "number") {
                return <ListSubheader className={styles.subheader} key={`disc${v}`}>Disc {v}</ListSubheader>;
              } else {
                return <TrackListRow song={v} file={v.foundFile} files={album.files} />;
              }
            })}
          </List>
        </Grid>
      </Grid>
    </div>
  );
}

LibrarySingleAlbum.layout = getLayout;

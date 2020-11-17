import { Avatar, Box, Chip, IconButton, List, ListItemText, Menu, MenuItem, Typography } from "@material-ui/core";
import { gql, useQuery } from "@apollo/client";
import { MusicFileFragments } from "../../../graphql/fragments";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import React from "react";
import { useRouter } from "next/router";
import { makeStyles } from "@material-ui/core/styles";
import { Artist } from "../../../models/Artist";
import { Alert } from "@material-ui/lab";
import _ from "lodash";
import RecentActorsIcon from "@material-ui/icons/RecentActors";
import filesize from "filesize";
import PlaylistPlayIcon from "@material-ui/icons/PlaylistPlay";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import FindInPageIcon from "@material-ui/icons/FindInPage";
import ButtonRow from "../../ButtonRow";
import { useAppContext } from "../AppContext";
import { useAuthContext } from "../AuthContext";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import TrackListRow from "./TrackListRow";

const ARTIST_DETAILS_QUERY = gql`
  query($id: Int!) {
    artist(id: $id) {
      id
      name
      sortOrder
      type
      mainPictureUrl
      
      songs {
        id
        name
        sortOrder

        artists {
          id
          name
          
          ArtistOfSong {
            isSupport
            customName
            artistRoles
            categories
          }
        }
        
        files {
          ...MusicFileForPlaylistAttributes
          album {
            name
          }
        }
      }
    }
  }
  
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

const useStyles = makeStyles((theme) => ({
  navigationRow: {
    margin: theme.spacing(2, 0),
    textTransform: "capitalize",
  },
  cover: {
    marginRight: theme.spacing(1),
    height: "4em",
    width: "4em",
  },
  container: {
    margin: theme.spacing(2, 4),
  },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    flexGrow: 1,
    width: 0,
  }
}));

interface Props {
  id: number;
  type: "producers" | "vocalists";
}

export default function ArtistDetails({id, type}: Props) {
  const router = useRouter();
  const styles = useStyles();
  const { playlist } = useAppContext();
  const { user } = useAuthContext();
  const popupState = usePopupState({ variant: "popover", popupId: "single-artist-overflow-menu" });

  const query = useQuery<{artist: Artist}>(ARTIST_DETAILS_QUERY, {variables: {id}});
  let content;

  if (query.loading) content = <Alert severity="info">Loading...</Alert>;
  else if (query.error) content = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data.artist === null) content = <Alert severity="error">Error: Artist #{id} was not found.</Alert>;
  else {
    const artist = query.data.artist;
    const files = _.flatMap(artist.songs, v => v.files.slice(0, 1));
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;

    const playAll = () => playlist.loadTracks(files);
    const shuffleAll = () => {
      playAll();
      playlist.toggleShuffle();
    };

    content = <>
      <div className={styles.metaRow}>
        <Avatar variant="rounded" src={artist.mainPictureUrl} className={styles.cover}>
          <RecentActorsIcon fontSize="large" />
        </Avatar>
        <div className={styles.metaText}>
          <Typography variant="h6">{artist.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {artist.sortOrder}, {artist.type}{". "}
            {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes} {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
          </Typography>
        </div>
        <ButtonRow>
          {canPlay && <Chip icon={<PlaylistPlayIcon />} label="Play" clickable onClick={playAll} />}
          {canPlay && <Chip icon={<ShuffleIcon />} label="Shuffle" clickable onClick={shuffleAll} />}
          {artist.id >= 0 && <Chip icon={<FindInPageIcon />} label="VocaDB" clickable
                                  onClick={() => window.open(`https://vocadb.net/Ar/${artist.id}`, "_blank")} />}
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
              window.open(`/dashboard/artists/${artist.id}`);
              popupState.close();
            }}>
              <ListItemText
                primary="Edit artist entity"
              />
            </MenuItem>
          </Menu>
        </ButtonRow>
      </div>
      <List>
        {
          _.sortBy(artist.songs, "sortOrder").map(v =>
            <TrackListRow song={v} file={v.files.length > 0 ? v.files[0] : null} files={files} key={v.id} showAlbum />
          )
        }
      </List>
    </>;
  }

  return (
    <div className={styles.container}>
      <Chip label={type} icon={<ArrowBackIcon />} clickable size="small" className={styles.navigationRow}
            onClick={() => router.push(`/library/${type}`)} />
      {content}
    </div>
  );
}
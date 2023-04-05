import {
  Avatar,
  Box,
  Chip,
  IconButton,
  List,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import { MusicFileFragments } from "lyricova-common/utils/fragments";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import React from "react";
import { useRouter } from "next/router";
import type { Artist } from "lyricova-common/models/Artist";
import Alert from "@mui/material/Alert";
import _ from "lodash";
import RecentActorsIcon from "@mui/icons-material/RecentActors";
import filesize from "filesize";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import ButtonRow from "../../ButtonRow";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TrackListRow from "./TrackListRow";
import type { DocumentNode } from "graphql";
import {
  playTrack,
  toggleShuffle,
  loadTracks,
} from "../../../redux/public/playlist";
import { useAppDispatch } from "../../../redux/public/store";

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
` as DocumentNode;

interface Props {
  id: number;
  type: "producers" | "vocalists";
}

export default function ArtistDetails({ id, type }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();
  const popupState = usePopupState({
    variant: "popover",
    popupId: "single-artist-overflow-menu",
  });

  const query = useQuery<{ artist: Artist }>(ARTIST_DETAILS_QUERY, {
    variables: { id },
  });
  let content;

  if (query.loading) content = <Alert severity="info">Loading...</Alert>;
  else if (query.error)
    content = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data.artist === null)
    content = (
      <Alert severity="error">Error: Artist #{id} was not found.</Alert>
    );
  else {
    const artist = query.data.artist;
    const files = _.flatMap(artist.songs, (v) => v.files.slice(0, 1));
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;

    const playAll = () => {
      dispatch(loadTracks(files));
      dispatch(playTrack({ track: 0, playNow: true }));
    };
    const shuffleAll = () => {
      dispatch(loadTracks(files));
      dispatch(toggleShuffle());
      dispatch(playTrack({ track: 0, playNow: true }));
    };

    content = (
      <>
        <Stack direction="row" alignItems="center">
          <Avatar
            variant="rounded"
            src={artist.mainPictureUrl}
            sx={{
              marginRight: 1,
              height: "4em",
              width: "4em",
            }}
          >
            <RecentActorsIcon fontSize="large" />
          </Avatar>
          <Box sx={{ flexGrow: 1, width: 0 }}>
            <Typography variant="h6">{artist.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              {artist.sortOrder}, {artist.type}
              {". "}
              {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes}{" "}
              {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </Typography>
          </Box>
          <ButtonRow>
            {canPlay && (
              <Chip
                icon={<PlaylistPlayIcon />}
                label="Play"
                clickable
                onClick={playAll}
              />
            )}
            {canPlay && (
              <Chip
                icon={<ShuffleIcon />}
                label="Shuffle"
                clickable
                onClick={shuffleAll}
              />
            )}
            {artist.id >= 0 && (
              <Chip
                icon={<FindInPageIcon />}
                label="VocaDB"
                clickable
                onClick={() =>
                  window.open(`https://vocadb.net/Ar/${artist.id}`, "_blank")
                }
              />
            )}
            <IconButton {...bindTrigger(popupState)}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              id={"single-album-overflow-menu"}
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
              <MenuItem
                disabled={!user}
                onClick={() => {
                  window.open(`/dashboard/artists/${artist.id}`);
                  popupState.close();
                }}
              >
                <ListItemText primary="Edit artist entity" />
              </MenuItem>
            </Menu>
          </ButtonRow>
        </Stack>
        <List>
          {_.sortBy(artist.songs, "sortOrder").map((v) => (
            <TrackListRow
              song={v}
              file={v.files.length > 0 ? v.files[0] : null}
              files={files}
              key={v.id}
              showAlbum
            />
          ))}
        </List>
      </>
    );
  }

  return (
    <Box sx={{ marginTop: 2, marginBottom: 2, marginLeft: 4, marginRight: 4 }}>
      <Chip
        label={type}
        icon={<ArrowBackIcon />}
        clickable
        size="small"
        sx={{ marginTop: 2, marginBottom: 2, textTransform: "capitalize" }}
        onClick={() => router.push(`/library/${type}`)}
      />
      {content}
    </Box>
  );
}

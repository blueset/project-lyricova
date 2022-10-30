import { Playlist } from "../../../models/Playlist";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import {
  Avatar,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Popover
} from "@mui/material";
import { Alert, Skeleton } from "@mui/material";
import _ from "lodash";
import { ReactNode, useCallback, useEffect } from "react";
import PlaylistAvatar from "../../PlaylistAvatar";
import { useNamedState } from "../../../frontendUtils/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import { bindPopover, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import AddPlaylistPopoverContent from "../AddPlaylistPopoverContent";

function SkeletonItem() {
  return <ListItem>
    <ListItemAvatar>
      <Skeleton variant="rectangular"><Avatar variant="rounded" /></Skeleton>
    </ListItemAvatar>
    <ListItemText><Skeleton /></ListItemText>
  </ListItem>;
}

const PLAYLISTS_QUERY = gql`
  query {
    playlists {
      name
      slug
    }
  }
`;

const SET_PLAYLISTS_MUTATION = gql`
  mutation($slugs: [String!]!, $fileId: Int!) {
    setPlaylistsOfFile(playlistSlugs: $slugs, fileId: $fileId) {
      playlists {
        name
        slug
      }
    }
  }
`;

interface Props {
  fileId: number;
  playlists: Playlist[];
  refresh: () => unknown | Promise<unknown>;
}

export default function PlaylistsPanel({ fileId, playlists, refresh }: Props) {
  const playlistsQuery = useQuery<{ playlists: Playlist[] }>(PLAYLISTS_QUERY);
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const [checkedPlaylists, setCheckedPlaylists] = useNamedState<string[]>([], "checkedPlaylists");
  useEffect(() => {
    setCheckedPlaylists(playlists.map(v => v.slug));
  }, [playlists, setCheckedPlaylists]);

  const popupState = usePopupState({ variant: "popover", popupId: "add-playlist-popover" });

  const handleSubmit = useCallback(async () => {
    try {
      const result = await apolloClient.mutate<{ setPlaylistsOfFile: { playlists: Playlist[] } }>({
        mutation: SET_PLAYLISTS_MUTATION,
        variables: { fileId, slugs: checkedPlaylists }
      });
      if (result.data) {
        setCheckedPlaylists(result.data.setPlaylistsOfFile.playlists.map(v => v.slug));
        snackbar.enqueueSnackbar("Playlists saved", { variant: "success" });
        await refresh();
      }
    } catch (e) {
      console.error("Error occurred while updating playlists", e);
      snackbar.enqueueSnackbar(`Error occurred while updating playlists: ${e}`, { variant: "error" });
    }
  }, [apolloClient, checkedPlaylists, fileId, snackbar]);

  const handleToggle = useCallback((value: string) => () => {
    if (checkedPlaylists.indexOf(value) < 0) {
      setCheckedPlaylists([...checkedPlaylists, value]);
    } else {
      setCheckedPlaylists(checkedPlaylists.filter(v => v !== value));
    }
  }, [checkedPlaylists, setCheckedPlaylists]);

  let items: ReactNode = _.fill(Array(5), <SkeletonItem />);
  if (playlistsQuery.error) {
    items = <Alert severity="error">Error occurred while retrieving playlists: {`${playlistsQuery.error}`}</Alert>;
  } else if (playlistsQuery.data) {
    items = playlistsQuery.data.playlists.map(v => <ListItem key={v.slug} button onClick={handleToggle(v.slug)}>
      <ListItemAvatar><PlaylistAvatar name={v.name} slug={v.slug} /></ListItemAvatar>
      <ListItemText primary={v.name} secondary={v.slug} />
      <ListItemSecondaryAction>
        <Checkbox
          edge="end"
          onChange={handleToggle(v.slug)}
          checked={checkedPlaylists.indexOf(v.slug) !== -1}
        />
      </ListItemSecondaryAction>
    </ListItem>);
  }

  return (
    <div>
      <List>
        {items}
        <ListItem button {...bindTrigger(popupState)}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText>Add new playlist</ListItemText>
        </ListItem>
      </List>
      <Button variant="outlined" color="secondary" onClick={handleSubmit}>Save</Button>
      <Popover
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        {...bindPopover(popupState)}
      >
        <AddPlaylistPopoverContent refresh={playlistsQuery.refetch} dismiss={popupState.close} />
      </Popover>
    </div>
  );
}
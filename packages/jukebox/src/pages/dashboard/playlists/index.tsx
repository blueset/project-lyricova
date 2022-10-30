import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import {
  Button,
  ButtonBase,
  Chip, ImageList, ImageListItem, ImageListItemBar,
  Popover,
} from "@mui/material";
import { Alert, Skeleton } from "@mui/material";
import PlaylistAvatar from "../../../components/PlaylistAvatar";
import { CSSProperties, ReactNode } from "react";
import { NextComposedLink } from "../../../components/Link";
import _ from "lodash";
import { bindPopover, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import AddPlaylistPopoverContent from "../../../components/dashboard/AddPlaylistPopoverContent";
import AddIcon from "@mui/icons-material/Add";
import { DocumentNode } from "graphql";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

const PLAYLISTS_QUERY = gql`
  query {
    playlists {
      name
      slug
      filesCount
    }
  }
` as DocumentNode;

const SxTileWrapper: CSSProperties = {
  width: "100%",
  height: 0,
  overflow: "hidden",
  paddingTop: "100%",
  position: "relative",
};

const SxTileBody: SxProps = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  fontSize: "5vw",
};

export default function PlaylistsPage() {
  const playlistsQuery = useQuery<{
    playlists: {
      name: string, slug: string, filesCount: number
    }[]
  }>(PLAYLISTS_QUERY);
  const popupState = usePopupState({ variant: "popover", popupId: "add-playlist-popover" });

  let elements: ReactNode = "a";
  if (playlistsQuery.error) {
    elements = <Alert severity="error">{`${playlistsQuery.error}`}</Alert>;
  } else if (playlistsQuery.data) {
    elements = playlistsQuery.data.playlists.map(v => (
      <ButtonBase
        focusRipple
        key={v.slug}
        sx={{
          textAlign: "inherit",
          "&:hover": {
            filter: "brightness(1.2)"
          },
        }}
        component={NextComposedLink}
        href={`/dashboard/playlists/${v.slug}`}
      >
        <ImageListItem sx={{width: "100%"}}>
          <div style={SxTileWrapper}>
            <PlaylistAvatar name={v.name} slug={v.slug} sx={SxTileBody} />
          </div>
          <ImageListItemBar
            title={v.name}
            subtitle={v.slug}
            actionIcon={<Chip label={v.filesCount} color="secondary" size="small"
                              variant={v.filesCount === 0 ? "outlined" : undefined}
                              sx={{marginRight: 2, lineHeight: 1}} />}
          />
        </ImageListItem>
      </ButtonBase>
    ));
    console.log("data loaded", elements);
  } else {
    elements = _.range(6).map(v => <ImageListItem key={v}>
      <div style={SxTileWrapper}>
        <Skeleton variant="rectangular" sx={SxTileBody} />
      </div>
      <ImageListItemBar
        title={<Skeleton variant="text" />}
        subtitle={<Skeleton variant="text" />}
      />
    </ImageListItem>);
  }

  return <div>
    <ImageList cols={6} rowHeight="auto">
      <ImageListItem cols={6}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          sx={{margin: 1}}
          {...bindTrigger(popupState)}
        >Create new playlist</Button>
      </ImageListItem>
      {elements}
    </ImageList>
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
  </div>;
}

PlaylistsPage.layout = getLayout("Playlists");
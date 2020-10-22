import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import {
  Button,
  ButtonBase,
  Chip,
  GridList,
  GridListTile,
  GridListTileBar,
  Popover,
  Typography
} from "@material-ui/core";
import { Alert, Skeleton } from "@material-ui/lab";
import { makeStyles } from "@material-ui/core/styles";
import PlaylistAvatar from "../../../components/PlaylistAvatar";
import { ReactNode } from "react";
import { NextComposedLink } from "../../../components/Link";
import _ from "lodash";
import { bindPopover, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import AddPlaylistPopoverContent from "../../../components/dashboard/AddPlaylistPopoverContent";
import AddIcon from "@material-ui/icons/Add";

const PLAYLISTS_QUERY = gql`
  query {
    playlists {
      name
      slug
      filesCount
    }
  }
`;

const useStyles = makeStyles((theme) => ({
  tileWrapper: {
    width: "100%",
    height: 0,
    overflow: "hidden",
    paddingTop: "100%",
    position: "relative",
  },
  tileBody: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    fontSize: "5vw",
  },
  buttonBase: {
    textAlign: "inherit",
    "&:hover": {
      filter: "brightness(1.2)"
    },
  },
  tile: {
    width: "100%",
  },
  chip: {
    marginRight: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  }
}));

export default function PlaylistsPage() {
  const playlistsQuery = useQuery<{
    playlists: {
      name: string, slug: string, filesCount: number
    }[]
  }>(PLAYLISTS_QUERY);
  const styles = useStyles();
  const popupState = usePopupState({ variant: "popover", popupId: "add-playlist-popover" });

  let elements: ReactNode = "a";
  if (playlistsQuery.error) {
    elements = <Alert severity="error">{`${playlistsQuery.error}`}</Alert>;
  } else if (playlistsQuery.data) {
    elements = playlistsQuery.data.playlists.map(v => (
      <ButtonBase
        focusRipple
        key={v.slug}
        className={styles.buttonBase}
        component={NextComposedLink}
        href={`/dashboard/playlists/${v.slug}`}
      >
        <GridListTile className={styles.tile}>
          <div className={styles.tileWrapper}>
            <PlaylistAvatar name={v.name} slug={v.slug} className={styles.tileBody} />
          </div>
          <GridListTileBar
            title={v.name}
            subtitle={v.slug}
            actionIcon={<Chip label={v.filesCount} color="secondary" size="small" variant={v.filesCount === 0 ? "outlined" : "default"} className={styles.chip} />}
          />
        </GridListTile>
      </ButtonBase>
    ));
    console.log("data loaded", elements);
  } else {
    elements = _.range(6).map(v => <GridListTile key={v}>
      <div className={styles.tileWrapper}>
        <Skeleton variant="rect" className={styles.tileBody} />
      </div>
      <GridListTileBar
        title={<Skeleton variant="text" />}
        subtitle={<Skeleton variant="text" />}
      />
    </GridListTile>);
  }

  return <div>
    <GridList cols={6} cellHeight="auto">
      <GridListTile cols={6}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          className={styles.button}
          {...bindTrigger(popupState)}
        >Create new playlist</Button>
      </GridListTile>
      {elements}
    </GridList>
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
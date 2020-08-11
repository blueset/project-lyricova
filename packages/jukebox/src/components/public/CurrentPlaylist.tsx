import style from "./CurrentPlaylist.module.scss";
import { useAppContext, Track, Playlist } from "./AppContext";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListItemIcon,
  RootRef,
  Menu,
  MenuItem,
} from "@material-ui/core";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import DeleteIcon from "@material-ui/icons/Delete";
import { useEffect, createRef, RefObject, useState } from "react";
import AutoResizer from "react-virtualized-auto-sizer";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import React, { CSSProperties } from "react";
import _ from "lodash";
import {
  DragDropContext,
  DropResult,
  Droppable,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableRubric,
  DroppableProvided,
  Draggable,
} from "react-beautiful-dnd";
import { useNamedState } from "../../frontendUtils/hooks";

function CurrentPlaylistItem({
  provided,
  track,
  index,
  style,
  isDragging,
}: // provided,
{
  provided: DraggableProvided;
  index: number;
  track: Track;
  style: CSSProperties;
  isDragging: boolean;
}) {
  const { playlist } = useAppContext();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRemoveFromPlaylist = () => {
    playlist.removeTrack(index);
    handleMenuClose();
  };

  // isDragging = true;
  return (
    <RootRef rootRef={provided.innerRef}>
      <ListItem
        button
        ContainerProps={{
          ...provided.draggableProps,
          style: {
            ...style,
            ...provided.draggableProps.style,
            opacity: index < playlist.nowPlaying ? 0.375 : 1,
          },
        }}
        style={{
          height: 60,
        }}
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        ContainerComponent={isDragging ? "div" : "li"}
        selected={playlist.nowPlaying === index || isDragging}
        onClick={
          isDragging
            ? null
            : () => {
                playlist.playTrack(index, true);
              }
        }
      >
        <ListItemIcon style={{ zIndex: 10 }} {...provided.dragHandleProps}>
          <DragHandleIcon />
        </ListItemIcon>
        <ListItemText
          primary={track.trackName || "No title"}
          primaryTypographyProps={{ noWrap: true }}
          secondary={track.artistName || "Unknown artist"}
          secondaryTypographyProps={{ noWrap: true }}
        />
        <ListItemSecondaryAction>
          <IconButton
            aria-controls={`currentPlaylist-menu-${track.id}`}
            edge="end"
            aria-label="More actions"
            onClick={handleMenuClick}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id={`currentPlaylist-menu-${track.id}`}
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleRemoveFromPlaylist}>
              <ListItemIcon>
                <DeleteIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Remove from playlist"
                primaryTypographyProps={{ color: "error" }}
              />
            </MenuItem>
          </Menu>
        </ListItemSecondaryAction>
      </ListItem>
    </RootRef>
  );
}

CurrentPlaylistItem.defaultProps = {
  isDragging: false,
  style: {},
};

function Row(props: ListChildComponentProps) {
  const { data, index, style } = props;
  const item: Track = data[index];

  return (
    <Draggable
      draggableId={`nowPlaying-draggable-${item.id}`}
      index={index}
      key={item.id}
    >
      {(provided) => (
        <CurrentPlaylistItem
          index={index}
          track={item}
          isDragging={false}
          style={style}
          provided={provided}
        />
      )}
    </Draggable>
  );
}

export default function CurrentPlaylist() {
  const { playlist } = useAppContext();
  const [tracks, setTracks] = useNamedState(playlist.tracks, "tracks");

  function updateTracks() {
    // console.log("Tracks recalculated");
    if (!playlist.shuffleMapping) {
      setTracks(_.clone(playlist.tracks));
    } else {
      // console.log("Shuffle mapping is rendered");
      setTracks(playlist.shuffleMapping.map((v) => playlist.tracks[v]));
    }
  }
  useEffect(updateTracks, [playlist.shuffleMapping, playlist.tracks]);

  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }
    if (result.source.index === result.destination.index) {
      return;
    }

    const src = result.source.index,
      dest = result.destination.index;

    playlist.moveTrack(src, dest);
  }

  const listRef: RefObject<FixedSizeList> = createRef();
  useEffect(() => {
    if (listRef.current && playlist.nowPlaying !== null) {
      listRef.current.scrollToItem(playlist.nowPlaying, "start");
    }
  }, [playlist.getCurrentSong()]);

  return (
    <List dense={true} className={style.playlist}>
      <AutoResizer>
        {({ height, width }) => (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable
              droppableId="droppable-currentPlaylist"
              mode="virtual"
              renderClone={(
                provided: DraggableProvided,
                snapshot: DraggableStateSnapshot,
                rubric: DraggableRubric
              ) => (
                <CurrentPlaylistItem
                  index={rubric.source.index}
                  track={tracks[rubric.source.index]}
                  isDragging={snapshot.isDragging}
                  provided={provided}
                />
              )}
            >
              {(droppableProvided: DroppableProvided) => (
                <FixedSizeList
                  ref={listRef}
                  height={height}
                  width={width}
                  itemSize={60}
                  itemData={tracks}
                  itemCount={tracks.length}
                  outerRef={droppableProvided.innerRef}
                >
                  {Row}
                </FixedSizeList>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </AutoResizer>
    </List>
  );
}

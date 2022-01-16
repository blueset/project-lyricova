import style from "./CurrentPlaylist.module.scss";
import { useAppContext, Track } from "./AppContext";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem, ListItemButton,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useRef, useCallback } from "react";
import AutoResizer from "react-virtualized-auto-sizer";
import { FixedSizeList, ListChildComponentProps, areEqual } from "react-window";
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
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";

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

  const popupState = usePopupState({ variant: "popover", popupId: `current-playlist-menu-${track.id}` });

  const handleRemoveFromPlaylist = useCallback(() => {
    playlist.removeTrack(index);
    popupState.close();
  }, [index, playlist, popupState]);

  // isDragging = true;
  return (
    <ListItem
      ref={provided.innerRef}
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
      <ListItemButton>
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
            edge="end"
            aria-label="More actions"
            {...bindTrigger(popupState)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id={`currentPlaylist-menu-${track.id}`}
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
      </ListItemButton>
    </ListItem>
  );
}

CurrentPlaylistItem.defaultProps = {
  isDragging: false,
  style: {},
};

const Row = React.memo((props: ListChildComponentProps) => {
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
}, areEqual);
Row.displayName = "Row";

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
  useEffect(updateTracks, [playlist.shuffleMapping, playlist.tracks, setTracks]);

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

  const listRef = useRef<FixedSizeList>();
  useEffect(() => {
    console.log("listref current", listRef.current, "nowplaying", playlist.nowPlaying);
    if (listRef.current && playlist.nowPlaying !== null) {
      console.log("SCROLL!!");
      listRef.current.scrollToItem(playlist.nowPlaying, "start");
    }
  }, [playlist.nowPlaying, playlist.tracks]);

  console.log("initial scroll offset", playlist.nowPlaying ? playlist.nowPlaying * 60 : 0);

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
                  initialScrollOffset={playlist.nowPlaying ? playlist.nowPlaying * 60 : 0}
                  itemKey={(i, d) => `${i}-${d.id}`}
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

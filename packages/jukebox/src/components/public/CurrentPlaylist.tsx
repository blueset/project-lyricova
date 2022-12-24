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
import { useVirtualizer } from "@tanstack/react-virtual";

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
    track?: Track;
    style: CSSProperties;
    isDragging: boolean;
  }) {
  const { playlist } = useAppContext();

  const popupState = usePopupState({ variant: "popover", popupId: `current-playlist-menu-${track?.id}` });

  const handleRemoveFromPlaylist = useCallback(() => {
    playlist.removeTrack(index);
    popupState.close();
  }, [index, playlist, popupState]);
  // isDragging = true;
  return (
    <ListItem
      ref={provided.innerRef}
      {...provided.draggableProps}
      ContainerProps={{
        style: {
          opacity: index < playlist.nowPlaying ? 0.375 : 1,
        },
      }}
      style={{
        ...provided.draggableProps.style,
        ...style,
      }}
      ContainerComponent={isDragging ? "div" : (<li />).type}
      selected={playlist.nowPlaying === index || isDragging}
      secondaryAction={
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="More actions"
            {...bindTrigger(popupState)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id={`currentPlaylist-menu-${track?.id}`}
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
      }
    >
      <ListItemButton
      onClick={
        isDragging
          ? null
          : () => {
            playlist.playTrack(index, true);
          }
      }>
        <ListItemIcon style={{ zIndex: 10 }}
                      {...provided.dragHandleProps}
        >
          <DragHandleIcon />
        </ListItemIcon>
        <ListItemText
          sx={{width: 0, mr: 8}}
          primary={track?.trackName || "No title"}
          primaryTypographyProps={{ noWrap: true }}
          secondary={track?.artistName || "Unknown artist"}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </ListItemButton>
    </ListItem>
  );
}

CurrentPlaylistItem.defaultProps = {
  isDragging: false,
  style: {},
};

const Row = React.memo(({item, height, index, start}: {item?: Track, height: number, index: number, start: number}) => {
  return (
    <Draggable
      draggableId={`nowPlaying-draggable-${item?.id}`}
      index={index}
      key={item?.id ?? -index}
    >
      {(provided) => (
        <CurrentPlaylistItem
          index={index}
          track={item}
          isDragging={false}
          style={{
            height, 
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${start}px)`,
          }}
          provided={provided}
        />
      )}
    </Draggable>
  );
});
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

  const parentRef = useRef<HTMLDivElement>();
  const rowVirtualizer = useVirtualizer({
    // tracks.length on load is 0, we need at least `playlist.nowPlaying` plus an offset to ensure that
    // the list scrolls to the correct position before we have the data.
    count: Math.max(tracks.length, playlist.nowPlaying ? playlist.nowPlaying + 50 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
    initialOffset: playlist.nowPlaying ? playlist.nowPlaying * 60 : undefined,
  });

  useEffect(() => {
    if (playlist.nowPlaying !== null) {
      rowVirtualizer.scrollToIndex(playlist.nowPlaying, { align: "start" });
    }
  }, [playlist.nowPlaying, playlist.tracks]);

  // const listRef = useRef<FixedSizeList>();
  // useEffect(() => {
  //   // console.log("listref current", listRef.current, "nowplaying", playlist.nowPlaying);
  //   if (listRef.current && playlist.nowPlaying !== null) {
  //     // console.log("SCROLL!!");
  //     listRef.current.scrollToItem(playlist.nowPlaying, "start");
  //   }
  // }, [playlist.nowPlaying, playlist.tracks]);

  // console.log("initial scroll offset", playlist.nowPlaying ? playlist.nowPlaying * 60 : 0);

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
            {(droppableProvided: DroppableProvided) => {
              console.log("playlist now playing", playlist.nowPlaying, "tracks length", tracks.length);
             return (
              <div style={{height, width, overflowY: "scroll"}} ref={(r) => {
                droppableProvided.innerRef(r);
                parentRef.current = r;
              }}>
                <div style={{
                  height: rowVirtualizer.getTotalSize(),
                  width: "100%",
                  position: "relative",
                }}>
                  {rowVirtualizer.getVirtualItems().map(({index, size, start}) => 
                    <Row key={index} index={index} item={tracks[index]} height={size} start={start}/>)}
                </div>
              </div>
                // <FixedSizeList
                //   height={height}
                //   width={width}
                //   itemSize={60}
                //   itemData={tracks}
                //   // tracks.length on load is 0, we need at least `playlist.nowPlaying` plus an offset to ensure that
                //   // the list scrolls to the correct position before we have the data.
                //   itemCount={Math.max(tracks.length, playlist.nowPlaying ? playlist.nowPlaying + 50 : 0)}
                //   initialScrollOffset={playlist.nowPlaying ? playlist.nowPlaying * 60 : 0}
                //   itemKey={(i, d) => `${i}-${d.id}`}
                //   outerRef={droppableProvided.innerRef}
                // >
                //   {Row}
                // </FixedSizeList>
              );
            }}
            </Droppable>
          </DragDropContext>
        )}
      </AutoResizer>
    </List>
  );
}

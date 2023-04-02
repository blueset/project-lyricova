import style from "./CurrentPlaylist.module.scss";
import { Track } from "./AppContext";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  ListItemButton,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useRef } from "react";
import AutoResizer from "react-virtualized-auto-sizer";
import React, { CSSProperties } from "react";
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
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import {
  moveTrack,
  playTrack,
  removeTrack,
  visualPlaylistSelector,
} from "../../redux/public/playlist";

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
  const dispatch = useAppDispatch();
  const nowPlaying = useAppSelector((s) => s.playlist.nowPlaying);

  const popupState = usePopupState({
    variant: "popover",
    popupId: `current-playlist-menu-${track?.id}`,
  });

  const handleRemoveFromPlaylist = () => {
    dispatch(removeTrack(index));
    popupState.close();
  };
  // isDragging = true;
  return (
    <ListItem
      ref={provided.innerRef}
      {...provided.draggableProps}
      ContainerProps={{
        style: {
          opacity: index < nowPlaying ? 0.375 : 1,
        },
      }}
      style={{
        ...provided.draggableProps.style,
        ...style,
      }}
      ContainerComponent={isDragging ? "div" : (<li />).type}
      selected={nowPlaying === index || isDragging}
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
                dispatch(playTrack({ track: index, playNow: true }));
              }
        }
      >
        <ListItemIcon style={{ zIndex: 10 }} {...provided.dragHandleProps}>
          <DragHandleIcon />
        </ListItemIcon>
        <ListItemText
          sx={{ width: 0, mr: 8 }}
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

const Row = React.memo(
  ({
    item,
    height,
    index,
    start,
  }: {
    item?: Track;
    height: number;
    index: number;
    start: number;
  }) => {
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
  }
);
Row.displayName = "Row";

export default function CurrentPlaylist() {
  const dispatch = useAppDispatch();
  const { nowPlaying } = useAppSelector((s) => s.playlist);
  const tracks = useAppSelector(visualPlaylistSelector);

  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }
    if (result.source.index === result.destination.index) {
      return;
    }

    const src = result.source.index,
      dest = result.destination.index;

    dispatch(moveTrack({ from: src, to: dest }));
  }

  const parentRef = useRef<HTMLDivElement>();
  const rowVirtualizer = useVirtualizer({
    // tracks.length on load is 0, we need at least `playlist.nowPlaying` plus an offset to ensure that
    // the list scrolls to the correct position before we have the data.
    count: Math.min(tracks.length, nowPlaying ? nowPlaying + 50 : 0),
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: () => 60,
    overscan: 10,
    initialOffset: nowPlaying ? nowPlaying * 60 : undefined,
  });

  useEffect(() => {
    console.log("scrollTo, nowPlaying", nowPlaying, parentRef.current);
    if (nowPlaying !== null) {
      rowVirtualizer.scrollToIndex(nowPlaying, { align: "start" });
    }
  }, [nowPlaying, rowVirtualizer, tracks]);

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
                return (
                  <div
                    style={{ height, width, overflowY: "scroll" }}
                    ref={(r) => {
                      droppableProvided.innerRef(r);
                      if (r !== null && parentRef.current !== r) {
                        parentRef.current = r;
                        if (nowPlaying !== null) {
                          // Scroll to initial position on mount
                          rowVirtualizer._willUpdate();
                          rowVirtualizer.scrollToIndex(nowPlaying, {
                            align: "start",
                          });
                        }
                      }
                    }}
                  >
                    <div
                      style={{
                        height: rowVirtualizer.getTotalSize(),
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {rowVirtualizer
                        .getVirtualItems()
                        .map(({ index, size, start }) => (
                          <Row
                            key={index}
                            index={index}
                            item={tracks[index]}
                            height={size}
                            start={start}
                          />
                        ))}
                    </div>
                  </div>
                );
              }}
            </Droppable>
          </DragDropContext>
        )}
      </AutoResizer>
    </List>
  );
}

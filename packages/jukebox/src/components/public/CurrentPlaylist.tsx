import style from "./CurrentPlaylist.module.scss";
import { useAppContext, Track, Playlist } from "./AppContext";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListItemIcon,
} from "@material-ui/core";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import { useMemo, useEffect, createRef, RefObject } from "react";
// import {
//   DragDropContext,
//   DropResult,
//   Droppable,
//   DraggableProvided,
//   DraggableStateSnapshot,
//   DraggableRubric,
//   DroppableProvided,
//   Draggable,
//   DraggableProvidedDragHandleProps,
// } from "react-beautiful-dnd";
import AutoResizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { CSSProperties } from "react";
import _ from "lodash";

function CurrentPlaylistItem({
  playlist,
  index,
  value,
  isDragging,
  style,
}: // provided,
{
  playlist: Playlist;
  index: number;
  value: Track;
  isDragging: boolean;
  style: CSSProperties;
  // provided: DraggableProvided;
}) {
  return (
    <div style={style}>
      <ListItem
        button
        style={{
          opacity: index < playlist.nowPlaying ? 0.375 : 1,
          height: 60,
        }}
        selected={playlist.nowPlaying === index}
        onClick={
          isDragging
            ? null
            : () => {
                playlist.playTrack(index, true);
              }
        }
      >
        <ListItemIcon style={{ zIndex: 10 }}>
          <DragHandleIcon />
        </ListItemIcon>
        <ListItemText
          primary={value.trackName}
          primaryTypographyProps={{ noWrap: true }}
          secondary={value.artistName}
          secondaryTypographyProps={{ noWrap: true }}
        />
        {!isDragging && (
          <ListItemSecondaryAction>
            <IconButton edge="end" aria-label="More actions">
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    </div>
  );
}

CurrentPlaylistItem.defaultProps = {
  isDragging: false,
  style: {},
};

export default function CurrentPlaylist() {
  const { playlist } = useAppContext();
  const tracks: Track[] = useMemo(() => {
    if (!playlist.shuffleMapping) {
      return playlist.tracks;
    } else {
      console.log("Shuffle mapping is rendered");
      return playlist.shuffleMapping.map((v) => playlist.tracks[v]);
    }
  }, [playlist.shuffleMapping, playlist.tracks]);

  // function onDragEnd(result: DropResult) {
  //   if (!result.destination) {
  //     return;
  //   }
  //   if (result.source.index === result.destination.index) {
  //     return;
  //   }

  //   playlist.moveTrack(result.source.index, result.destination.index);
  // }

  const listRef: RefObject<FixedSizeList> = createRef();
  useEffect(() => {
    if (listRef.current && playlist.nowPlaying !== null) {
      listRef.current.scrollToItem(playlist.nowPlaying, "start");
    }
  }, [playlist.nowPlaying]);

  return (
    <List dense={true} className={style.playlist}>
      <AutoResizer>
        {({ height, width }) => (
          <FixedSizeList
            ref={listRef}
            height={height}
            width={width}
            itemSize={60}
            itemCount={tracks.length}
          >
            {({ index, style }) => (
              <CurrentPlaylistItem
                key={index}
                playlist={playlist}
                index={index}
                value={tracks[index]}
                isDragging={false}
                style={style}
              />
            )}
          </FixedSizeList>
        )}
      </AutoResizer>
    </List>
  );
}

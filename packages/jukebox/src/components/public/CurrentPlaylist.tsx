import type { Track } from "./AppContext";
import { MoreVertical, GripVertical, Trash } from "lucide-react";
import { useEffect, useRef } from "react";
import AutoResizer from "react-virtualized-auto-sizer";
import type { CSSProperties } from "react";
import React from "react";
import type {
  DropResult,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableRubric,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import {
  moveTrack,
  playTrack,
  removeTrack,
  visualPlaylistSelector,
} from "../../redux/public/playlist";
import { cn } from "@lyricova/components/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { Button } from "@lyricova/components/components/ui/button";

function CurrentPlaylistItem({
  provided,
  track,
  index,
  style,
  isDragging,
}: {
  provided: DraggableProvided;
  index: number;
  track?: Track;
  style: CSSProperties;
  isDragging: boolean;
}) {
  const dispatch = useAppDispatch();
  const nowPlaying = useAppSelector((s) => s.playlist.nowPlaying);

  const handleRemoveFromPlaylist = () => {
    dispatch(removeTrack(index));
  };
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
        ...style,
      }}
      className={cn(
        "flex items-center justify-between pr-2",
        index < nowPlaying ? "opacity-40" : "opacity-100",
        nowPlaying === index || isDragging ? "bg-secondary" : "hover:bg-muted"
      )}
    >
      <div
        className={cn("flex items-center gap-2 flex-1 p-2 cursor-pointer")}
        onClick={
          isDragging
            ? undefined
            : () => {
                dispatch(playTrack({ track: index, playNow: true }));
              }
        }
      >
        <div
          className="z-10 text-muted-foreground self-stretch place-content-center p-2 -m-2"
          {...provided.dragHandleProps}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="flex-1 w-0">
          <div className="truncate text-sm font-medium">
            {track?.trackName || "No title"}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {track?.artistName || "Unknown artist"}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={handleRemoveFromPlaylist}
          >
            <Trash />
            Remove from playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
              translate: `0px ${start}px`,
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

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    // tracks.length on load is 0, we need at least `playlist.nowPlaying` plus an offset to ensure that
    // the list scrolls to the correct position before we have the data.
    count: tracks.length || (nowPlaying ? nowPlaying + 50 : 0),
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: () => 60,
    overscan: 10,
    initialOffset: nowPlaying ? nowPlaying * 60 : 0,
  });

  useEffect(() => {
    if (nowPlaying !== null) {
      rowVirtualizer.scrollToIndex(nowPlaying, { align: "start" });
    }
  }, [nowPlaying, rowVirtualizer, tracks]);

  return (
    <div className="flex-1 flex-grow">
      <AutoResizer>
        {({ height, width }) => (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable
              droppableId="droppable-currentPlaylist"
              mode="virtual"
              isDropDisabled={false}
              isCombineEnabled={false}
              ignoreContainerClipping={false}
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
                    className="overflow-y-auto"
                    style={{ height, width }}
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
    </div>
  );
}

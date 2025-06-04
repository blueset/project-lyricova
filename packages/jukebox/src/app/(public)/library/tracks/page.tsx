"use client";

import { AlertCircle, MoreVertical, PlaySquare, Shuffle } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import { Badge } from "@lyricova/components/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { Slider, SliderThumb } from "@lyricova/components/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { cn } from "@lyricova/components/utils";
import AutoResizer from "react-virtualized-auto-sizer";
import { gql, useQuery } from "@apollo/client";
import {
  Link,
  MusicFileFragments,
  NextComposedLink,
  useAuthContext,
} from "@lyricova/components";
import type { MusicFilesPagination } from "@lyricova/api/graphql/types";
import React, { useCallback, useMemo, useRef } from "react";
import type { MusicFile } from "@lyricova/api/graphql/types";
import _ from "lodash";
import { useNamedState } from "@/hooks/useNamedState";
import { useRouter } from "next/navigation";
import ListItemTextWithTime from "@/components/public/library/ListItemTextWithTime";
import type { DocumentNode } from "graphql";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppDispatch } from "@/redux/public/store";
import {
  addTrackToNext,
  loadTracks,
  playTrack,
  toggleShuffle,
} from "@/redux/public/playlist";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";

const MUSIC_FILES_COUNT_QUERY = gql`
  query GetMusicFiles {
    musicFiles(first: -1) {
      edges {
        node {
          ...MusicFileForPlaylistAttributes
        }
      }
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const ITEM_HEIGHT = 60;

const Row = React.memo(
  ({
    height,
    index,
    data,
    start,
    isScrolling,
  }: {
    height: number;
    index: number;
    start: number;
    data: MusicFile[];
    isScrolling: boolean;
  }) => {
    const item = index == 0 ? null : data[index - 1];
    const dispatch = useAppDispatch();
    const { user } = useAuthContext();
    const router = useRouter();

    if (item === null) {
      const playAll = () => {
        dispatch(loadTracks(data.slice()));
        dispatch(playTrack({ track: 0, playNow: true }));
      };
      const shuffleAll = () => {
        dispatch(loadTracks(data.slice()));
        dispatch(toggleShuffle());
        dispatch(playTrack({ track: 0, playNow: true }));
      };
      return (
        <div
          className="py-2 flex items-center gap-2"
          style={{
            height,
            transform: `translateY(${start}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-secondary"
            onClick={playAll}
          >
            <PlaySquare />
            Play all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-secondary"
            onClick={shuffleAll}
          >
            <Shuffle />
            Shuffle all
          </Button>
        </div>
      );
    }

    const handlePlayNext = () => {
      dispatch(addTrackToNext(item));
    };
    const handlePlayInList = () => {
      dispatch(loadTracks(data.slice()));
      dispatch(playTrack({ track: index, playNow: true }));
    };

    return (
      <div
        className="flex items-center justify-between absolute top-0 left-0 w-full"
        style={{
          height,
          translate: `0 ${start}px`,
        }}
      >
        <ListItemTextWithTime
          lang="ja"
          primary={
            (isScrolling && item?.trackSortOrder
              ? item?.trackSortOrder
              : item?.trackName) || <em>No title</em>
          }
          secondary={
            <>
              {item?.artistName || <em>Various artists</em>}
              {" / "}
              {item?.albumName || <em>Unknown album</em>}
            </>
          }
          time={item?.duration ?? 0}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePlayNext}>
              Play next
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePlayInList}>
              Play in the playlist
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NextComposedLink href={`/info/${item.id}`}>
                Show details
              </NextComposedLink>
            </DropdownMenuItem>
            {user && (
              <DropdownMenuItem asChild>
                <NextComposedLink
                  href={`/dashboard/review/${item.id}`}
                  target="_blank"
                >
                  Edit song entry
                </NextComposedLink>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);
Row.displayName = "Row";

export default function LibraryTracks() {
  const query = useQuery<{ musicFiles: MusicFilesPagination }>(
    MUSIC_FILES_COUNT_QUERY
  );
  const parentRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<MusicFile[]>(() => {
    if (query.data) {
      return _.sortBy<MusicFile>(
        query.data.musicFiles.edges.map((v) => v.node),
        (n: MusicFile) => n?.trackSortOrder?.toLocaleLowerCase()
      );
    } else {
      return [];
    }
  }, [query.data]);
  const scrollLength = (entries.length + 1) * ITEM_HEIGHT;

  const [scrollDistance, setScrollDistance] = useNamedState(
    0,
    "scrollDistance"
  );
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");

  const rowVirtualizer = useVirtualizer({
    count: entries.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10,
    onChange: (instance) => {
      if (instance.scrollElement && !isDragging) {
        setScrollDistance(instance.scrollElement?.scrollTop);
      }
    },
  });

  const parentRefCallback = useCallback((elm: HTMLDivElement) => {
    if (!parentRef.current) {
      parentRef.current = elm;
      rowVirtualizer.measure();
    } else {
      parentRef.current = elm;
    }
  }, []);

  const sliderLookup = useMemo(() => {
    const rows = [null, ...entries];
    const indexes: { name: string; index: number }[] = [
      { name: "#", index: 0 },
    ];
    rows.forEach((i, idx) => {
      if (i === null) return;
      let key: string;
      if (!i?.trackSortOrder) key = "?";
      else {
        const firstChar = i.trackSortOrder.charAt(0);
        if (firstChar.codePointAt(0) < 65 /* "A" */) key = "#";
        else key = firstChar.toLocaleUpperCase();
      }
      if (indexes[indexes.length - 1].name !== key) {
        indexes.push({ name: key, index: idx * ITEM_HEIGHT });
      }
    });
    return indexes;
  }, [entries]);

  if (query.loading)
    return (
      <div className="m-4 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );

  if (query.error)
    return (
      <Alert variant="error" className="m-4 w-auto">
        <AlertCircle />
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );

  const onScrollSliderChange = (newValue: number[]) => {
    setIsDragging(true);
    setScrollDistance(scrollLength - newValue[0]);
    rowVirtualizer.scrollToOffset(scrollLength - newValue[0]);
  };

  return (
    <div className="px-4 h-full relative overflow-hidden">
      <AutoResizer>
        {({ height, width }) => (
          <>
            <TooltipProvider>
              <Tooltip delayDuration={0} open={isDragging}>
                <div className="absolute top-1 bottom-1 right-2 z-50">
                  <Slider
                    orientation="vertical"
                    className="h-full"
                    onValueChange={onScrollSliderChange}
                    onValueCommit={() => setIsDragging(false)}
                    value={[scrollLength - scrollDistance]}
                    min={height}
                    max={scrollLength}
                    track={false}
                    renderThumb={(index) => (
                      <TooltipTrigger asChild key={index}>
                        <SliderThumb key={index} />
                      </TooltipTrigger>
                    )}
                  />
                </div>
                <TooltipContent
                  side="left"
                  className="h-16 w-16 min-w-16 text-2xl flex items-center justify-center text-center bg-primary text-primary-foreground rounded-full"
                >
                  {(() => {
                    const index =
                      _.sortedLastIndexBy(
                        sliderLookup,
                        {
                          index: scrollLength - (scrollLength - scrollDistance),
                          name: "",
                        },
                        "index"
                      ) - 1;
                    return sliderLookup[Math.max(0, index)].name;
                  })()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div
              style={{
                width,
                height,
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
              ref={parentRefCallback}
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
                      height={size}
                      start={start}
                      data={entries}
                      isScrolling={isDragging}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </AutoResizer>
    </div>
  );
}

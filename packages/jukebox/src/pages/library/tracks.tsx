import { getLayout } from "../../components/public/layouts/LibraryLayout";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Slider,
  Tooltip,
} from "@mui/material";
import { SliderValueLabel } from "@mui/material/Slider";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ButtonRow from "../../components/ButtonRow";
import AutoResizer from "react-virtualized-auto-sizer";
import { gql, useQuery } from "@apollo/client";
import { MusicFileFragments } from "../../graphql/fragments";
import { MusicFilesPagination } from "../../graphql/MusicFileResolver";
import React, { useCallback, useMemo, useRef } from "react";
import { MusicFile } from "lyricova-common/models/MusicFile";
import _ from "lodash";
import { useNamedState } from "../../frontendUtils/hooks";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import { useRouter } from "next/router";
import ListItemTextWithTime from "../../components/public/library/ListItemTextWithTime";
import { DocumentNode } from "graphql";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppDispatch } from "../../redux/public/store";
import {
  addTrackToNext,
  loadTracks,
  playTrack,
  toggleShuffle,
} from "../../redux/public/playlist";

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

const SxSliderLabel = {
  height: "4rem",
  width: "4rem",
  minWidth: "4rem",
  fontSize: "2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  backgroundColor: "primary.dark",
  color: "common.white",
  borderRadius: "50% 50% 0% 50%",
};

function SliderLabel(
  props: React.ComponentProps<typeof SliderValueLabel> & {
    children: React.ReactElement;
  }
) {
  return (
    <Tooltip
      enterTouchDelay={0}
      placement={"left-end"}
      componentsProps={{ tooltip: { sx: SxSliderLabel as SxProps } }}
      title={props.value}
    >
      {props.children}
    </Tooltip>
  );
}

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
    const item = index == 0 ? null : data[index + 1];
    const dispatch = useAppDispatch();
    const { user } = useAuthContext();
    const router = useRouter();
    const popupState = usePopupState({
      variant: "popover",
      popupId: `track-list-menu-${item?.id ?? -1}`,
    });

    if (item === null) {
      const playAll = () => {
        dispatch(loadTracks(data.slice(1)));
        dispatch(playTrack({ track: 0, playNow: true }));
      };
      const shuffleAll = () => {
        dispatch(loadTracks(data.slice(1)));
        dispatch(toggleShuffle());
        dispatch(playTrack({ track: 0, playNow: true }));
      };
      return (
        <ListItem style={{ height, transform: `translateY(${start}px)` }}>
          <ButtonRow>
            <Chip
              icon={<PlaylistPlayIcon />}
              onClick={playAll}
              label="Play all"
              clickable
            />
            <Chip
              icon={<ShuffleIcon />}
              onClick={shuffleAll}
              label="Shuffle all"
              clickable
            />
          </ButtonRow>
        </ListItem>
      );
    }

    const handlePlayNext = () => {
      dispatch(addTrackToNext(item));
      popupState.close();
    };
    const handlePlayInList = () => {
      dispatch(loadTracks(data.slice(1)));
      dispatch(playTrack({ track: index - 1, playNow: true }));
      popupState.close();
    };
    const handleShowDetails = () => {
      router.push(`/info/${item.id}`);
      popupState.close();
    };
    const handleEditSongEntry = () => {
      window.open(`/dashboard/review/${item.id}`, "_blank");
      popupState.close();
    };

    return (
      <ListItem
        ContainerProps={{
          style: {
            height,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${start}px)`,
          },
        }}
      >
        <ListItemTextWithTime
          primary={
            isScrolling && item.trackSortOrder
              ? item.trackSortOrder
              : item.trackName
          }
          secondary={
            <>
              {item.artistName || <em>Various artists</em>}
              {" / "}
              {item.albumName || <em>Unknown album</em>}
            </>
          }
          primaryTypographyProps={{ noWrap: true }}
          secondaryTypographyProps={{ noWrap: true }}
          time={item.duration}
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="Actions"
            {...bindTrigger(popupState)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id={`currentPlaylist-menu-${item.id}`}
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
            <MenuItem onClick={handlePlayNext}>
              <ListItemText primary="Play next" />
            </MenuItem>
            <MenuItem onClick={handlePlayInList}>
              <ListItemText primary="Play in the playlist" />
            </MenuItem>
            <MenuItem onClick={handleShowDetails}>
              <ListItemText primary="Show details" />
            </MenuItem>
            {user && (
              <MenuItem onClick={handleEditSongEntry}>
                <ListItemText primary="Edit song entry" />
              </MenuItem>
            )}
          </Menu>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }
);
Row.displayName = "Row";

export default function LibraryTracks() {
  const query = useQuery<{ musicFiles: MusicFilesPagination }>(
    MUSIC_FILES_COUNT_QUERY
  );
  // const recycleListRef = useRef<FixedSizeList>();
  const parentRef = useRef<HTMLDivElement>();

  const entries = useMemo<MusicFile[]>(() => {
    if (query.data) {
      return _.sortBy<MusicFile>(
        query.data.musicFiles.edges.map((v) => v.node),
        (n: MusicFile) =>
          n.trackSortOrder && n.trackSortOrder.toLocaleLowerCase()
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

  // const { outerRef, innerRef, items, scrollToItem } = useVirtual<HTMLDivElement, HTMLDivElement>({
  //   itemCount: entries.length + 1,
  //   itemSize: ITEM_HEIGHT,
  //   // overscanCount: 10,
  //   // onScroll: ({ scrollOffset, userScroll }) => {
  //   //   console.log("on scroll", userScroll, scrollOffset);
  //   //   if (userScroll) setInvScrollDistance(scrollLength - scrollOffset);
  //   // }
  // });
  const rowVirtualizer = useVirtualizer({
    count: entries.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10,
    // debug: true,
    onChange: (instance) => {
      if (instance.scrollElement && !isDragging) {
        // console.log("onChange", instance.scrollElement?.scrollTop);
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

  // console.log("Items count", entries.length + 1, items.length);

  const sliderLookup = useMemo(() => {
    const rows = [null, ...entries];
    const indexes: { name: string; index: number }[] = [
      { name: "#", index: 0 },
    ];
    rows.forEach((i, idx) => {
      if (i === null) return;
      let key: string;
      if (i.trackSortOrder === null || i.trackSortOrder === "") key = "?";
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

  if (query.loading) return <Alert severity="info">Loading...</Alert>;
  if (query.error)
    return <Alert severity="error">Error: {`${query.error}`}</Alert>;

  const onScrollSliderChange = (event: any, newValue: number) => {
    // console.log("Slider change", newValue);
    setIsDragging(true);
    setScrollDistance(scrollLength - newValue);
    // scrollToItem((scrollLength - newValue) / ITEM_HEIGHT, () => console.log("Scroll to done"));
    rowVirtualizer.scrollToOffset(scrollLength - newValue);
  };

  return (
    <Box
      sx={{
        paddingLeft: 4,
        paddingRight: 4,
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AutoResizer>
        {({ height, width }) => (
          <>
            <Slider
              orientation="vertical"
              track={false}
              sx={{
                position: "absolute",
                top: 1,
                bottom: 1,
                right: 0,
                zIndex: 500,
              }}
              onChange={onScrollSliderChange}
              onChangeCommitted={() => setIsDragging(false)}
              valueLabelDisplay="auto"
              components={{ ValueLabel: SliderLabel }}
              valueLabelFormat={(x) => {
                const index =
                  _.sortedLastIndexBy(
                    sliderLookup,
                    { index: scrollLength - x, name: "" },
                    "index"
                  ) - 1;
                return sliderLookup[Math.max(0, index)].name;
              }}
              value={scrollLength - scrollDistance}
              min={height}
              max={scrollLength}
            />
            <div
              style={{
                width,
                height,
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
              ref={parentRefCallback}
            >
              {/* Items: {entries.length + 1} @ {rowVirtualizer.getTotalSize()}, w: {width}, h: {height} */}
              <List
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
              </List>
              {/* <FixedSizeList
            itemSize={ITEM_HEIGHT} itemCount={entries.length + 1}
            height={height} width={width}
            itemData={[null, ...entries]}
            // useIsScrolling
            onScroll={({ scrollOffset }) => setScrollDistance(scrollOffset)}
            ref={recycleListRef}
            style={{ scrollbarWidth: "none", }}
          >{Row}</FixedSizeList> */}
            </div>
          </>
        )}
      </AutoResizer>
    </Box>
  );
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
LibraryTracks.layout = getLayout;

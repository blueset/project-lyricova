import { getLayout } from "../components/public/layouts/IndexLayout";
import {
  Box,
  IconButton,
  InputAdornment,
  List,
  TextField,
} from "@mui/material";
import { useNamedState } from "../hooks/useNamedState";
import type { ChangeEvent, FormEvent, ReactNode} from "react";
import React, { useCallback } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import { MusicFileFragments } from "lyricova-common/utils/fragments";
import type { MusicFile } from "lyricova-common/models/MusicFile";
import Alert from "@mui/material/Alert";
import SearchIcon from "@mui/icons-material/Search";
import TrackListRow from "../components/public/library/TrackListRow";

const MUSIC_FILE_SEARCH_QUERY = gql`
  query($keywords: String!) {
    searchMusicFiles(keywords: $keywords) {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

export default function Search() {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
    },
    [setSearchKeyword]
  );

  const [searchFiles, searchFilesQuery] = useLazyQuery<{
    searchMusicFiles: MusicFile[];
  }>(MUSIC_FILE_SEARCH_QUERY);
  const handleSearch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await searchFiles({ variables: { keywords: searchKeyword } });
      return false;
    },
    [searchKeyword, searchFiles]
  );

  let content: ReactNode;
  if (!searchFilesQuery.called) content = null;
  else if (searchFilesQuery.loading)
    content = <Alert severity="info">Loading...</Alert>;
  else if (searchFilesQuery.error)
    content = (
      <Alert severity="error">Error: {`${searchFilesQuery.error}`}</Alert>
    );
  else if (searchFilesQuery.data.searchMusicFiles.length < 1)
    content = <Alert severity="info">No result found.</Alert>;
  else {
    content = searchFilesQuery.data.searchMusicFiles.map((v) => (
      //   <ListItem key={v.id}>
      //   <ListItemAvatar><Avatar sizes="large" src={v.hasCover ? `/api/files/${v.id}/cover` : "/images/disk-128.jpg"} variant="rounded" /></ListItemAvatar>
      //   <ListItemTextWithTime
      //     primary={v.trackName || <em>Untitled track</em>}
      //     secondary={<>{v.artistName || <em>Various Artists</em>} / {v.albumName || <em>Unknown Album</em>}</>}
      //     time={v.duration} />
      // </ListItem>
      (<TrackListRow
        song={null}
        file={v}
        files={searchFilesQuery.data.searchMusicFiles}
        key={v.id}
        showAlbum
      />)
    ));
  }

  return (
    (<Box p={4} pt={0}>
      <form
        onSubmit={handleSearch}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <TextField
          value={searchKeyword}
          label="Search keywords"
          variant="filled"
          fullWidth
          margin="none"
          size="medium"
          sx={{ backdropFilter: "blur(10px)" }}
          onChange={handleChange}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" aria-label="search" edge="end">
                    <SearchIcon fontSize="large" />
                  </IconButton>
                </InputAdornment>
              ),
            },

            htmlInput: { sx: { fontSize: "2em" } },

            inputLabel: {
              sx: {
                "&[data-shrink=false]": {
                  transform: "translate(14px, 20px) scale(2)",
                },
              },
            }
          }} />
      </form>
      <List>{content}</List>
    </Box>)
  );
}

Search.layout = getLayout;

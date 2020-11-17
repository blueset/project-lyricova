import Link, { NextComposedLink } from "../components/Link";
import { getLayout } from "../components/public/layouts/IndexLayout";
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  StepContent,
  TextField
} from "@material-ui/core";
import { useNamedState } from "../frontendUtils/hooks";
import React, { ChangeEvent, FormEvent, ReactNode, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { gql, useLazyQuery } from "@apollo/client";
import { MxGetSearchResult } from "../graphql/DownloadResolver";
import { MusicFileFragments } from "../graphql/fragments";
import { MusicFile } from "../models/MusicFile";
import theme from "../frontendUtils/theme";
import { Alert } from "@material-ui/lab";
import ListItemTextWithTime from "../components/public/library/ListItemTextWithTime";
import SearchIcon from "@material-ui/icons/Search";
import TrackListRow from "../components/public/library/TrackListRow";

const MUSIC_FILE_SEARCH_QUERY = gql`
  query($keywords: String!) {
    searchMusicFiles(keywords: $keywords) {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

const useStyles = makeStyles((theme) => ({
  form: {
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  textField: {
    backdropFilter: "blur(10px)",
  },
  textFieldInput: {
    fontSize: "2em",
  },
  inputLabel: {
    transform: "translate(14px, 20px) scale(2)",
  }
}));

export default function Search() {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");
  const styles = useStyles();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  }, [setSearchKeyword]);


  const [searchFiles, searchFilesQuery] = useLazyQuery<{ searchMusicFiles: MusicFile[] }>(MUSIC_FILE_SEARCH_QUERY);
  const handleSearch = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    await searchFiles({ variables: { keywords: searchKeyword } });
    return false;
  }, [searchKeyword, searchFiles]);


  let content: ReactNode;
  if (!searchFilesQuery.called) content = null;
  else if (searchFilesQuery.loading) content = <Alert severity="info">Loading...</Alert>;
  else if (searchFilesQuery.error) content = <Alert severity="error">Error: {`${searchFilesQuery.error}`}</Alert>;
  else if (searchFilesQuery.data.searchMusicFiles.length < 1) content = <Alert severity="info">No result found.</Alert>;
  else {
    content = searchFilesQuery.data.searchMusicFiles.map(v =>
    //   <ListItem key={v.id}>
    //   <ListItemAvatar><Avatar sizes="large" src={v.hasCover ? `/api/files/${v.id}/cover` : "/images/disk-128.jpg"} variant="rounded" /></ListItemAvatar>
    //   <ListItemTextWithTime
    //     primary={v.trackName || <em>Untitled track</em>}
    //     secondary={<>{v.artistName || <em>Various Artists</em>} / {v.albumName || <em>Unknown Album</em>}</>}
    //     time={v.duration} />
    // </ListItem>
      <TrackListRow song={null} file={v} files={searchFilesQuery.data.searchMusicFiles} key={v.id} showAlbum />
    );
  }

  return <Box p={4} pt={0}>
    <form onSubmit={handleSearch} className={styles.form}>
      <TextField value={searchKeyword} label="Search keywords" variant="filled"
                 fullWidth margin="none" size="medium" inputProps={{ className: styles.textFieldInput }}
                 InputLabelProps={{ className: styles.inputLabel }}
                 InputProps={{endAdornment: <InputAdornment position="end">
                     <IconButton type="submit" aria-label="search" edge="end">
                       <SearchIcon fontSize="large" />
                     </IconButton>
                   </InputAdornment>}}
                 className={styles.textField}
                 onChange={handleChange} />
    </form>
    <List>
      {content}
    </List>
  </Box>;
}

Search.layout = getLayout;

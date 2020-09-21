import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid, IconButton,
  List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Radio
} from "@material-ui/core";
import { ChangeEvent, useCallback, useEffect } from "react";
import { Song } from "../../../models/Song";
import { useNamedState } from "../../../frontendUtils/hooks";
import axios from "axios";
import { PartialFindResult, SongForApiContract } from "../../../types/vocadb";
import _ from "lodash";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { Skeleton } from "@material-ui/lab";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  secondaryAction: {
    paddingRight: 104,
  },
});

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
}

export default function VocaDBSearchSongDialog({ isOpen, toggleOpen, keyword, setKeyword, setSong }: Props) {
  const styles = useStyles();

  const [results, setResults] = useNamedState<SongForApiContract[]>([], "results");
  const [isLoaded, toggleLoaded] = useNamedState(false, "loaded");
  const [selectedSong, setSelectedSong] = useNamedState<number | null>(null, "selectedSong");

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleLoaded(false);
  }, [toggleOpen, setKeyword, setResults, toggleLoaded]);

  const handleChooseRadio = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSelectedSong(parseInt(event.target.value));
  }, [setSelectedSong]);

  useEffect(() => {
    if (keyword === "") return;

    let active = true;

    (async () => {
      const response = await axios.get<PartialFindResult<SongForApiContract>>(
        "https://vocadb.net/api/songs",
        {
          params: {
            query: keyword,
            sort: "FavoritedTimes",
            nameMatchMode: "Auto",
            fields: "ThumbUrl",
            lang: "Japanese",
          }
        }
      );

      if (active) {
        toggleLoaded(true);
        if (response.status === 200) {
          setResults(response.data.items);
        } else {
          setResults([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [keyword, setResults, toggleLoaded]);

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">Searching VocaDB for <strong>{keyword}</strong></DialogTitle>
      <DialogContent>
        <DialogContentText>
          <List>
            {isLoaded ? results.map((v) => (
              <ListItem key={v.id} classes={{
                secondaryAction: styles.secondaryAction
              }}>
                <ListItemAvatar>
                  <Avatar variant="rounded" src={v.thumbUrl}>
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={v.name}
                  secondary={v.artistString}
                />
                <ListItemSecondaryAction>
                  <IconButton href={`https://vocadb.net/S/${v.id}`} target="_blank">
                    <OpenInNewIcon />
                  </IconButton>
                  <Radio
                    checked={selectedSong === v.id}
                    value={v.id}
                    onChange={handleChooseRadio}
                    name="selectedSong"
                    inputProps={{ "aria-label": `${v.name} / ${v.artistString}` }}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            )) : _.range(5).map(v => (
              <ListItem key={v}>
                <ListItemAvatar>
                  <Skeleton variant="rect"><Avatar variant="rounded" /></Skeleton>
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton />}
                  secondary={<Skeleton />}
                />
              </ListItem>
            ))}
          </List>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleClose} color="primary">
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
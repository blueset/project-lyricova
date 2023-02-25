import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Radio,
} from "@mui/material";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Song } from "../models/Song";
import axios from "axios";
import { PartialFindResult, SongForApiContract } from "../types/vocadb";
import _ from "lodash";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Skeleton } from "@mui/material";
import { useSnackbar } from "notistack";
import { gql, useApolloClient } from "@apollo/client";
import { SongFragments } from "../utils/fragments";
import { DocumentNode } from "graphql";
import React from "react";

const IMPORT_SONG_MUTATION = gql`
  mutation($id: Int!) {
    enrolSongFromVocaDB(songId: $id) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
}

export default function VocaDBSearchSongDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setSong,
}: Props) {
  const [results, setResults] = useState<SongForApiContract[]>([]);
  const [isLoaded, toggleLoaded] = useState(false);
  const [selectedSong, setSelectedSong] = useState<number | null>(null);
  const [isImporting, toggleImporting] = useState(false);

  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleImporting(false);
    setSelectedSong(null);
    toggleLoaded(false);
  }, [
    toggleOpen,
    setKeyword,
    setResults,
    toggleImporting,
    setSelectedSong,
    toggleLoaded,
  ]);

  const handleSubmit = useCallback(async () => {
    if (selectedSong === null) {
      snackbar.enqueueSnackbar("Please choose a song to import.", {
        variant: "error",
      });
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolSongFromVocaDB: Partial<Song>;
      }>({
        mutation: IMPORT_SONG_MUTATION,
        variables: {
          id: selectedSong,
        },
      });

      if (result.data) {
        setSong(result.data.enrolSongFromVocaDB);
        snackbar.enqueueSnackbar(
          `Song “${result.data.enrolSongFromVocaDB.name}” is successfully enrolled.`,
          {
            variant: "success",
          }
        );
        handleClose();
      } else {
        toggleImporting(false);
      }
    } catch (e) {
      console.error(`Error occurred while importing song #${selectedSong}.`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while importing song #${selectedSong}. (${e})`,
        {
          variant: "error",
        }
      );
      toggleImporting(false);
    }
  }, [
    apolloClient,
    handleClose,
    selectedSong,
    setSong,
    snackbar,
    toggleImporting,
  ]);

  const handleChooseRadio = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSelectedSong(parseInt(event.target.value));
    },
    [setSelectedSong]
  );

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
          },
        }
      );

      if (active) {
        toggleLoaded(true);
        if (response.status === 200) {
          setResults(response.data.items!);
        } else {
          setResults([]);
          console.error(
            "Error occurred while loading search results from VocaDB",
            response
          );
          snackbar.enqueueSnackbar(
            `Error occurred while loading search results from VocaDB. (${response.status} ${response.statusText})`,
            {
              variant: "error",
            }
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [keyword, setResults, snackbar, toggleLoaded]);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
      scroll="paper"
    >
      <DialogTitle id="form-dialog-title">
        Searching VocaDB for <strong>{keyword}</strong>
      </DialogTitle>
      <DialogContent dividers>
        <List>
          {isLoaded ? (
            results.length > 0 ? (
              results.map((v) => (
                <ListItem key={v.id} sx={{ pr: 12 }}>
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={v.thumbUrl}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={v.name} secondary={v.artistString} />
                  <ListItemSecondaryAction>
                    <IconButton
                      href={`https://vocadb.net/S/${v.id}`}
                      target="_blank"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                    <Radio
                      checked={selectedSong === v.id}
                      value={v.id}
                      onChange={handleChooseRadio}
                      name="selectedSong"
                      inputProps={{
                        "aria-label": `${v.name} / ${v.artistString}`,
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText secondary="No result found." />
              </ListItem>
            )
          ) : (
            _.range(5).map((v) => (
              <ListItem key={v}>
                <ListItemAvatar>
                  <Skeleton variant="rectangular">
                    <Avatar variant="rounded" />
                  </Skeleton>
                </ListItemAvatar>
                <ListItemText primary={<Skeleton />} secondary={<Skeleton />} />
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button
          disabled={selectedSong === null || isImporting}
          onClick={handleSubmit}
          color="primary"
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
import { Album } from "../models/Album";
import axios from "axios";
import { PartialFindResult, AlbumForApiContract } from "../types/vocadb";
import _ from "lodash";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Skeleton } from "@mui/material";
import { useSnackbar } from "notistack";
import { gql, useApolloClient } from "@apollo/client";
import { AlbumFragments } from "../utils/fragments";
import { DocumentNode } from "graphql";
import React from "react";

const IMPORT_ALBUM_MUTATION = gql`
  mutation($id: Int!) {
    enrolAlbumFromVocaDB(albumId: $id) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setAlbum: (value: Partial<Album>) => void;
}

export default function VocaDBSearchAlbumDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setAlbum,
}: Props) {
  const [results, setResults] = useState<AlbumForApiContract[]>([]);
  const [isLoaded, toggleLoaded] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [isImporting, toggleImporting] = useState(false);

  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleImporting(false);
    setSelectedAlbum(null);
    toggleLoaded(false);
  }, [
    toggleOpen,
    setKeyword,
    setResults,
    toggleImporting,
    setSelectedAlbum,
    toggleLoaded,
  ]);

  const handleSubmit = useCallback(async () => {
    if (selectedAlbum === null) {
      snackbar.enqueueSnackbar("Please choose a album to import.", {
        variant: "error",
      });
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolAlbumFromVocaDB: Partial<Album>;
      }>({
        mutation: IMPORT_ALBUM_MUTATION,
        variables: {
          id: selectedAlbum,
        },
      });

      if (result.data) {
        setAlbum(result.data.enrolAlbumFromVocaDB);
        snackbar.enqueueSnackbar(
          `Album “${result.data.enrolAlbumFromVocaDB.name}” is successfully enrolled.`,
          {
            variant: "success",
          }
        );
        handleClose();
      } else {
        toggleImporting(false);
      }
    } catch (e) {
      console.error(
        `Error occurred while importing album #${selectedAlbum}.`,
        e
      );
      snackbar.enqueueSnackbar(
        `Error occurred while importing album #${selectedAlbum}. (${e})`,
        {
          variant: "error",
        }
      );
      toggleImporting(false);
    }
  }, [
    apolloClient,
    handleClose,
    selectedAlbum,
    setAlbum,
    snackbar,
    toggleImporting,
  ]);

  const handleChooseRadio = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSelectedAlbum(parseInt(event.target.value));
    },
    [setSelectedAlbum]
  );

  useEffect(() => {
    if (keyword === "") return;

    let active = true;

    (async () => {
      const response = await axios.get<PartialFindResult<AlbumForApiContract>>(
        "https://vocadb.net/api/albums",
        {
          params: {
            query: keyword,
            sort: "Name",
            nameMatchMode: "Auto",
            fields: "MainPicture",
          },
        }
      );

      const idResponse = keyword.match(/^\d+$/)
        ? await axios.get<AlbumForApiContract>(
            `https://vocadb.net/api/albums/${keyword}`,
            { params: { fields: "MainPicture" } }
          )
        : null;

      if (active) {
        toggleLoaded(true);
        if (response.status === 200) {
          setResults(response.data.items!);
          if (idResponse?.status === 200) {
            setResults((res) => [idResponse.data, ...res]);
          }
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
                    <Avatar variant="rounded" src={v.mainPicture?.urlOriginal}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={v.name} secondary={v.artistString} />
                  <ListItemSecondaryAction>
                    <IconButton
                      href={`https://vocadb.net/Al/${v.id}`}
                      target="_blank"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                    <Radio
                      checked={selectedAlbum === v.id}
                      value={v.id}
                      onChange={handleChooseRadio}
                      name="selectedAlbum"
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
          disabled={selectedAlbum === null || isImporting}
          onClick={handleSubmit}
          color="primary"
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

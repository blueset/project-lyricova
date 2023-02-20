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
  Radio
} from "@mui/material";
import { ChangeEvent, useCallback, useEffect } from "react";
import { Artist } from "lyricova-common/models/Artist";
import { useNamedState } from "../../../frontendUtils/hooks";
import axios from "axios";
import type { PartialFindResult, ArtistForApiContract } from "../../../types/vocadb";
import _ from "lodash";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Skeleton } from "@mui/material";
import { useSnackbar } from "notistack";
import { gql, useApolloClient } from "@apollo/client";
import { ArtistFragments } from "../../../graphql/fragments";
import { DocumentNode } from "graphql";

const IMPORT_SONG_MUTATION = gql`
  mutation($id: Int!) {
    enrolArtistFromVocaDB(artistId: $id) {
      ...SelectArtistEntry
    }
  }
  
  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setArtist: (value: Partial<Artist>) => void;
}

export default function VocaDBSearchArtistDialog({ isOpen, toggleOpen, keyword, setKeyword, setArtist }: Props) {
  const [results, setResults] = useNamedState<ArtistForApiContract[]>([], "results");
  const [isLoaded, toggleLoaded] = useNamedState(false, "loaded");
  const [selectedArtist, setSelectedArtist] = useNamedState<number | null>(null, "selectedArtist");
  const [isImporting, toggleImporting] = useNamedState(false, "importing");

  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleImporting(false);
    setSelectedArtist(null);
    toggleLoaded(false);
  }, [toggleOpen, setKeyword, setResults, toggleImporting, setSelectedArtist, toggleLoaded]);

  const handleSubmit = useCallback(async () => {
    if (selectedArtist === null) {
      snackbar.enqueueSnackbar("Please choose a artist to import.", {
        variant: "error",
      });
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{ enrolArtistFromVocaDB: Partial<Artist> }>({
        mutation: IMPORT_SONG_MUTATION,
        variables: {
          id: selectedArtist,
        }
      });
      if (result.data) {
        setArtist(result.data.enrolArtistFromVocaDB);
        snackbar.enqueueSnackbar(`Artist “${result.data.enrolArtistFromVocaDB.name}” is successfully enrolled.`, {
          variant: "success",
        });
        handleClose();
      }
    } catch (e) {
      console.error(`Error occurred while importing artist #${selectedArtist}.`, e);
      snackbar.enqueueSnackbar(`Error occurred while importing artist #${selectedArtist}. (${e})`, {
        variant: "error",
      });
      toggleImporting(false);
    }

  }, [apolloClient, handleClose, selectedArtist, setArtist, snackbar, toggleImporting]);

  const handleChooseRadio = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSelectedArtist(parseInt(event.target.value));
  }, [setSelectedArtist]);

  useEffect(() => {
    if (keyword === "") return;

    let active = true;

    (async () => {
      const response = await axios.get<PartialFindResult<ArtistForApiContract>>(
        "https://vocadb.net/api/artists",
        {
          params: {
            query: keyword,
            sort: "SongCount",
            nameMatchMode: "Auto",
            fields: "MainPicture",
          }
        }
      );

      if (active) {
        toggleLoaded(true);
        if (response.status === 200) {
          setResults(response.data.items);
        } else {
          setResults([]);
          console.error("Error occurred while loading search results from VocaDB", response);
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
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title" scroll="paper">
      <DialogTitle id="form-dialog-title">Searching VocaDB for <strong>{keyword}</strong></DialogTitle>
      <DialogContent dividers>
        <List>
          {isLoaded ? (
            results.length > 0 ?
              results.map((v) => (
                <ListItem key={v.id} sx={{pr: 12}}>
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={v.mainPicture?.urlOriginal}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={v.name}
                    secondary={v.artistType}
                  />
                  <ListItemSecondaryAction>
                    <IconButton href={`https://vocadb.net/Ar/${v.id}`} target="_blank">
                      <OpenInNewIcon />
                    </IconButton>
                    <Radio
                      checked={selectedArtist === v.id}
                      value={v.id}
                      onChange={handleChooseRadio}
                      name="selectedArtist"
                      inputProps={{ "aria-label": `${v.name} is a ${v.artistType}` }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))
              :
              <ListItem>
                <ListItemText secondary="No result found." />
              </ListItem>
          ) : _.range(5).map(v => (
            <ListItem key={v}>
              <ListItemAvatar>
                <Skeleton variant="rectangular"><Avatar variant="rounded" /></Skeleton>
              </ListItemAvatar>
              <ListItemText
                primary={<Skeleton />}
                secondary={<Skeleton />}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button disabled={selectedArtist === null || isImporting} onClick={handleSubmit} color="primary">
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
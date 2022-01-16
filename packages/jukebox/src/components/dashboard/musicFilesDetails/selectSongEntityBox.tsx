import {
  AutocompleteRenderInputParams,
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton, Stack, TextField,
  TextField as MuiTextField,
  Typography
} from "@mui/material";
import { FilterOptionsState } from "@material-ui/lab/useAutocomplete/useAutocomplete";
import { Song } from "../../../models/Song";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useEffect } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { makeStyles } from "@mui/material/styles";
import VocaDBSearchSongDialog from "./vocaDBSearchSongDialog";
import { SongFragments } from "../../../graphql/fragments";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import SongEntityDialog from "./songEntityDialog";
import { useField, useForm } from "react-final-form";
import { Autocomplete } from "mui-rff";
import { formatArtists } from "../../../frontendUtils/artists";
import { DocumentNode } from "graphql";

export type ExtendedSong = Partial<Song> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_SONG_ENTITY_QUERY = gql`
  query($text: String!) {
    searchSongs(keywords: $text) {
      ...SelectSongEntry
    }
  }
  
  ${SongFragments.SelectSongEntry}
` as DocumentNode;

interface Props<T extends string> {
  fieldName: T;
  labelName: string;
  title?: string;
}

export default function SelectSongEntityBox<T extends string>({ fieldName, labelName, title }: Props<T>) {
  const apolloClient = useApolloClient();
  const { input: { value } } = useField<ExtendedSong>(fieldName);
  const setValue = useForm().mutators.setValue;

  const [vocaDBAutoCompleteOptions, setVocaDBAutoCompleteOptions] = useNamedState<ExtendedSong[]>([], "vocaDBAutoCompleteOptions");
  const [vocaDBAutoCompleteText, setVocaDBAutoCompleteText] = useNamedState("", "vocaDBAutoCompleteText");

  const [importDialogKeyword, setImportDialogKeyword] = useNamedState("", "importDialogKeyword");

  // Confirm import pop-up
  const [isImportDialogOpen, toggleImportDialogOpen] = useNamedState(false, "importDialogOpen");

  // Confirm manual enrol pop-up
  const [isManualDialogOpen, toggleManualDialogOpen] = useNamedState(false, "manualDialogOpen");
  const [isManualDialogForCreate, toggleManualDialogForCreate] = useNamedState(true, "manualDialogForCreate");

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (vocaDBAutoCompleteText === "") {
      setVocaDBAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{ searchSongs: Song[] }>({
        query: LOCAL_SONG_ENTITY_QUERY,
        variables: { text: vocaDBAutoCompleteText },
      });

      const vocaDBPromise = axios.get<string[]>(
        "https://vocadb.net/api/songs/names",
        {
          params: {
            query: vocaDBAutoCompleteText,
            nameMatchMode: "Auto",
          }
        }
      );

      if (active) {
        let result: ExtendedSong[] = [];

        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchSongs) {
            result = result.concat(apolloResult.data?.searchSongs);
          }
        } catch (e) { /* No-Op. */
        }

        try {
          const vocaDBResult = await vocaDBPromise;
          if (vocaDBResult.status === 200 && vocaDBResult.data) {
            result = result.concat(vocaDBResult.data.map(v => ({
              id: null,
              name: v,
              sortOrder: `"${v}"`,
              vocaDBSuggestion: true,
            })));
          }
          if (value && !_.some(result, v => v.id === value.id)) {
            result = [value, ...result];
          }
        } catch (e) { /* No-Op. */
        }

        setVocaDBAutoCompleteOptions(result);
      }
    }, 200)();

    return () => {
      active = false;
    };
  }, [vocaDBAutoCompleteText, apolloClient, setVocaDBAutoCompleteOptions]);

  return (
    <>
      {title && <Typography variant="h6" component="h3" gutterBottom>{title}</Typography>}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Autocomplete
            name={fieldName}
            options={vocaDBAutoCompleteOptions}
            label={labelName}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            textFieldProps={{ variant: "outlined", size: "small" }}
            // renderInput={(params: AutocompleteRenderInputParams) => <TextField {...params} label={labelName} />}
            filterOptions={(v: ExtendedSong[], params: FilterOptionsState<ExtendedSong>) => {
              if (params.inputValue !== "") {
                v.push({
                  id: null,
                  name: `Search for “${params.inputValue}”`,
                  sortOrder: params.inputValue,
                  vocaDBSuggestion: true,
                });
                v.push({
                  id: null,
                  name: `Manually add “${params.inputValue}”`,
                  sortOrder: params.inputValue,
                  manual: true,
                });
              }
              return v;
            }}
            onInputChange={(event: unknown, newValue: string) => {
              setVocaDBAutoCompleteText(newValue);
            }}
            onChange={(event: unknown, newValue: ExtendedSong | null, reason: string) => {
              if (newValue === null) {
                setVocaDBAutoCompleteOptions([]);
                if (reason === "clear") {
                  setValue(fieldName, null);
                }
                return;
              }
              if (newValue.vocaDBSuggestion) {
                setImportDialogKeyword(newValue.sortOrder);
                toggleImportDialogOpen(true);
                setVocaDBAutoCompleteOptions([]);
              } else if (newValue.manual) {
                setImportDialogKeyword(newValue.sortOrder);
                toggleManualDialogForCreate(true);
                toggleManualDialogOpen(true);
                setVocaDBAutoCompleteOptions([]);
                setValue(fieldName, null);
              } else {
                setValue(fieldName, newValue);
              }
            }}
            renderOption={(params, option: ExtendedSong | null) => {
              let icon = <MusicNoteIcon sx={{color: "text.secondary", marginRight: 2 }} />;
              if (option.vocaDBSuggestion) icon = <SearchIcon sx={{color: "text.secondary", marginRight: 2 }} />;
              else if (option.manual) icon = <AddCircleIcon sx={{color: "text.secondary", marginRight: 2 }} />;
              return (
                <Stack component="li" {...params} flexDirection="row" alignItems="center">
                  {icon} {option.name}
                </Stack>
              );
            }}
            getOptionLabel={(option: ExtendedSong | null) => {
              // Prevent ”Manually add ...” item from being rendered
              if (option === null || option.id === null) return "";
              return option.name || "";
            }}
          />
        </Grid>
        {value && value.id && (
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" sx={{marginBottom: 2, flexWrap: {"xs": "wrap"}}}>
              <div>
                <Avatar
                  src={value.coverUrl} variant="rounded"
                  sx={{height: "3em", width: "3em", marginRight: 2}}
                >
                  <MusicNoteIcon />
                </Avatar>
              </div>
              <div style={{flexGrow: 1, flexBasis: 0,}}>
                <div>
                  <Typography component="span">
                    {value.name}
                  </Typography>
                  {" "}
                  <Typography color="textSecondary" component="span">
                    ({value.sortOrder}) #{value.id}
                  </Typography>
                </div>
                {value.artists && <Stack direction="row" alignItems="center">
                  {
                    formatArtists(value.artists, a => a.map(v => (
                      <Chip variant="outlined" size="small" key={v.sortOrder}
                            label={v.ArtistOfSong.customName || v.name} />
                    )))
                  }
                </Stack>}
              </div>
              <div>
                {value.id >= 0 && (
                  <IconButton href={`https://vocadb.net/S/${value.id}`} target="_blank">
                    <OpenInNewIcon />
                  </IconButton>
                )}
                <IconButton onClick={() => {
                  toggleManualDialogForCreate(false);
                  toggleManualDialogOpen(true);
                }}>
                  <EditIcon />
                </IconButton>
              </div>
            </Stack>
          </Grid>
        )}
      </Grid>
      {isImportDialogOpen && <VocaDBSearchSongDialog
          isOpen={isImportDialogOpen}
          toggleOpen={toggleImportDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setSong={(v) => setValue(fieldName, v)}
      />}
      {isManualDialogOpen && <SongEntityDialog
          isOpen={isManualDialogOpen}
          toggleOpen={toggleManualDialogOpen}
          keyword={importDialogKeyword}
          songToEdit={value}
          create={isManualDialogForCreate}
          setKeyword={setImportDialogKeyword}
          setSong={(v) => setValue(fieldName, v)}
      />}
    </>
  );
}
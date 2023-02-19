import {
  AutocompleteRenderInputParams,
  Avatar,
  Box,
  FilterOptionsState,
  Grid,
  IconButton,
  Stack,
  TextField,
  TextField as MuiTextField,
  Typography,
} from "@mui/material";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useCallback, useEffect } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { makeStyles } from "@mui/material/styles";
import { ArtistFragments } from "../../../graphql/fragments";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import { Artist } from "lyricova-common/models/Artist";
import VocaDBSearchArtistDialog from "./vocaDBSearchArtistDialog";
import ArtistEntityDialog from "./artistEntityDialog";
import { useField, useForm } from "react-final-form";
import { ExtendedSong } from "./selectSongEntityBox";
import { Autocomplete } from "mui-rff";
import { DocumentNode } from "graphql";

export type ExtendedArtist = Partial<Artist> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query($text: String!) {
    searchArtists(keywords: $text) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

interface Props<T extends string> {
  fieldName: T;
  labelName: string;
  title?: string;
}

export default function SelectArtistEntityBox<T extends string>({
  fieldName,
  labelName,
  title,
}: Props<T>) {
  const apolloClient = useApolloClient();
  const {
    input: { value },
  } = useField<ExtendedArtist>(fieldName);
  const setValue = useForm().mutators.setValue;

  const [
    vocaDBAutoCompleteOptions,
    setVocaDBAutoCompleteOptions,
  ] = useNamedState<ExtendedArtist[]>([], "vocaDBAutoCompleteOptions");
  const [vocaDBAutoCompleteText, setVocaDBAutoCompleteText] = useNamedState(
    "",
    "vocaDBAutoCompleteText"
  );

  const [importDialogKeyword, setImportDialogKeyword] = useNamedState(
    "",
    "importDialogKeyword"
  );

  // Confirm import pop-up
  const [isImportDialogOpen, toggleImportDialogOpen] = useNamedState(
    false,
    "importDialogOpen"
  );

  // Confirm manual enrol pop-up
  const [isManualDialogOpen, toggleManualDialogOpen] = useNamedState(
    false,
    "manualDialogOpen"
  );
  const [isManualDialogForCreate, toggleManualDialogForCreate] = useNamedState(
    true,
    "manualDialogForCreate"
  );

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (vocaDBAutoCompleteText === "") {
      setVocaDBAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{ searchArtists: Artist[] }>({
        query: LOCAL_ARTIST_ENTITY_QUERY,
        variables: { text: vocaDBAutoCompleteText },
      });

      const vocaDBPromise = axios.get<string[]>(
        "https://vocadb.net/api/artists/names",
        {
          params: {
            query: vocaDBAutoCompleteText,
            nameMatchMode: "Auto",
          },
        }
      );

      if (active) {
        let result: ExtendedArtist[] = [];

        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchArtists) {
            result = result.concat(apolloResult.data?.searchArtists);
          }
        } catch (e) {
          /* No-Op. */
        }

        try {
          const vocaDBResult = await vocaDBPromise;
          if (vocaDBResult.status === 200 && vocaDBResult.data) {
            result = result.concat(
              vocaDBResult.data.map((v) => ({
                id: null,
                name: v,
                sortOrder: `"${v}"`,
                vocaDBSuggestion: true,
              }))
            );
          }
          if (value && !_.some(result, (v) => v.id === value.id)) {
            result = [value, ...result];
          }
        } catch (e) {
          /* No-Op. */
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
      {title && (
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
      )}
      <Grid container spacing={1}>
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
            filterOptions={(
              v: ExtendedArtist[],
              params: FilterOptionsState<ExtendedArtist>
            ) => {
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
            onChange={(
              event: unknown,
              newValue: ExtendedArtist | null,
              reason: string
            ) => {
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
                toggleManualDialogOpen(true);
                toggleManualDialogForCreate(true);
                setVocaDBAutoCompleteOptions([]);
              } else {
                setValue(fieldName, newValue);
              }
            }}
            renderOption={(params, option: ExtendedArtist | null) => {
              let icon = (
                <MusicNoteIcon
                  sx={{ color: "text.secondary", marginRight: 2 }}
                />
              );
              if (option.vocaDBSuggestion)
                icon = (
                  <SearchIcon
                    sx={{ color: "text.secondary", marginRight: 2 }}
                  />
                );
              else if (option.manual)
                icon = (
                  <AddCircleIcon
                    sx={{ color: "text.secondary", marginRight: 2 }}
                  />
                );
              return (
                <Stack
                  component="li"
                  {...params}
                  flexDirection="row"
                  alignItems="center"
                >
                  {icon} {option.name}
                </Stack>
              );
            }}
            getOptionLabel={(option: ExtendedArtist | null) => {
              // Prevent ”Manually add ...” item from being rendered
              if (option === null || option.id === null) return "";
              return option.name;
            }}
          />
        </Grid>
        {value && (
          <Grid item xs={12}>
            <Stack
              direction="row"
              alignItems="center"
              sx={{ marginBottom: 2, flexWrap: { xs: "wrap" } }}
            >
              <div>
                <Avatar
                  src={value.mainPictureUrl}
                  variant="rounded"
                  sx={{ height: "3em", width: "3em", marginRight: 2 }}
                >
                  <MusicNoteIcon />
                </Avatar>
              </div>
              <div style={{ flexGrow: 1, flexBasis: 0 }}>
                <Typography>{value.name}</Typography>
                <Typography color="textSecondary">
                  {value.sortOrder} ({value.type}) #{value.id}
                </Typography>
              </div>
              <div>
                {value.id >= 0 && (
                  <IconButton
                    href={`https://vocadb.net/Ar/${value.id}`}
                    target="_blank"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => {
                    toggleManualDialogForCreate(false);
                    toggleManualDialogOpen(true);
                  }}
                >
                  <EditIcon />
                </IconButton>
              </div>
            </Stack>
          </Grid>
        )}
      </Grid>
      {isImportDialogOpen && (
        <VocaDBSearchArtistDialog
          isOpen={isImportDialogOpen}
          toggleOpen={toggleImportDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setArtist={(v) => setValue(fieldName, v)}
        />
      )}
      {isManualDialogOpen && (
        <ArtistEntityDialog
          isOpen={isManualDialogOpen}
          toggleOpen={toggleManualDialogOpen}
          keyword={importDialogKeyword}
          create={isManualDialogForCreate}
          artistToEdit={value}
          setKeyword={setImportDialogKeyword}
          setArtist={(v) => setValue(fieldName, v)}
        />
      )}
    </>
  );
}

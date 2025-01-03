import {
  Avatar,
  FilterOptionsState,
  Grid2 as Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { ArtistFragments } from "../utils/fragments";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import { Artist } from "../models/Artist";
import VocaDBSearchArtistDialog from "./vocaDBSearchArtistDialog";
import ArtistEntityDialog from "./artistEntityDialog";
import { useField, useForm } from "react-final-form";
import { Autocomplete } from "mui-rff";
import { DocumentNode } from "graphql";
import React from "react";

export type ExtendedArtist = Partial<Artist> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query ($text: String!) {
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

  const [vocaDBAutoCompleteOptions, setVocaDBAutoCompleteOptions] = useState<
    ExtendedArtist[]
  >([]);
  const [vocaDBAutoCompleteText, setVocaDBAutoCompleteText] = useState("");

  const [importDialogKeyword, setImportDialogKeyword] = useState("");
  const [touched, setTouched] = useState(false);

  // Confirm import pop-up
  const [isImportDialogOpen, toggleImportDialogOpen] = useState(false);

  // Confirm manual enrol pop-up
  const [isManualDialogOpen, toggleManualDialogOpen] = useState(false);
  const [isManualDialogForCreate, toggleManualDialogForCreate] = useState(true);

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (vocaDBAutoCompleteText === "" || !touched) {
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
                id: undefined,
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
  }, [
    vocaDBAutoCompleteText,
    apolloClient,
    setVocaDBAutoCompleteOptions,
    touched,
  ]);

  return (
    <>
      {title && (
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
      )}
      <Grid container spacing={1}>
        <Grid size={12}>
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
                  id: undefined,
                  name: `Search for “${params.inputValue}”`,
                  sortOrder: params.inputValue,
                  vocaDBSuggestion: true,
                });
                v.push({
                  id: undefined,
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
            onChange={(event: unknown, newValue, reason: string) => {
              if (newValue === null) {
                setVocaDBAutoCompleteOptions([]);
                if (reason === "clear") {
                  setValue(fieldName, null);
                }
                return;
              }
              const newVal = newValue as ExtendedArtist;
              if (newVal.vocaDBSuggestion) {
                setImportDialogKeyword(newVal?.sortOrder ?? "");
                toggleImportDialogOpen(true);
                setVocaDBAutoCompleteOptions([]);
              } else if (newVal.manual) {
                setImportDialogKeyword(newVal?.sortOrder ?? "");
                toggleManualDialogOpen(true);
                toggleManualDialogForCreate(true);
                setVocaDBAutoCompleteOptions([]);
              } else {
                setValue(fieldName, newVal);
              }
            }}
            renderOption={(params, option: ExtendedArtist | null) => {
              let icon = (
                <MusicNoteIcon
                  sx={{ color: "text.secondary", marginRight: 2 }}
                />
              );
              if (option?.vocaDBSuggestion)
                icon = (
                  <SearchIcon
                    sx={{ color: "text.secondary", marginRight: 2 }}
                  />
                );
              else if (option?.manual)
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
                  {icon} {option?.name}
                </Stack>
              );
            }}
            getOptionLabel={(option) => {
              // Prevent ”Manually add ...” item from being rendered
              if (option === null || (option as ExtendedArtist).id === null)
                return "";
              return (option as ExtendedArtist).name ?? "";
            }}
            onFocus={() => setTouched(true)}
          />
        </Grid>
        {value && (
          <Grid size={12}>
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
                {(value?.id ?? -1) >= 0 && (
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

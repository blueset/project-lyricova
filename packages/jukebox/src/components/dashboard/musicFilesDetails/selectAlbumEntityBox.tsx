import { Avatar, Box, Grid, IconButton, TextField as MuiTextField, Typography } from "@material-ui/core";
import { FilterOptionsState } from "@material-ui/lab/useAutocomplete/useAutocomplete";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useCallback, useEffect } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import SearchIcon from "@material-ui/icons/Search";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import { makeStyles } from "@material-ui/core/styles";
import { AlbumFragments } from "../../../graphql/fragments";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import EditIcon from "@material-ui/icons/Edit";
import { Album } from "../../../models/Album";
import VocaDBSearchAlbumDialog from "./vocaDBSearchAlbumDialog";
import CreateAlbumEntityDialog from "./createAlbumEntityDialog";
import { useField, useForm } from "react-final-form";
import { Autocomplete } from "mui-rff";

export type ExtendedAlbum = Partial<Album> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query($text: String!) {
    searchAlbums(keywords: $text) {
      ...SelectAlbumEntry
    }
  }
  
  ${AlbumFragments.SelectAlbumEntry}
`;

const useStyles = makeStyles((theme) => ({
  icon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(2),
  },
  detailsBox: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  detailsThumbnail: {
    height: "3em",
    width: "3em",
    marginRight: theme.spacing(2),
  },
  textBox: {
    flexGrow: 1,
    flexBasis: 0,
  },
  chipsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  featLabel: {
    margin: theme.spacing(0, 1),
  },
}));

interface Props<T extends string> {
  fieldName: T;
  labelName: string;
  title?: string;
}

export default function SelectAlbumEntityBox<T extends string>({ fieldName, labelName, title }: Props<T>) {
  const styles = useStyles();

  const apolloClient = useApolloClient();
  const { input: { value } } = useField<ExtendedAlbum>(fieldName);
  const setValue = useForm().mutators.setValue;

  const [vocaDBAutoCompleteOptions, setVocaDBAutoCompleteOptions] = useNamedState<ExtendedAlbum[]>([], "vocaDBAutoCompleteOptions");
  const [vocaDBAutoCompleteText, setVocaDBAutoCompleteText] = useNamedState("", "vocaDBAutoCompleteText");

  const [importDialogKeyword, setImportDialogKeyword] = useNamedState("", "importDialogKeyword");

  // Confirm import pop-up
  const [isImportDialogOpen, toggleImportDialogOpen] = useNamedState(false, "importDialogOpen");

  // Confirm manual enrol pop-up
  const [isManualDialogOpen, toggleManualDialogOpen] = useNamedState(false, "manualDialogOpen");

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (vocaDBAutoCompleteText === "") {
      setVocaDBAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{ searchAlbums: Album[] }>({
        query: LOCAL_ARTIST_ENTITY_QUERY,
        variables: { text: vocaDBAutoCompleteText },
      });

      const vocaDBPromise = axios.get<string[]>(
        "https://vocadb.net/api/albums/names",
        {
          params: {
            query: vocaDBAutoCompleteText,
            nameMatchMode: "Auto",
          }
        }
      );
      if (active) {
        let result: ExtendedAlbum[] = [];

        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchAlbums) {
            result = result.concat(apolloResult.data?.searchAlbums);
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
            textFieldProps={{variant: "outlined", size: "small"}}
            filterOptions={(v: ExtendedAlbum[], params: FilterOptionsState<ExtendedAlbum>) => {
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
            onChange={(event: unknown, newValue: ExtendedAlbum | null, reason: string) => {
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
                setVocaDBAutoCompleteOptions([]);
              } else {
                setValue(fieldName, newValue);
              }
            }}
            renderOption={(option: ExtendedAlbum | null) => {
              let icon = <MusicNoteIcon className={styles.icon} />;
              if (option.vocaDBSuggestion) icon = <SearchIcon className={styles.icon} />;
              else if (option.manual) icon = <AddCircleIcon className={styles.icon} />;
              return (
                <Box display="flex" flexDirection="row" alignItems="center">
                  {icon} {option.name}
                </Box>
              );
            }}
            getOptionLabel={(option: ExtendedAlbum | null) => {
              // Prevent ”Manually add ...” item from being rendered
              if (option === null || option.id === null) return "";
              return option.name || "";
            }}
          />
        </Grid>
        {value && (
          <Grid item xs={12}>
            <div className={styles.detailsBox}>
              <div>
                <Avatar
                  src={value.coverUrl} variant="rounded"
                  className={styles.detailsThumbnail}
                >
                  <MusicNoteIcon />
                </Avatar>
              </div>
              <div className={styles.textBox}>
                <Typography>
                  {value.name}
                </Typography>
                <Typography color="textSecondary">
                  {value.sortOrder === value.name ? "" : value.sortOrder} #{value.id}
                </Typography>
              </div>
              <div>
                {value.id >= 0 && (
                  <IconButton href={`https://vocadb.net/Al/${value.id}`} target="_blank">
                    <OpenInNewIcon />
                  </IconButton>
                )}
                <IconButton>
                  <EditIcon />
                </IconButton>
              </div>
            </div>
          </Grid>
        )}
      </Grid>
      {isImportDialogOpen && <VocaDBSearchAlbumDialog
          isOpen={isImportDialogOpen}
          toggleOpen={toggleImportDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setAlbum={(v) => setValue(fieldName, v)}
      />}
      {isManualDialogOpen && <CreateAlbumEntityDialog
          isOpen={isManualDialogOpen}
          toggleOpen={toggleManualDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setAlbum={(v) => setValue(fieldName, v)}
      />}
    </>
  );
}
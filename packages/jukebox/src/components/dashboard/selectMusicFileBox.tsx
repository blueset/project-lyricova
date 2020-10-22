import { Avatar, Box, Grid, IconButton, TextField as MuiTextField, Typography } from "@material-ui/core";
import { FilterOptionsState } from "@material-ui/lab/useAutocomplete/useAutocomplete";

import { useCallback, useEffect } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import SearchIcon from "@material-ui/icons/Search";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import { makeStyles } from "@material-ui/core/styles";
import { useField, useForm } from "react-final-form";
import { Autocomplete } from "mui-rff";
import { MusicFile } from "../../models/MusicFile";
import { useNamedState } from "../../frontendUtils/hooks";
import { emit } from "cluster";

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query($text: String!) {
    searchMusicFiles(keywords: $text) {
      id
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      hasCover
    }
  }
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

export default function SelectMusicFileBox<T extends string>({ fieldName, labelName, title, }: Props<T>) {
  const styles = useStyles();

  const apolloClient = useApolloClient();
  const { input: { value } } = useField<MusicFile>(fieldName);
  const setValue = useForm().mutators.setValue;

  const [autoCompleteOptions, setAutoCompleteOptions] = useNamedState<MusicFile[]>([], "autoCompleteOptions");
  const [autoCompleteText, setAutoCompleteText] = useNamedState("", "autoCompleteText");

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (autoCompleteText === "") {
      setAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{ searchMusicFiles: MusicFile[] }>({
        query: LOCAL_ARTIST_ENTITY_QUERY,
        variables: { text: autoCompleteText },
      });

      if (active) {
        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchMusicFiles) {
            setAutoCompleteOptions(apolloResult.data?.searchMusicFiles);
          }
        } catch (e) { /* No-Op. */
        }
      }
    }, 200)();

    return () => {
      active = false;
    };
  }, [autoCompleteText, apolloClient, setAutoCompleteOptions, value]);

  return (
    <>
      {title && <Typography variant="h6" component="h3" gutterBottom>{title}</Typography>}
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Autocomplete
            name={fieldName}
            options={autoCompleteOptions}
            label={labelName}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            textFieldProps={{ variant: "outlined", size: "small" }}
            onInputChange={(event: unknown, newValue: string) => {
              setAutoCompleteText(newValue);
            }}
            onChange={(event: unknown, newValue: MusicFile | null) => {
              setValue(fieldName, newValue);
            }}
            renderOption={(option: MusicFile | null) => (
              <Box display="flex" flexDirection="row" alignItems="center">
                <Avatar src={option.hasCover ? `/api/files/${option.id}/cover` : null}
                        variant="rounded"
                        className={styles.icon}><MusicNoteIcon /></Avatar>
                <Box display="flex" flexDirection="column">
                  <Typography variant="body1">{option.trackName}</Typography>
                  <Typography variant="body2" color="textSecondary">{option.artistName ||
                  <em>Unknown artists</em>} / {option.albumName || <em>Unknown album</em>}</Typography>
                </Box>
              </Box>
            )}
            getOptionLabel={(option: MusicFile | null) => {
              return option.trackName || "";
            }}
          />
        </Grid>
      </Grid>
    </>
  );
}
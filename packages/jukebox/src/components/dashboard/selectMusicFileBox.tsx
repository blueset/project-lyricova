import { Avatar, Grid, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import _ from "lodash";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { useField, useForm } from "react-final-form";
import { Autocomplete } from "mui-rff";
import type { MusicFile } from "lyricova-common/models/MusicFile";
import { useNamedState } from "../../frontendUtils/hooks";
import type { DocumentNode } from "graphql";

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
` as DocumentNode;

interface Props<T extends string> {
  fieldName: T;
  labelName: string;
  title?: string;
}

export default function SelectMusicFileBox<T extends string>({
  fieldName,
  labelName,
  title,
}: Props<T>) {
  const apolloClient = useApolloClient();
  const {
    input: { value },
  } = useField<MusicFile>(fieldName);
  const setValue = useForm().mutators.setValue;

  const [autoCompleteOptions, setAutoCompleteOptions] = useNamedState<
    MusicFile[]
  >([], "autoCompleteOptions");
  const [autoCompleteText, setAutoCompleteText] = useNamedState(
    "",
    "autoCompleteText"
  );

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (autoCompleteText === "") {
      setAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{
        searchMusicFiles: MusicFile[];
      }>({
        query: LOCAL_ARTIST_ENTITY_QUERY,
        variables: { text: autoCompleteText },
      });

      if (active) {
        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchMusicFiles) {
            setAutoCompleteOptions(apolloResult.data?.searchMusicFiles);
          }
        } catch (e) {
          /* No-Op. */
        }
      }
    }, 200)();

    return () => {
      active = false;
    };
  }, [autoCompleteText, apolloClient, setAutoCompleteOptions, value]);

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
            renderOption={(params, option: MusicFile | null) => (
              <Stack
                component="li"
                {...params}
                direction="row"
                alignItems="center"
              >
                <Avatar
                  src={option.hasCover ? `/api/files/${option.id}/cover` : null}
                  variant="rounded"
                  sx={{ color: "text.secondary", marginRight: 2 }}
                >
                  <MusicNoteIcon />
                </Avatar>
                <Stack direction="column">
                  <Typography variant="body1">{option.trackName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {option.artistName || <em>Unknown artists</em>} /{" "}
                    {option.albumName || <em>Unknown album</em>}
                  </Typography>
                </Stack>
              </Stack>
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

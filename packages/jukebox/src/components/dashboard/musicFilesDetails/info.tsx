import {
  Avatar,
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  styled,
  TextField as MuiTextField,
  Tooltip,
} from "@mui/material";
import { gql, useApolloClient } from "@apollo/client";
import type { Song } from "lyricova-common/models/Song";
import type { Album } from "lyricova-common/models/Album";
import SelectSongEntityBox from "lyricova-common/components/selectSongEntityBox";
import TransliterationAdornment from "lyricova-common/components/TransliterationAdornment";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Field, Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import finalFormMutators from "lyricova-common/frontendUtils/finalFormMutators";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import type { DocumentNode } from "graphql";
import FileDownloadDoneIcon from "@mui/icons-material/FileDownloadDone";
import { AlbumFragments } from "lyricova-common/utils/fragments";
import { useNamedState } from "../../../hooks/useNamedState";

const UPDATE_MUSIC_FILE_INFO_MUTATION = gql`
  mutation ($id: Int!, $data: MusicFileInput!) {
    writeTagsToMusicFile(id: $id, data: $data) {
      trackName
    }
  }
` as DocumentNode;

const IMPORT_ALBUM_MUTATION = gql`
  mutation ($id: Int!) {
    enrolAlbumFromVocaDB(albumId: $id) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

const UpdateButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

interface FormProps {
  trackName: string;
  trackSortOrder: string;
  artistName: string;
  artistSortOrder: string;
  albumName: string;
  albumSortOrder: string;
  song?: Partial<Song>;
  albumId?: number;
}

interface Props extends FormProps {
  path: string;
  fileId: number;
  refresh: () => unknown | Promise<unknown>;
}

export default function InfoPanel({
  trackName,
  trackSortOrder,
  artistName,
  artistSortOrder,
  albumName,
  albumSortOrder,
  song,
  albumId,
  path,
  fileId,
  refresh,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const [isImporting, toggleImporting] = useNamedState(false, "isImporting");

  return (
    <Form<FormProps>
      mutators={{
        ...finalFormMutators,
      }}
      initialValues={{
        trackName,
        trackSortOrder,
        artistName,
        artistSortOrder,
        albumName,
        albumSortOrder,
        song,
        albumId,
      }}
      validate={makeValidate(
        yup.object({
          trackName: yup.string(),
          trackSortOrder: yup.string().when("trackName", {
            is: (v: string) => !!v,
            then: (schema) => schema.required(),
            otherwise: (schema) => schema.optional(),
          }),
          artistName: yup.string(),
          artistSortOrder: yup.string().when("artistName", {
            is: (v: string) => !!v,
            then: (schema) => schema.required(),
            otherwise: (schema) => schema.optional(),
          }),
          albumName: yup.string(),
          albumSortOrder: yup.string().when("albumName", {
            is: (v: string) => !!v,
            then: (schema) => schema.required(),
            otherwise: (schema) => schema.optional(),
          }),
          song: yup.object().nullable(),
          album: yup.number().nullable().integer(),
        })
      )}
      onSubmit={async (values) => {
        try {
          const result = await apolloClient.mutate<{
            writeTagsToMusicFile: { trackName: string };
          }>({
            mutation: UPDATE_MUSIC_FILE_INFO_MUTATION,
            variables: {
              id: fileId,
              data: {
                trackName: values.trackName,
                trackSortOrder: values.trackSortOrder,
                artistName: values.artistName,
                artistSortOrder: values.artistSortOrder,
                albumName: values.albumName,
                albumSortOrder: values.albumSortOrder,
                songId: values.song?.id,
                albumId: values.albumId,
              },
            },
          });
          if (result.data?.writeTagsToMusicFile?.trackName != null) {
            snackbar.enqueueSnackbar(
              `Music file “${path}” is successfully updated.`,
              {
                variant: "success",
              }
            );
            await refresh();
          }
        } catch (e) {
          console.error(`Error occurred while updating music file ${path}.`, e);
          snackbar.enqueueSnackbar(
            `Error occurred while updating music file ${path}. (${e})`,
            {
              variant: "error",
            }
          );
        }
      }}
      subscription={{
        touched: true,
        pristine: true,
      }}
    >
      {({ form, submitting, handleSubmit }) => {
        const setValue = form.mutators.setValue;

        const handleRefreshAlbum = async () => {
          const albumId = form.getState().values.albumId;
          if (!albumId) {
            snackbar.enqueueSnackbar("Please choose a album to import.", {
              variant: "error",
            });
            return;
          }

          toggleImporting(true);
          try {
            const result = await apolloClient.mutate<{
              enrolAlbumFromVocaDB: Partial<Album>;
            }>({
              mutation: IMPORT_ALBUM_MUTATION,
              variables: {
                id: albumId,
              },
            });

            if (result.data) {
              snackbar.enqueueSnackbar(
                `Album “${result.data.enrolAlbumFromVocaDB.name}” is successfully enrolled.`,
                {
                  variant: "success",
                }
              );
            }
            toggleImporting(false);
          } catch (e) {
            console.error(
              `Error occurred while importing album #${albumId}.`,
              e
            );
            snackbar.enqueueSnackbar(
              `Error occurred while importing album #${albumId}. (${e})`,
              {
                variant: "error",
              }
            );
            toggleImporting(false);
          }
        };

        return (
          <>
            <Grid container spacing={3}>
              <Grid size={12}>
                <MuiTextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  label="File path"
                  disabled
                  value={path}
                  slotProps={{
                    htmlInput: { readOnly: true },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="trackName"
                  type="text"
                  label="Track name"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="trackSortOrder"
                  type="text"
                  label="Track sort order"
                  InputProps={{
                    endAdornment: (
                      <TransliterationAdornment
                        sourceName="trackName"
                        destinationName="trackSortOrder"
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="artistName"
                  type="text"
                  label="Artist name"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="artistSortOrder"
                  type="text"
                  label="Artist sort order"
                  InputProps={{
                    endAdornment: (
                      <TransliterationAdornment
                        sourceName="artistName"
                        destinationName="artistSortOrder"
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="albumName"
                  type="text"
                  label="Album name"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  name="albumSortOrder"
                  type="text"
                  label="Album sort order"
                  InputProps={{
                    endAdornment: (
                      <TransliterationAdornment
                        sourceName="albumName"
                        destinationName="albumSortOrder"
                      />
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
            <SelectSongEntityBox
              fieldName="song"
              labelName="Linked song"
              title="Link to a song entity"
            />
            <Field<Partial<Song>> name="song" subscription={{ value: true }}>
              {({ input: { value } }) =>
                value &&
                value.id && (
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: "center" }}
                      >
                        <Select
                          type="text"
                          label="Album"
                          name="albumId"
                          formControlProps={{
                            margin: "dense",
                            variant: "outlined",
                            fullWidth: true,
                          }}
                          inputProps={{
                            name: "album",
                            id: "album",
                            renderValue: (v: number) => {
                              const album = value.albums.find(
                                (i) => i.id === v
                              );
                              if (album) return album.name;
                              return v;
                            },
                          }}
                        >
                          {[
                            // Workaround for mui-rff.Select to accept an array of elements.
                            <MenuItem value={null} key={null}>
                              <em>No album</em>
                            </MenuItem>,
                          ].concat(
                            value.albums?.map((v) => (
                              <MenuItem value={v.id} key={v.id}>
                                <Avatar
                                  src={v.coverUrl}
                                  variant="rounded"
                                  sx={{
                                    height: "2em",
                                    width: "2em",
                                    marginRight: 2,
                                  }}
                                >
                                  <MusicNoteIcon />
                                </Avatar>
                                {v.name}
                              </MenuItem>
                            )) ?? []
                          )}
                        </Select>
                        <Tooltip title="Import album info">
                          <IconButton
                            disabled={
                              !form.getState().values.albumId
                            }
                            loading={isImporting}
                            onClick={handleRefreshAlbum}
                          >
                            <FileDownloadDoneIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <UpdateButton
                        variant="outlined"
                        onClick={() => {
                          setValue("trackName", value.name);
                          setValue("trackSortOrder", value.sortOrder);
                        }}
                      >
                        Update track name
                      </UpdateButton>
                      <UpdateButton
                        variant="outlined"
                        onClick={() => {
                          if (value.artists) {
                            let artistName = "",
                              artistSortOrder = "";

                            const producers = value.artists.filter(
                              (v) =>
                                v.ArtistOfSong.categories.indexOf("Producer") >=
                                  0 && !v.ArtistOfSong.isSupport
                            );
                            artistName += producers
                              .map((v) => v.ArtistOfSong.customName || v.name)
                              .join(", ");
                            artistSortOrder += producers
                              .map(
                                (v) => v.ArtistOfSong.customName || v.sortOrder
                              )
                              .join(", ");

                            const vocalists = value.artists.filter(
                              (v) =>
                                v.ArtistOfSong.categories.indexOf("Vocalist") >=
                                  0 && !v.ArtistOfSong.isSupport
                            );
                            if (vocalists.length > 0) {
                              artistName +=
                                " feat. " +
                                vocalists
                                  .map(
                                    (v) => v.ArtistOfSong.customName || v.name
                                  )
                                  .join(", ");
                              artistSortOrder +=
                                " feat. " +
                                vocalists
                                  .map(
                                    (v) =>
                                      v.ArtistOfSong.customName || v.sortOrder
                                  )
                                  .join(", ");
                            }

                            setValue("artistName", artistName);
                            setValue("artistSortOrder", artistSortOrder);
                          }
                        }}
                      >
                        Update artist name
                      </UpdateButton>
                      <Field name="albumId">
                        {({ input: { value: albumId } }) => (
                          <UpdateButton
                            variant="outlined"
                            disabled={albumId == null || albumId === ""}
                            onClick={() => {
                              const album = value.albums.find(
                                (i) => i.id === albumId
                              );
                              setValue("albumName", album.name);
                              setValue("albumSortOrder", album.sortOrder);
                            }}
                          >
                            Update album name
                          </UpdateButton>
                        )}
                      </Field>
                    </Grid>
                  </Grid>
                )
              }
            </Field>
            <Box sx={{ marginTop: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                loading={submitting}
                loadingPosition="start"
                onClick={handleSubmit}
              >
                Save
              </Button>
            </Box>
          </>
        );
      }}
    </Form>
  );
}

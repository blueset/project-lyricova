import { Album } from "../models/Album";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { Fragment, useCallback, useEffect, useState } from "react";
import { gql, useApolloClient } from "@apollo/client";
import TransliterationAdornment from "./TransliterationAdornment";
import { useSnackbar } from "notistack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SortIcon from "@mui/icons-material/Sort";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SelectSongEntityBox from "./selectSongEntityBox";
import TrackNameAdornment from "./TrackNameAdornment";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import _ from "lodash";
import * as yup from "yup";
import { AlbumFragments } from "../utils/fragments";
import VideoThumbnailAdornment from "./VideoThumbnailAdornment";
import { Artist } from "../models/Artist";
import { Field, Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import finalFormMutators from "../frontendUtils/finalFormMutators";
import arrayMutators from "final-form-arrays";
import { FieldArray } from "react-final-form-arrays";
import AvatarField from "./AvatarField";
import { Song } from "../models/Song";
import type { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { DocumentNode } from "graphql";
import StringSchema from "yup/lib/string";
import ArraySchema from "yup/lib/array";
import React from "react";

const NEW_ALBUM_MUTATION = gql`
  mutation ($data: AlbumInput!) {
    newAlbum(data: $data) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

const UPDATE_ALBUM_MUTATION = gql`
  mutation ($id: Int!, $data: AlbumInput!) {
    updateAlbum(id: $id, data: $data) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

const FULL_ALBUM_QUERY = gql`
  query ($id: Int!) {
    album(id: $id) {
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
` as DocumentNode;

interface RoleFieldProps {
  name: string;
  label: string;
}

function RoleField<T extends string>({ name, label }: RoleFieldProps) {
  return (
    <Select
      type="text"
      label={label}
      name={name}
      multiple
      formControlProps={{
        margin: "dense",
        variant: "outlined",
        fullWidth: true,
        sx: { mt: 0 },
      }}
      inputProps={{ name: name, id: name }}
    >
      <MenuItem value="Default">Default</MenuItem>
      <MenuItem value="Animator">Animator</MenuItem>
      <MenuItem value="Arranger">Arranger</MenuItem>
      <MenuItem value="Composer">Composer</MenuItem>
      <MenuItem value="Distributor">Distributor</MenuItem>
      <MenuItem value="Illustrator">Illustrator</MenuItem>
      <MenuItem value="Instrumentalist">Instrumentalist</MenuItem>
      <MenuItem value="Lyricist">Lyricist</MenuItem>
      <MenuItem value="Mastering">Mastering</MenuItem>
      <MenuItem value="Publisher">Publisher</MenuItem>
      <MenuItem value="Vocalist">Vocalist</MenuItem>
      <MenuItem value="VoiceManipulator">Voice Manipulator</MenuItem>
      <MenuItem value="Other">Other</MenuItem>
      <MenuItem value="Mixer">Mixer</MenuItem>
      <MenuItem value="Chorus">Chorus</MenuItem>
      <MenuItem value="Encoder">Encoder</MenuItem>
      <MenuItem value="VocalDataProvider">Vocal Data Provider</MenuItem>
    </Select>
  );
}

interface FormValues {
  name: string;
  sortOrder: string;
  coverUrl: string;
  originalSong?: Song;
  artists: {
    artist: Partial<Artist>;
    roles: VDBArtistRoleType[];
    effectiveRoles: VDBArtistRoleType[];
    categories: VDBArtistCategoryType;
  }[];
  songs: {
    song: Partial<Song>;
    trackNumber: number | null;
    diskNumber: number | null;
    name?: string;
  }[];
}

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setAlbum: (value: Partial<Album>) => void;
  albumToEdit?: Partial<Album>;
}

export default function AlbumEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setAlbum,
  create,
  albumToEdit,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const buildInitialValues: FormValues =
    create || !albumToEdit
      ? {
          name: keyword,
          sortOrder: "",
          coverUrl: "",
          songs: [],
          artists: [],
        }
      : {
          name: albumToEdit.name!,
          sortOrder: albumToEdit.sortOrder!,
          coverUrl: albumToEdit.coverUrl!,
          artists:
            albumToEdit.artists?.map((v) => ({
              ...v.ArtistOfAlbum,
              artist: v,
            })) ?? [],
          songs:
            albumToEdit.songs?.map((v) => ({
              ...v.SongInAlbum,
              song: v,
            })) ?? [],
        };

  const [initialValues, setInitialValues] = useState(buildInitialValues);
  const albumId = albumToEdit?.id ?? null;

  useEffect(() => {
    if (albumToEdit) {
      setInitialValues({
        name: albumToEdit.name!,
        sortOrder: albumToEdit.sortOrder!,
        coverUrl: albumToEdit.coverUrl!,
        artists:
          albumToEdit.artists?.map((v) => ({
            ...v.ArtistOfAlbum,
            artist: v,
          })) ?? [],
        songs:
          albumToEdit.songs?.map((v) => ({
            ...v.SongInAlbum,
            song: v,
          })) ?? [],
      });
    }
  }, [albumToEdit, setInitialValues]);

  const refresh = useCallback(async () => {
    try {
      const result = await apolloClient.query<{ album: Album }>({
        query: FULL_ALBUM_QUERY,
        variables: {
          id: albumId,
        },
      });
      apolloClient.cache.evict({ id: `Album:${albumId}` });
      if (result.data.album) {
        const album = result.data.album;
        setInitialValues({
          name: album.name,
          sortOrder: album.sortOrder,
          coverUrl: album.coverUrl!,
          artists:
            album.artists?.map((v) => ({
              ...v.ArtistOfAlbum,
              artist: v,
            })) ?? [],
          songs:
            album.songs?.map((v) => ({
              ...v.SongInAlbum,
              song: v,
            })) ?? [],
        });

        snackbar.enqueueSnackbar(`Successfully refreshing album #${albumId}.`, {
          variant: "success",
        });
      }
    } catch (e) {
      console.error(`Error occurred refreshing album #${albumId}.`, e);
      snackbar.enqueueSnackbar(
        `Error occurred refreshing album #${albumId}. (${e})`,
        {
          variant: "error",
        }
      );
    }
  }, [albumId, apolloClient, setInitialValues, snackbar]);
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
      scroll="paper"
    >
      <Form<FormValues>
        initialValues={initialValues}
        mutators={{
          ...finalFormMutators,
          ...arrayMutators,
        }}
        subscription={{}}
        validate={makeValidate<FormValues>(
          yup
            .object()
            .shape({
              name: yup.string().required(),
              sortOrder: yup.string().required(),
              coverUrl: yup.string().optional().url(),
              songs: yup.array(
                yup.object({
                  song: yup.object().typeError("Song entity must be selected."),
                  diskNumber: yup.number().optional().positive().integer(),
                  trackNumber: yup.number().optional().positive().integer(),
                  name: yup.string().optional(),
                })
              ),
              artists: yup.array(
                yup.object({}).shape({
                  artist: yup
                    .object()
                    .typeError("Artist entity must be selected."),
                  categories: yup
                    .string()
                    .required() as StringSchema<VDBArtistCategoryType>,
                  roles: yup
                    .array(yup.string() as StringSchema<VDBArtistRoleType>)
                    .required() as ArraySchema<StringSchema<VDBArtistRoleType>>,
                  effectiveRoles: yup
                    .array(yup.string() as StringSchema<VDBArtistRoleType>)
                    .required() as ArraySchema<StringSchema<VDBArtistRoleType>>,
                })
              ),
            })
            .required()
        )}
        onSubmit={async (values) => {
          try {
            const data = {
              name: values.name,
              sortOrder: values.sortOrder,
              coverUrl: values.coverUrl,
              songsInAlbum: values.songs.map((v) => ({
                name: v.name,
                diskNumber:
                  v.diskNumber && parseInt(v.diskNumber as unknown as string),
                trackNumber:
                  v.trackNumber && parseInt(v.trackNumber as unknown as string),
                songId: v.song.id,
              })),
              artistsOfAlbum: values.artists.map((v) => ({
                categories: v.categories,
                roles: v.roles,
                effectiveRoles: v.effectiveRoles,
                artistId: v.artist.id,
              })),
            };

            if (create) {
              const result = await apolloClient.mutate<{
                newAlbum: Partial<Album>;
              }>({
                mutation: NEW_ALBUM_MUTATION,
                variables: { data },
              });

              if (result.data) {
                setAlbum(result.data.newAlbum);
                snackbar.enqueueSnackbar(
                  `Album “${result.data.newAlbum.name}” is successfully created.`,
                  {
                    variant: "success",
                  }
                );
                handleClose();
              }
            } else {
              const result = await apolloClient.mutate<{
                updateAlbum: Partial<Album>;
              }>({
                mutation: UPDATE_ALBUM_MUTATION,
                variables: { id: albumId, data },
              });

              if (result.data) {
                setAlbum(result.data.updateAlbum);
                snackbar.enqueueSnackbar(
                  `Album “${result.data.updateAlbum.name}” is successfully updated.`,
                  {
                    variant: "success",
                  }
                );
                apolloClient.cache.evict({ id: `Album:${albumId}` });
                handleClose();
              }
            }
          } catch (e) {
            console.error(
              `Error occurred while ${
                create ? "creating" : "updating"
              } artist #${values.name}.`,
              e
            );
            snackbar.enqueueSnackbar(
              `Error occurred while ${create ? "creating" : "updating"} album ${
                values.name
              }. (${e})`,
              {
                variant: "error",
              }
            );
          }
        }}
      >
        {({ form, submitting, handleSubmit }) => (
          <>
            <DialogTitle id="form-dialog-title">
              {create
                ? "Create new album entity"
                : `Edit album entity #${albumId}`}
              {!create && (
                <IconButton
                  sx={{ position: "absolute", top: 12, right: 12 }}
                  onClick={refresh}
                >
                  <AutorenewIcon />
                </IconButton>
              )}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1}>
                <Grid xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    name="name"
                    type="text"
                    label="Album name"
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    InputProps={{
                      endAdornment: (
                        <TransliterationAdornment
                          sourceName="name"
                          destinationName="sortOrder"
                        />
                      ),
                    }}
                    name="sortOrder"
                    type="text"
                    label="Sort order"
                  />
                </Grid>
                <Grid xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <AvatarField
                      name="coverUrl"
                      sx={{
                        marginRight: 2,
                        height: "3em",
                        width: "3em",
                      }}
                    />
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <VideoThumbnailAdornment name="coverUrl" />
                        ),
                      }}
                      name="coverUrl"
                      type="text"
                      label="Cover URL"
                    />
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="h6" component="h3" sx={{ mt: 1, mb: 1 }}>
                Artists
              </Typography>
              <FieldArray name="artists" subscription={{ error: true }}>
                {({ fields }) => (
                  <>
                    {fields.map((name, idx) => (
                      <Fragment key={name}>
                        <SelectArtistEntityBox
                          fieldName={`${name}.artist`}
                          labelName="Artist"
                        />
                        <Stack direction="row" spacing={1}>
                          <RoleField name={`${name}.roles`} label="Roles" />
                          <RoleField
                            name={`${name}.effectiveRoles`}
                            label="Effective roles"
                          />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            type="text"
                            label="Category"
                            name={`${name}.categories`}
                            variant="outlined"
                            margin="dense"
                            select
                            fullWidth
                            inputProps={{
                              name: `${name}.categories`,
                              id: `${name}.categories`,
                            }}
                          >
                            <MenuItem value="Nothing">Nothing</MenuItem>
                            <MenuItem value="Vocalist">Vocalist</MenuItem>
                            <MenuItem value="Producer">Producer</MenuItem>
                            <MenuItem value="Animator">Animator</MenuItem>
                            <MenuItem value="Label">Label</MenuItem>
                            <MenuItem value="Circle">Circle</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                            <MenuItem value="Band">Band</MenuItem>
                            <MenuItem value="Illustrator">Illustrator</MenuItem>
                            <MenuItem value="Subject">Subject</MenuItem>
                          </TextField>
                          <IconButton
                            color="primary"
                            aria-label="Delete artist item"
                            onClick={() => fields.remove(idx)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                        <Divider sx={{ mt: 1, mb: 1 }} />
                      </Fragment>
                    ))}
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddIcon />}
                      onClick={() =>
                        fields.push({
                          artist: null,
                          roles: ["Default"],
                          effectiveRoles: ["Default"],
                          categories: "Nothing",
                        })
                      }
                    >
                      Add artist
                    </Button>
                  </>
                )}
              </FieldArray>
              <Typography variant="h6" component="h3" sx={{ mt: 1, mb: 1 }}>
                Tracks
              </Typography>
              <FieldArray name="songs" subscription={{}}>
                {({ fields }) => (
                  <>
                    {fields.map((v, idx) => (
                      <>
                        <SelectSongEntityBox
                          fieldName={`songs.${idx}.song`}
                          labelName="Track"
                        />
                        <Stack direction="row" spacing={1}>
                          <TextField
                            sx={{
                              mt: 0,
                              width: "10em",
                              "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                {
                                  appearance: "none",
                                  margin: 0,
                                },
                              "input[type=number]": {
                                appearance: "textfield",
                              },
                            }}
                            variant="outlined"
                            margin="dense"
                            name={`songs.${idx}.diskNumber`}
                            type="number"
                            label="#Disk"
                          />
                          <TextField
                            sx={{
                              width: "10em",
                              "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                {
                                  appearance: "none",
                                  margin: 0,
                                },
                              "input[type=number]": {
                                appearance: "textfield",
                              },
                            }}
                            variant="outlined"
                            margin="dense"
                            name={`songs.${idx}.trackNumber`}
                            type="number"
                            label="#Track"
                          />
                          <TextField
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            required
                            name={`songs.${idx}.name`}
                            type="text"
                            label="Track name"
                            InputProps={{
                              endAdornment: (
                                <TrackNameAdornment
                                  sourceName="name"
                                  destinationName={`songs.${idx}.name`}
                                />
                              ),
                            }}
                          />
                          <IconButton
                            color="primary"
                            aria-label="Delete album item"
                            onClick={() => fields.remove(idx)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                        <Divider sx={{ mt: 1, mb: 1 }} />
                      </>
                    ))}
                    <Stack direction="row" spacing={1}>
                      <Field name="songs">
                        {({ input: { value } }) => (
                          <Button
                            variant="outlined"
                            startIcon={<SortIcon />}
                            onClick={() =>
                              form.mutators.setValue(
                                "songs",
                                _.sortBy(value, ["diskNumber", "trackNumber"])
                              )
                            }
                          >
                            Sort
                          </Button>
                        )}
                      </Field>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() =>
                          fields.push({
                            song: null,
                            trackNumber: null,
                            diskNumber: null,
                            name: "",
                          })
                        }
                      >
                        Add Song
                      </Button>
                    </Stack>
                  </>
                )}
              </FieldArray>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                disabled={submitting}
                onClick={handleSubmit}
                color="primary"
              >
                {create ? "Create" : "Update"}
              </Button>
            </DialogActions>
          </>
        )}
      </Form>
    </Dialog>
  );
}

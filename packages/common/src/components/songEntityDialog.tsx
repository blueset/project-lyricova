import { Song } from "../models/Song";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { Fragment, useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import TransliterationAdornment from "./TransliterationAdornment";
import { useSnackbar } from "notistack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AlbumIcon from "@mui/icons-material/Album";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import SelectSongEntityBox from "./selectSongEntityBox";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import SelectAlbumEntityBox from "./selectAlbumEntityBox";
import TrackNameAdornment from "./TrackNameAdornment";
import * as yup from "yup";
import { SongFragments } from "../utils/fragments";
import { Artist } from "../models/Artist";
import type { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { Album } from "../models/Album";
import VideoThumbnailAdornment from "./VideoThumbnailAdornment";
import { Field, Form } from "react-final-form";
import {
  Checkboxes,
  makeValidate,
  Select,
  showErrorOnChange,
  TextField,
} from "mui-rff";
import finalFormMutators from "../frontendUtils/finalFormMutators";
import arrayMutators from "final-form-arrays";
import { FieldArray } from "react-final-form-arrays";
import AvatarField from "./AvatarField";
import StringSchema from "yup/lib/string";
import { DocumentNode } from "graphql";
import React from "react";

const NEW_SONG_MUTATION = gql`
  mutation ($data: SongInput!) {
    newSong(data: $data) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
` as DocumentNode;

const UPDATE_SONG_MUTATION = gql`
  mutation ($id: Int!, $data: SongInput!) {
    updateSong(id: $id, data: $data) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
` as DocumentNode;

const dividerRowSx = {
  marginTop: 1,
  marginBottom: 1,
};

const NumberField = styled(TextField)({
  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
    "-webkit-appearance": "none",
    margin: 0,
  },
  "input[type=number]": {
    "-moz-appearance": "textfield",
  },
});

interface FormValues {
  name: string;
  sortOrder: string;
  coverUrl: string;
  originalSong?: Partial<Song>;
  artists: {
    artist: Partial<Artist>;
    artistRoles: VDBArtistRoleType[];
    categories: VDBArtistCategoryType[];
    customName?: string;
    isSupport: boolean;
  }[];
  albums: {
    album: Partial<Album>;
    trackNumber: number | null;
    diskNumber: number | null;
    name?: string;
  }[];
}

const SquareButton = styled(Button)`
  width: 1em;
  min-width: 1em;
  margin-left: 8px;
`;

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword?: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
  songToEdit?: Partial<Song>;
}

export default function SongEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setSong,
  songToEdit,
  create,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const initialValues: FormValues =
    create || !songToEdit
      ? {
          name: keyword ?? "",
          sortOrder: "",
          coverUrl: "",
          originalSong: undefined,
          artists: [],
          albums: [],
        }
      : {
          name: songToEdit.name!,
          sortOrder: songToEdit.sortOrder!,
          coverUrl: songToEdit.coverUrl!,
          originalSong: songToEdit.original ?? undefined,
          artists:
            songToEdit.artists?.map((v) => ({
              ...v.ArtistOfSong,
              artist: v,
            })) ?? [],
          albums:
            songToEdit.albums?.map((v) => ({
              ...v.SongInAlbum,
              album: v,
            })) ?? [],
        };

  const songId = songToEdit?.id ?? null;

  const schema = yup
    .object({})
    .shape({
      name: yup.string().required(),
      sortOrder: yup.string().required(),
      coverUrl: yup.string().nullable().url(),
      originalSong: yup.object().nullable(),
      artists: yup.array(
        yup.object({
          artist: yup.object().typeError("Artist entity must be selected."),
          artistRoles: yup
            .array(yup.string() as StringSchema<VDBArtistRoleType>)
            .required(),
          categories: yup
            .array(yup.string() as StringSchema<VDBArtistCategoryType>)
            .required(),
          customName: yup.string().nullable(),
          isSupport: yup.boolean().required(),
        })
      ),
      albums: yup.array(
        yup.object({
          album: yup.object().typeError("Album entity must be selected."),
          diskNumber: yup.number().optional().nullable().positive().integer(),
          trackNumber: yup.number().optional().nullable().positive().integer(),
          name: yup.string().required(),
        })
      ),
    })
    .required();

  const validate = makeValidate<FormValues>(schema);

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
        validate={validate}
        onSubmit={async (values) => {
          try {
            const data = {
              name: values.name,
              sortOrder: values.sortOrder,
              coverUrl: values.coverUrl || "",
              originalId: values.originalSong?.id ?? null,
              songInAlbums: values.albums.map((v) => ({
                name: v.name,
                diskNumber:
                  v.diskNumber && parseInt(v.diskNumber as unknown as string),
                trackNumber:
                  v.trackNumber && parseInt(v.trackNumber as unknown as string),
                albumId: v.album.id,
              })),
              artistsOfSong: values.artists.map((v) => ({
                categories: v.categories,
                artistRoles: v.artistRoles,
                isSupport: v.isSupport,
                customName: v.customName || "",
                artistId: v.artist.id,
              })),
            };

            if (create) {
              const result = await apolloClient.mutate<{
                newSong: Partial<Song>;
              }>({
                mutation: NEW_SONG_MUTATION,
                variables: {
                  data,
                },
              });

              if (result.data) {
                setSong(result.data.newSong);
                snackbar.enqueueSnackbar(
                  `Song “${result.data.newSong.name}” is successfully created.`,
                  {
                    variant: "success",
                  }
                );
                handleClose();
              }
            } else {
              const result = await apolloClient.mutate<{
                updateSong: Partial<Song>;
              }>({
                mutation: UPDATE_SONG_MUTATION,
                variables: {
                  id: songId,
                  data,
                },
              });

              if (result.data) {
                setSong(result.data.updateSong);
                snackbar.enqueueSnackbar(
                  `Song “${result.data.updateSong.name}” is successfully updated.`,
                  {
                    variant: "success",
                  }
                );
                apolloClient.cache.evict({ id: `Song:${songId}` });
                handleClose();
              }
            }
          } catch (e) {
            console.error(
              `Error occurred while ${create ? "creating" : "updating"} song ${
                values?.name
              }.`,
              e
            );
            snackbar.enqueueSnackbar(
              `Error occurred while ${create ? "creating" : "updating"} song ${
                values?.name
              }. (${e})`,
              {
                variant: "error",
              }
            );
          }
        }}
      >
        {({ form, values, submitting, handleSubmit }) => (
          <>
            <DialogTitle id="form-dialog-title">
              {create
                ? "Create new song entity"
                : `Edit song entity #${songId}`}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    name="name"
                    type="text"
                    label="Track name"
                  />
                </Grid>
                <Grid item xs={12}>
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
                <Grid item xs={12}>
                  <Stack flexDirection="row" alignItems="center">
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
                  </Stack>
                </Grid>
              </Grid>
              <SelectSongEntityBox
                fieldName="originalSong"
                labelName="Original song"
              />
              <Typography sx={dividerRowSx} variant="h6" component="h3">
                Artists
              </Typography>
              <FieldArray
                name="artists"
                subscription={{
                  error: true,
                  touched: true,
                  modified: true,
                  dirtySinceLastSubmit: true,
                  submitError: true,
                }}
              >
                {({ fields, meta }) => (
                  <>
                    {fields.map((name, idx) => (
                      <Fragment key={name}>
                        <SelectArtistEntityBox
                          fieldName={`${name}.artist`}
                          labelName="Artist"
                        />
                        <Stack flexDirection="row" alignItems="center">
                          <Select
                            type="text"
                            label="Roles"
                            name={`${name}.artistRoles`}
                            multiple
                            sx={{ marginRight: 1 }}
                            formControlProps={{
                              margin: "dense",
                              variant: "outlined",
                              fullWidth: true,
                            }}
                            inputProps={{
                              name: `${name}.artistRoles`,
                              id: `${name}.artistRoles`,
                            }}
                          >
                            <MenuItem value="Default">Default</MenuItem>
                            <MenuItem value="Composer">Composer</MenuItem>
                            <MenuItem value="Lyricist">Lyricist</MenuItem>
                            <MenuItem value="Arranger">Arranger</MenuItem>
                            <MenuItem value="Vocalist">Vocalist</MenuItem>
                            <MenuItem value="Animator">Animator</MenuItem>
                            <MenuItem value="Distributor">Distributor</MenuItem>
                            <MenuItem value="Illustrator">Illustrator</MenuItem>
                            <MenuItem value="Instrumentalist">
                              Instrumentalist
                            </MenuItem>
                            <MenuItem value="Mastering">Mastering</MenuItem>
                            <MenuItem value="Publisher">Publisher</MenuItem>
                            <MenuItem value="VoiceManipulator">
                              Voice Manipulator
                            </MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                            <MenuItem value="Mixer">Mixer</MenuItem>
                            <MenuItem value="Chorus">Chorus</MenuItem>
                            <MenuItem value="Encoder">Encoder</MenuItem>
                            <MenuItem value="VocalDataProvider">
                              Vocal Data Provider
                            </MenuItem>
                          </Select>
                          <Select
                            type="text"
                            label="Categories"
                            name={`${name}.categories`}
                            multiple
                            formControlProps={{
                              margin: "dense",
                              variant: "outlined",
                              fullWidth: true,
                            }}
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
                          </Select>
                          <Field name={`${name}`}>
                            {({ input: { value } }) =>
                              value.artist?.type === "Producer" ? (
                                <SquareButton
                                  variant="outlined"
                                  size="large"
                                  onClick={() => {
                                    form.mutators.setValue(
                                      `${name}.artistRoles`,
                                      ["Composer", "Lyricist"]
                                    );
                                    form.mutators.setValue(
                                      `${name}.categories`,
                                      ["Producer"]
                                    );
                                  }}
                                >
                                  P
                                </SquareButton>
                              ) : value.artist?.type === "Vocaloid" ||
                                value.artist?.type === "UTAU" ||
                                value.artist?.type === "CeVIO" ||
                                value.artist?.type ===
                                  "OtherVoiceSynthesizer" ||
                                value.artist?.type === "OtherVocalist" ||
                                value.artist?.type === "Utaite" ||
                                value.artist?.type === "Vocalist" ||
                                value.artist?.type === "CoverArtist" ||
                                value.artist?.type === "SynthesizerV" ||
                                value.artist?.type === "NEUTRINO" ||
                                value.artist?.type === "VoiSona" ||
                                value.artist?.type === "NewType" ||
                                value.artist?.type === "Voiceroid" ? (
                                <SquareButton
                                  variant="outlined"
                                  size="large"
                                  onClick={() => {
                                    form.mutators.setValue(
                                      `${name}.artistRoles`,
                                      ["Vocalist"]
                                    );
                                    form.mutators.setValue(
                                      `${name}.categories`,
                                      ["Vocalist"]
                                    );
                                  }}
                                >
                                  V
                                </SquareButton>
                              ) : null
                            }
                          </Field>
                        </Stack>
                        <Stack flexDirection="row" alignItems="center">
                          <Checkboxes
                            sx={{ marginRight: 1 }}
                            indeterminate={false}
                            data={{ label: "Support", value: true }}
                            formControlProps={{
                              sx: {
                                minWidth: "auto",
                                marginRight: 0,
                              },
                            }}
                            name={`${name}.isSupport`}
                          />
                          <TextField
                            sx={{ marginRight: 1 }}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            name={`${name}.customName`}
                            type="text"
                            label="Custom name"
                          />
                          <IconButton
                            color="primary"
                            aria-label="Delete artist item"
                            onClick={() => fields.remove(idx)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                        <Divider sx={dividerRowSx} />
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
                          artistRoles: ["Default"],
                          categories: ["Nothing"],
                          customName: "",
                          isSupport: false,
                        })
                      }
                    >
                      Add artist
                    </Button>
                    {showErrorOnChange({ meta }) ? (
                      <FormHelperText error>
                        {meta.submitError ?? meta.error?.[0]}
                      </FormHelperText>
                    ) : (
                      false
                    )}
                  </>
                )}
              </FieldArray>
              <Typography variant="h6" component="h3" sx={dividerRowSx}>
                Albums
              </Typography>
              <FieldArray name="albums" subscription={{}}>
                {({ fields }) => (
                  <>
                    {fields.map((name, idx) => (
                      <Fragment key={name}>
                        <Field
                          name={`${name}.album`}
                          subscription={{
                            value: true,
                            touched: true,
                            error: true,
                          }}
                        >
                          {() => (
                            <SelectAlbumEntityBox
                              fieldName={`${name}.album`}
                              labelName="Album"
                            />
                          )}
                        </Field>
                        <Stack flexDirection="row" alignItems="center" gap={1}>
                          <NumberField
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AlbumIcon />
                                </InputAdornment>
                              ),
                            }}
                            name={`${name}.diskNumber`}
                            type="number"
                            label="Disk number"
                          />
                          <NumberField
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MusicNoteIcon />
                                </InputAdornment>
                              ),
                            }}
                            name={`${name}.trackNumber`}
                            type="number"
                            label="Track number"
                          />
                        </Stack>
                        <Stack flexDirection="row" alignItems="center">
                          <TextField
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            required
                            name={`${name}.name`}
                            type="text"
                            label="Track name"
                            InputProps={{
                              endAdornment: (
                                <TrackNameAdornment
                                  sourceName="name"
                                  destinationName={`${name}.name`}
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
                        <Divider sx={dividerRowSx} />
                      </Fragment>
                    ))}
                    <Field name="name" subscription={{ value: true }}>
                      {({ input: { value } }) => (
                        <Button
                          fullWidth
                          variant="outlined"
                          color="secondary"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            console.log(values);
                            fields.push({
                              album: null,
                              trackNumber: null,
                              diskNumber: null,
                              name: value ?? "",
                            });
                          }}
                        >
                          Add Album
                        </Button>
                      )}
                    </Field>
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

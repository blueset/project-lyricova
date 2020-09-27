import { Song } from "../../../models/Song";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Typography
} from "@material-ui/core";
import { Fragment, useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { FastField, Field, FieldArray, Form, Formik } from "formik";
import { Checkbox, Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import AlbumIcon from "@material-ui/icons/Album";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import SelectSongEntityBox from "./selectSongEntityBox";
import { makeStyles } from "@material-ui/core/styles";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import SelectAlbumEntityBox from "./selectAlbumEntityBox";
import TrackNameAdornment from "../TrackNameAdornment";
import * as yup from "yup";
import { SongFragments } from "../../../graphql/fragments";
import { Artist } from "../../../models/Artist";
import { VDBArtistCategoryType, VDBArtistRoleType } from "../../../types/vocadb";
import { Album } from "../../../models/Album";
import VideoThumbnailAdornment from "../VideoThumbnailAdornment";
import { ArtistOfSong } from "../../../models/ArtistOfSong";

const NEW_SONG_MUTATION = gql`
  mutation($data: SongInput!) {
    newSong(data: $data) {
      ...SelectSongEntry
    }
  }
  
  ${SongFragments.SelectSongEntry}
`;

const UPDATE_SONG_MUTATION = gql`
  mutation($id: Int!, $data: SongInput!) {
    updateSong(id: $id, data: $data) {
      ...SelectSongEntry
    }
  }
  
  ${SongFragments.SelectSongEntry}
`;

const useStyles = makeStyles((theme) => ({
  artistRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    "& > *": {
      marginRight: theme.spacing(1),
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
  mainPictureRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  mainPictureThumbnail: {
    marginRight: theme.spacing(2),
    height: "3em",
    width: "3em",
  },
  numberField: {
    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
      "-webkit-appearance": "none",
      margin: 0,
    },
    "input[type=number]": {
      "-moz-appearance": "textfield",
    },
  },
  divider: {
    margin: theme.spacing(1, 0),
  }
}));

interface FormValues {
  id: number;
  name: string;
  sortOrder: string;
  coverUrl: string;
  originalSong?: Song;
  artists: {
    artist: Partial<Artist>;
    artistRoles: VDBArtistRoleType[];
    categories: VDBArtistCategoryType[];
    customName?: string;
    isSupport: boolean;
  }[];
  albums: {
    album: Partial<Album>;
    trackNumber?: number;
    diskNumber?: number;
    name: string;
  }[];
}

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword?: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
  songToEdit?: Partial<Song>;
}

export default function SongEntityDialog({ isOpen, toggleOpen, keyword, setKeyword, setSong, songToEdit, create }: Props) {

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const styles = useStyles();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const initialValues: Omit<FormValues, "id"> = (create || !songToEdit) ? {
    name: keyword ?? "",
    sortOrder: "",
    coverUrl: "",
    originalSong: null,
    artists: [],
    albums: [],
  } : {
    name: songToEdit.name,
    sortOrder: songToEdit.sortOrder,
    coverUrl: songToEdit.coverUrl,
    originalSong: songToEdit.original,
    artists: songToEdit.artists.map(v => ({
      ...v.ArtistOfSong,
      artist: v,
    })),
    albums: songToEdit.albums.map(v => ({
      ...v.SongInAlbum,
      album: v,
    })),
  };

  const songId = songToEdit?.id ?? null;

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title" scroll="paper">
      <Formik
        initialValues={initialValues}
        validationSchema={yup.object({
          name: yup.string().required(),
          sortOrder: yup.string().required(),
          coverUrl: yup.string().url(),
          originalSong: yup.object().nullable(),
          artists: yup.array(yup.object({
            artist: yup.object().typeError("Artist entity must be selected."),
            artistRoles: yup.array(yup.string()).required(),
            categories: yup.array(yup.string()).required(),
            customName: yup.string().nullable(),
            isSupport: yup.boolean().required(),
          })).required("At least one artist is required."),
          albums: yup.array(yup.object({
            album: yup.object().typeError("Album entity must be selected."),
            diskNumber: yup.number().nullable().positive().integer(),
            trackNumber: yup.number().nullable().positive().integer(),
            name: yup.string().required(),
          })),
        })}
        onSubmit={async (values, formikHelpers) => {
          try {
            const data = {
              name: values.name,
              sortOrder: values.sortOrder,
              coverUrl: values.coverUrl,
              originalId: values.originalSong?.id ?? null,
              songInAlbums: values.albums.map(v => ({
                name: v.name,
                diskNumber: v.diskNumber,
                trackNumber: v.trackNumber,
                albumId: v.album.id,
              })),
              artistsOfSong: values.artists.map(v => ({
                categories: v.categories,
                artistRoles: v.artistRoles,
                isSupport: v.isSupport,
                customName: v.customName || "",
                artistId: v.artist.id,
              })),
            };

            if (create) {
              const result = await apolloClient.mutate<{ newSong: Partial<Song> }>({
                mutation: NEW_SONG_MUTATION,
                variables: {
                  data
                }
              });

              if (result.data) {
                setSong(result.data.newSong);
                snackbar.enqueueSnackbar(`Song “${result.data.newSong.name}” is successfully created.`, {
                  variant: "success",
                });
                formikHelpers.setSubmitting(false);
                handleClose();
              } else {
                formikHelpers.setSubmitting(false);
              }
            } else {
              const result = await apolloClient.mutate<{ updateSong: Partial<Song> }>({
                mutation: UPDATE_SONG_MUTATION,
                variables: {
                  id: songId,
                  data
                }
              });

              if (result.data) {
                setSong(result.data.updateSong);
                snackbar.enqueueSnackbar(`Song “${result.data.updateSong.name}” is successfully updated.`, {
                  variant: "success",
                });
                formikHelpers.setSubmitting(false);
                handleClose();
              } else {
                formikHelpers.setSubmitting(false);
              }
            }
          } catch (e) {
            console.error(`Error occurred while ${create ? "creating" : "editing"} song #${values.name}.`, e);
            snackbar.enqueueSnackbar(`Error occurred while ${create ? "creating" : "editing"} song ${values.name}. (${e})`, {
              variant: "error",
            });
            formikHelpers.setSubmitting(false);
          }
        }}>
        {(formikProps) => (
          <>
            <DialogTitle id="form-dialog-title">{create ? "Create new song entity" : `Edit song entity #${songId}`}</DialogTitle>
            <DialogContent dividers>
              <Form>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <FastField
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      name="name" type="text" label="Track name" />
                  </Grid>
                  <Grid item xs={12}>
                    <FastField
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      InputProps={{
                        endAdornment: <TransliterationAdornment
                          value={formikProps.values.name}
                          setField={(v) => formikProps.setFieldValue("sortOrder", v)}
                        />,
                      }}
                      name="sortOrder" type="text" label="Sort order" />
                  </Grid>
                  <Grid item xs={12}>
                    <div className={styles.mainPictureRow}>
                      <Avatar
                        src={formikProps.values.coverUrl} variant="rounded"
                        className={styles.mainPictureThumbnail}
                      >
                        <MusicNoteIcon />
                      </Avatar>
                      <FastField
                        component={TextField}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        InputProps={{
                          endAdornment: <VideoThumbnailAdornment
                            value={formikProps.values.coverUrl}
                            setField={(v) => formikProps.setFieldValue("coverUrl", v)}
                          />,
                        }}
                        name="coverUrl" type="text" label="Cover URL" />
                    </div>
                  </Grid>
                </Grid>
                <SelectSongEntityBox fieldName="originalSong" formikProps={formikProps} labelName="Original song" />
                <Typography variant="h6" component="h3" className={styles.divider}>Artists</Typography>
                <FieldArray name="artists">
                  {({ push, remove }) => (
                    <>
                      {formikProps.values.artists?.length > 0 && formikProps.values.artists.map((v, idx) => (
                        <Fragment key={idx}>
                          <SelectArtistEntityBox
                            fieldName={`artists.${idx}.artist`}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            formikProps={formikProps}
                            labelName="Artist"
                          />
                          <div className={styles.artistRow}>
                            <FormControl variant="outlined" margin="dense" fullWidth>
                              <InputLabel htmlFor={`artists.${idx}.artistRoles`}>Roles</InputLabel>
                              <FastField
                                component={Select}
                                type="text"
                                label="Roles"
                                name={`artists.${idx}.artistRoles`}
                                multiple
                                inputProps={{ name: `artists.${idx}.artistRoles`, id: `artists.${idx}.artistRoles` }}
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
                              </FastField>
                            </FormControl>
                            <FormControl variant="outlined" margin="dense" fullWidth>
                              <InputLabel htmlFor={`artists.${idx}.categories`}>Categories</InputLabel>
                              <FastField
                                component={Select}
                                type="text"
                                label="Categories"
                                name={`artists.${idx}.categories`}
                                multiple
                                inputProps={{ name: `artists.${idx}.categories`, id: `artists.${idx}.categories` }}
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
                              </FastField>
                            </FormControl>
                          </div>
                          <div className={styles.artistRow}>
                            <FormControlLabel
                              control={
                                <Fields component={Checkbox} indeterminate={false} type="checkbox" name={`artists.${idx}.isSupport`} />
                              }
                              label="Support"
                            />
                            <FastField
                              component={TextField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              name={`artists.${idx}.customName`} type="text" label="Custom name" />
                            <IconButton color="primary" aria-label="Delete artist item" onClick={() => remove(idx)}>
                              <DeleteIcon />
                            </IconButton>
                          </div>
                          <Divider className={styles.divider} />
                        </Fragment>
                      ))}
                      <Button
                        fullWidth variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => push({
                          artist: null,
                          artistRoles: ["Default"],
                          categories: ["Nothing"],
                          customName: "",
                          isSupport: false,
                        })}
                      >
                        Add artist
                      </Button>
                      {(formikProps.touched.artists && typeof formikProps.errors.artists === "string") ?
                        <FormHelperText error>{formikProps.errors.artists}</FormHelperText> : false}
                    </>
                  )}
                </FieldArray>
                <Typography variant="h6" component="h3" className={styles.divider}>Albums</Typography>
                <FieldArray name="albums">
                  {({ push, remove }) => (
                    <>
                      {formikProps.values.albums.length > 0 && formikProps.values.albums.map((v, idx) => (
                        <Fragment key={idx}>
                          <SelectAlbumEntityBox
                            fieldName={`albums.${idx}.album`}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            formikProps={formikProps}
                            labelName="Album"
                          />
                          <div className={styles.artistRow}>
                            <FastField
                              component={TextField}
                              className={styles.numberField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><AlbumIcon /></InputAdornment>,
                              }}
                              name={`albums.${idx}.diskNumber`} type="number" label="Disk number" />
                            <FastField
                              component={TextField}
                              className={styles.numberField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><MusicNoteIcon /></InputAdornment>,
                              }}
                              name={`albums.${idx}.trackNumber`} type="number" label="Track number" />
                          </div>
                          <div className={styles.artistRow}>
                            <FastField
                              component={TextField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              required
                              name={`albums.${idx}.name`} type="text" label="Track name"
                              InputProps={{
                                endAdornment: <TrackNameAdornment
                                  trackName={formikProps.values.name ?? ""}
                                  value={formikProps.values.albums[idx].name}
                                  setField={(v: string) => formikProps.setFieldValue(`albums.${idx}.name`, v)}
                                />,
                              }}
                            />
                            <IconButton color="primary" aria-label="Delete album item" onClick={() => remove(idx)}>
                              <DeleteIcon />
                            </IconButton>
                          </div>
                          <Divider className={styles.divider} />
                        </Fragment>
                      ))}
                      <Button
                        fullWidth variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => push({
                          album: null,
                          trackNumber: "",
                          diskNumber: "",
                          name: formikProps.values.name ?? "",
                        })}
                      >
                        Add Album
                      </Button>
                    </>
                  )}
                </FieldArray>
              </Form>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button disabled={formikProps.isSubmitting} onClick={formikProps.submitForm} color="primary">
                {create ? "Create" : "Update"}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
}

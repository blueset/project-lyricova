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
  FormControlLabel, FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Typography
} from "@material-ui/core";
import { useCallback, Fragment } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { Field, FieldArray, Form, Formik } from "formik";
import { Checkbox, Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AutorenewIcon from "@material-ui/icons/Autorenew";
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

const NEW_SONG_MUTATION = gql`
  mutation($data: NewSongInput!) {
    newSong(data: $data) {
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

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
}

export default function CreateSongEntityDialog({ isOpen, toggleOpen, keyword, setKeyword, setSong }: Props) {

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const styles = useStyles();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const convertUrl = useCallback((sourceUrl: string): string => {
    if (sourceUrl.match(/(nicovideo.jp\/watch|nico.ms)\/([a-z]{2}\d{4,10}|\d{6,12})/g)) {
      const numId = sourceUrl.match(/\d{6,12}/g);
      if (numId) return `https://tn.smilevideo.jp/smile?i=${numId[0]}`;
    } else if (sourceUrl.match(/(youtu.be\/|youtube.com\/watch\?\S*?v=)\S{11}/g)) {
      const id = /(youtu.be\/|youtube.com\/watch\?\S*?v=)(\S{11})/g.exec(sourceUrl);
      return `https://img.youtube.com/vi/${id[2]}/hqdefault.jpg`;
    }

    snackbar.enqueueSnackbar("URL is not from a known site, no thumbnail is converted.", {
      variant: "info",
    });

    return sourceUrl;
  }, [snackbar]);

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title" scroll="paper">
      <Formik
        initialValues={{
          name: keyword,
          sortOrder: "",
          coverUrl: "",
          originalSong: null,
          artists: [],
          albums: [],
        }}
        validationSchema={yup.object({
          name: yup.string().required(),
          sortOrder: yup.string().required(),
          coverUrl: yup.string().url(),
          originalSong: yup.object().nullable(),
          artists: yup.array(yup.object({
            artist: yup.object().typeError("Artist entity must be selected."),
            artistRoles: yup.array(yup.string()).required(),
            categories: yup.array(yup.string()).required(),
            customName: yup.string(),
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
            const result = await apolloClient.mutate<{ newSong: Partial<Song> }>({
              mutation: NEW_SONG_MUTATION,
              variables: {
                data: {
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
                    customName: v.customName,
                    artistId: v.artist.id,
                  })),
                }
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
          } catch (e) {
            console.error(`Error occurred while creating artist #${values.name}.`, e);
            snackbar.enqueueSnackbar(`Error occurred while creating song ${values.name}. (${e})`, {
              variant: "error",
            });
            formikHelpers.setSubmitting(false);
          }
        }}>
        {(formikProps) => (
          <>
            <DialogTitle id="form-dialog-title">Create new song entity</DialogTitle>
            <DialogContent dividers>
              <Form>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Field
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      name="name" type="text" label="Track name" />
                  </Grid>
                  <Grid item xs={12}>
                    <Field
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
                      <Field
                        component={TextField}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label="Convert from video site link"
                              onClick={() => formikProps.setFieldValue("coverUrl", convertUrl(formikProps.values.coverUrl))}
                            >
                              <AutorenewIcon />
                            </IconButton>
                          </InputAdornment>,
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
                              <Field
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
                              </Field>
                            </FormControl>
                            <FormControl variant="outlined" margin="dense" fullWidth>
                              <InputLabel htmlFor={`artists.${idx}.categories`}>Categories</InputLabel>
                              <Field
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
                              </Field>
                            </FormControl>
                          </div>
                          <div className={styles.artistRow}>
                            <FormControlLabel
                              control={
                                <Field component={Checkbox} type="checkbox" name={`artists.${idx}.isSupport`} />
                              }
                              label="Support"
                            />
                            <Field
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
                      {(formikProps.touched.artists && typeof formikProps.errors.artists === "string") ? <FormHelperText error>{formikProps.errors.artists}</FormHelperText> : false}
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
                            <Field
                              component={TextField}
                              className={styles.numberField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><AlbumIcon /></InputAdornment>,
                              }}
                              name={`albums.${idx}.diskNumber`} type="number" label="Disk number" />
                            <Field
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
                            <Field
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
                Create
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
}

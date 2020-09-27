import { Album } from "../../../models/Album";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Typography
} from "@material-ui/core";
import { useCallback, Fragment } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { Field, FieldArray, Form, Formik, FormikProps, getIn } from "formik";
import { Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import SortIcon from "@material-ui/icons/Sort";
import { makeStyles } from "@material-ui/core/styles";
import SelectSongEntityBox from "./selectSongEntityBox";
import TrackNameAdornment from "../TrackNameAdornment";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import _ from "lodash";
import * as yup from "yup";
import { AlbumFragments } from "../../../graphql/fragments";

const NEW_ALBUM_MUTATION = gql`
  mutation($data: NewAlbumInput!) {
    newAlbum(data: $data) {
      ...SelectAlbumEntry
    }
  }
  
  ${AlbumFragments.SelectAlbumEntry}
`;

interface RoleFieldProps<T extends string, S> {
  name: T;
  formikProps: FormikProps<{ [key in T]: S }>;
  label: string;
  idx: number;
}

function RoleField<T extends string>({name, label, idx, formikProps}: RoleFieldProps<T, string[]>) {
  const fieldName = `artists.${idx}.${name}`;
  const fieldError = getIn(formikProps.errors, fieldName);
  const showError = getIn(formikProps.touched, fieldName) && !!fieldError;
  return (
    <FormControl variant="outlined" margin="dense" error={showError} fullWidth>
      <InputLabel htmlFor={fieldName}>{label}</InputLabel>
      <Field
        component={Select}
        type="text"
        label={label}
        name={fieldName}
        multiple
        inputProps={{ name: fieldName, id: fieldName }}
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
      {showError && <FormHelperText>{fieldError}</FormHelperText>}
    </FormControl>
  );
}


const useStyles = makeStyles((theme) => ({
  artistRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
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
    width: "10em",
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
  setAlbum: (value: Partial<Album>) => void;
}

export default function CreateAlbumEntityDialog({ isOpen, toggleOpen, keyword, setKeyword, setAlbum }: Props) {

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
          songs: [],
          artists: [],
        }}
        validationSchema={yup.object({
          name: yup.string().required(),
          sortOrder: yup.string().required(),
          coverUrl: yup.string().url(),
          songs: yup.array().of(yup.object({
            song: yup.object().typeError("Song entity must be selected."),
            diskNumber: yup.number().nullable().positive().integer(),
            trackNumber: yup.number().nullable().positive().integer(),
            name: yup.string().required(),
          })),
          artists: yup.array().of(yup.object({
            artist: yup.object().typeError("Artist entity must be selected."),
            categories: yup.string().required(),
            roles: yup.array(yup.string().required()).required(),
            effectiveRoles: yup.array(yup.string().required()).required(),
          }))
        })}
        onSubmit={async (values, formikHelpers) => {
          try {
            const result = await apolloClient.mutate<{ newAlbum: Partial<Album> }>({
              mutation: NEW_ALBUM_MUTATION,
              variables: {
                data: {
                  name: values.name,
                  sortOrder: values.sortOrder,
                  coverUrl: values.coverUrl,
                  songsInAlbum: values.songs.map(v => ({
                    name: v.name,
                    diskNumber: v.diskNumber,
                    trackNumber: v.trackNumber,
                    songId: v.song.id,
                  })),
                  artistsOfAlbum: values.artists.map(v => ({
                    categories: v.categories,
                    roles: v.roles,
                    effectiveRoles: v.effectiveRoles,
                    artistId: v.artist.id,
                  })),
                }
              }
            });

            if (result.data) {
              setAlbum(result.data.newAlbum);
              snackbar.enqueueSnackbar(`Album “${result.data.newAlbum.name}” is successfully created.`, {
                variant: "success",
              });
              formikHelpers.setSubmitting(false);
              handleClose();
            } else {
              formikHelpers.setSubmitting(false);
            }
          } catch (e) {
            console.error(`Error occurred while creating artist #${values.name}.`, e);
            snackbar.enqueueSnackbar(`Error occurred while creating artist #${values.name}. (${e})`, {
              variant: "error",
            });
            formikHelpers.setSubmitting(false);
          }
        }}>
        {(formikProps) => (
          <>
            <DialogTitle id="form-dialog-title">Create new album entity</DialogTitle>
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
                      name="name" type="text" label="Album name" />
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
                            <RoleField
                              idx={idx} name="roles" label="Roles"
                              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                              // @ts-ignore
                              formikProps={formikProps}
                            />
                            <RoleField
                              idx={idx} name="effectiveRoles" label="Effective roles"
                              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                              // @ts-ignore
                              formikProps={formikProps}
                            />
                          </div>
                          <div className={styles.artistRow}>
                            <Field
                              component={TextField}
                              type="text"
                              label="Category"
                              name={`artists.${idx}.categories`}
                              variant="outlined"
                              margin="dense"
                              select
                              fullWidth
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
                          roles: ["Default"],
                          effectiveRoles: ["Default"],
                          categories: "Nothing",
                        })}
                      >
                        Add artist
                      </Button>
                    </>
                  )}
                </FieldArray>
                <Typography variant="h6" component="h3" className={styles.divider}>Tracks</Typography>
                <FieldArray name="songs">
                  {({ push, remove }) => (
                    <>
                      {formikProps.values.songs?.length > 0 && formikProps.values.songs.map((v, idx) => (
                        <>
                          <SelectSongEntityBox
                            fieldName={`songs.${idx}.song`}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            formikProps={formikProps}
                            labelName="Track"
                          />
                          <div className={styles.artistRow}>
                            <Field
                              component={TextField}
                              className={styles.numberField}
                              variant="outlined"
                              margin="dense"
                              name={`songs.${idx}.diskNumber`} type="number" label="#Disk" />
                            <Field
                              component={TextField}
                              className={styles.numberField}
                              variant="outlined"
                              margin="dense"
                              name={`songs.${idx}.trackNumber`} type="number" label="#Track" />
                            <Field
                              component={TextField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              required
                              name={`songs.${idx}.name`} type="text" label="Track name"
                              InputProps={{
                                endAdornment: <TrackNameAdornment
                                  trackName={formikProps.values.songs[idx].song?.name ?? ""}
                                  value={formikProps.values.songs[idx].name}
                                  setField={(v: string) => formikProps.setFieldValue(`songs.${idx}.name`, v)}
                                />,
                              }}
                            />
                            <IconButton color="primary" aria-label="Delete album item" onClick={() => remove(idx)}>
                              <DeleteIcon />
                            </IconButton>
                          </div>
                          <Divider className={styles.divider} />
                        </>
                      ))}
                      <div className={styles.artistRow}>
                        <Button
                          variant="outlined"
                          color="default"
                          startIcon={<SortIcon />}
                          onClick={() => formikProps.setFieldValue(
                            "songs",
                            _.sortBy(formikProps.values.songs, ["diskNumber", "trackNumber"])
                          )}
                        >
                          Sort
                        </Button>
                        <Button
                          fullWidth variant="outlined"
                          color="secondary"
                          startIcon={<AddIcon />}
                          onClick={() => push({
                            song: null,
                            trackNumber: null,
                            diskNumber: null,
                            name: "",
                          })}
                        >
                          Add Album
                        </Button>
                      </div>
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

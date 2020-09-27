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
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Typography
} from "@material-ui/core";
import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { Field, FieldArray, Form, Formik } from "formik";
import { Checkbox, Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import SelectSongEntityBox from "./selectSongEntityBox";
import { makeStyles } from "@material-ui/core/styles";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import SelectAlbumEntityBox from "./selectAlbumEntityBox";
import TrackNameAdornment from "../TrackNameAdornment";
import MusicNoteIcon from "@material-ui/icons/MusicNote";

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
        onSubmit={(values, formikHelpers) => {
          /* TODO */
          formikHelpers.setSubmitting(false);
          handleClose();
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
                      name="name" type="text" label="Track name" />
                  </Grid>
                  <Grid item xs={12}>
                    <Field
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      fullWidth
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
                        <>
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
                        </>
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
                    </>
                  )}
                </FieldArray>
                <Typography variant="h6" component="h3" className={styles.divider}>Albums</Typography>
                <FieldArray name="albums">
                  {({ push, remove }) => (
                    <>
                      {formikProps.values.albums.length > 0 && formikProps.values.albums.map((v, idx) => (
                        <>
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
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              name={`albums.${idx}.trackNumber`} type="number" label="Track number" />
                            <Field
                              component={TextField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              name={`albums.${idx}.diskNumber`} type="number" label="Disk number" />
                          </div>
                          <div className={styles.artistRow}>
                            <Field
                              component={TextField}
                              variant="outlined"
                              margin="dense"
                              fullWidth
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
                        </>
                      ))}
                      <Button
                        fullWidth variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => push({
                          album: null,
                          trackNumber: null,
                          diskNumber: null,
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

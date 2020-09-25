import { Song } from "../../../models/Song";
import {
  Button, Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, FormControl, FormControlLabel,
  Grid,
  IconButton,
  InputAdornment, InputLabel, MenuItem, Typography,
  Checkbox as MUICheckbox
} from "@material-ui/core";
import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { useNamedState } from "../../../frontendUtils/hooks";
import { Field, FieldArray, Form, Formik } from "formik";
import { Checkbox, Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import VocaDBIntegrationBox from "./vocaDBIntegrationBox";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  artistRow: {
    display: "flex",
    flexDirection: "row",
    "& > *": {
      marginRight: theme.spacing(1),
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
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
  const [isSaving, toggleSaving] = useNamedState(false, "saving");
  const styles = useStyles();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    toggleSaving(false);
  }, [toggleOpen, setKeyword, toggleSaving]);

  const handleSubmit = useCallback(() => {
    toggleSaving(true);

    handleClose();
  }, [toggleSaving, handleClose]);

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
      <DialogTitle id="form-dialog-title">Create new song entity</DialogTitle>
      <DialogContent dividers>
        <Formik
          initialValues={{
            name: keyword,
            sortOrder: "",
            coverPath: "",
            originalSong: null,
            artists: [],
            albums: [],
          }}
          onSubmit={(values, formikHelpers) => {
            /* TODO */
            formikHelpers.setSubmitting(false);
          }}>
          {(formikProps) => {

            return (
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
                            onClick={() => formikProps.setFieldValue("coverPath", convertUrl(formikProps.values.coverPath))}
                          >
                            <AutorenewIcon />
                          </IconButton>
                        </InputAdornment>,
                      }}
                      name="coverPath" type="text" label="Cover path" />
                  </Grid>
                </Grid>
                <VocaDBIntegrationBox fieldName="originalSong" formikProps={formikProps} labelName="Original song" />
                <Typography variant="h6" component="h3" gutterBottom>Artists</Typography>
                <FieldArray name="artists">
                  {({ push, remove }) => (
                    <Grid container spacing={1}>
                      {formikProps.values.artists?.length > 0 && formikProps.values.artists.map((v, idx) => (
                        <Grid item xs={12} key={idx}>
                          <div className={styles.artistRow}>
                            <FormControl variant="outlined" margin="dense" fullWidth>
                              <InputLabel htmlFor={`artists.${idx}.artistRoles`}>Roles</InputLabel>
                              <Field
                                component={Select}
                                type="text"
                                label="Roles"
                                name={`artists.${idx}.artistRoles`}
                                multiple
                                inputProps={{name: `artists.${idx}.artistRoles`, id: `artists.${idx}.artistRoles`}}
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
                                inputProps={{name: `artists.${idx}.categories`, id: `artists.${idx}.categories`}}
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
                            <Button color="primary" aria-label="Delete artist item" onClick={() => remove(idx)}>
                              <DeleteIcon />
                            </Button>
                          </div>
                        </Grid>
                      ))}
                      <Grid item xs={12}>
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
                      </Grid>
                    </Grid>
                  )}
                </FieldArray>
                <Typography variant="h6" component="h3" gutterBottom>Albums</Typography>
                <FieldArray name="albums">
                  {({ push, remove }) => (
                    <Grid container spacing={1}>
                      {formikProps.values.albums?.length > 0 && formikProps.values.albums.map((v, idx) => (
                        <Grid item xs={12} key={idx}>
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
                              name={`albums.${idx}.name`} type="text" label="Track name" />
                            <Button color="primary" aria-label="Delete artist item" onClick={() => remove(idx)}>
                              <DeleteIcon />
                            </Button>
                          </div>
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        <Button
                          fullWidth variant="outlined"
                          color="secondary"
                          startIcon={<AddIcon />}
                          onClick={() => push({
                            album: null,
                            trackNumber: null,
                            diskNumber: null,
                            name: "",
                          })}
                        >
                          Add Album
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </FieldArray>
                <pre>{`
                  Name
                  Sort order
                  Cover path from video site
    
                  Original song
    
                  Artists (multiple)
                    search = import + add
                      name, sortOrder, type
                    artistOfSong
                      roles, categories, custom name
                                        
                  Albums (multiple)
                    search = import + add
                      name, sortOrder
                    songInAlbums
                      disk number, track number, name
                `}</pre>
              </Form>
            );
          }}
        </Formik>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={handleSubmit} color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

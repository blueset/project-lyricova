import { Artist } from "../../../models/Artist";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, FormControl,
  Grid,
  InputLabel,
  MenuItem
} from "@material-ui/core";
import { useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { Field, Form, Formik } from "formik";
import { Select, TextField } from "formik-material-ui";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/core/styles";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import * as yup from "yup";
import { ArtistFragments } from "../../../graphql/fragments";

const NEW_ARTIST_MUTATION = gql`
  mutation($data: NewArtistInput!) {
    newArtist(data: $data) {
      ...SelectArtistEntry
    }
  }
  
  ${ArtistFragments.SelectArtistEntry}
`;

const useStyles = makeStyles((theme) => ({
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
}));

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setArtist: (value: Partial<Artist>) => void;
}

export default function CreateArtistEntityDialog({ isOpen, toggleOpen, keyword, setKeyword, setArtist }: Props) {

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const styles = useStyles();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title" scroll="paper">
      <Formik
        initialValues={{
          name: keyword,
          sortOrder: "",
          mainPictureUrl: "",
          type: "Unknown",
        }}
        validationSchema={yup.object({
          name: yup.string().required("Artist name is required"),
          sortOrder: yup.string().required("Artist sort order is required"),
          mainPictureUrl: yup.string().nullable().url("Main picture URL is not a valid URL."),
          type: yup.string().required("Type must be selected."),
        })}
        onSubmit={async (values, formikHelpers) => {
          try {
            const result = await apolloClient.mutate<{ newArtist: Partial<Artist> }>({
              mutation: NEW_ARTIST_MUTATION,
              variables: {
                data: values
              }
            });

            if (result.data) {
              setArtist(result.data.newArtist);
              snackbar.enqueueSnackbar(`Artist “${result.data.newArtist.name}” is successfully created.`, {
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
            <DialogTitle id="form-dialog-title">Create new artist entity</DialogTitle>
            <DialogContent dividers>
              <Form>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Field
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      required
                      fullWidth
                      name="name" type="text" label="Name" />
                  </Grid>
                  <Grid item xs={12}>
                    <Field
                      component={TextField}
                      variant="outlined"
                      margin="dense"
                      required
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
                        src={formikProps.values.mainPictureUrl} variant="rounded"
                        className={styles.mainPictureThumbnail}
                      >
                        <MusicNoteIcon />
                      </Avatar>
                      <Field
                        component={TextField}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        name="mainPictureUrl" type="text" label="Main picture URL" />
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel htmlFor="type">Type</InputLabel>
                      <Field
                        component={Select}
                        type="text"
                        label="Type"
                        name="type"
                        select
                        inputProps={{ name: "type", id: "type" }}
                      >
                        <MenuItem value="Unknown">Unknown</MenuItem>
                        <MenuItem value="Circle">Circle</MenuItem>
                        <MenuItem value="Label">Label</MenuItem>
                        <MenuItem value="Producer">Producer</MenuItem>
                        <MenuItem value="Animator">Animator</MenuItem>
                        <MenuItem value="Illustrator">Illustrator</MenuItem>
                        <MenuItem value="Lyricist">Lyricist</MenuItem>
                        <MenuItem value="Vocaloid">Vocaloid</MenuItem>
                        <MenuItem value="UTAU">UTAU</MenuItem>
                        <MenuItem value="CeVIO">CeVIO</MenuItem>
                        <MenuItem value="OtherVoiceSynthesizer">Other Voice Synthesizer</MenuItem>
                        <MenuItem value="OtherVocalist">Other Vocalist</MenuItem>
                        <MenuItem value="OtherGroup">Other Group</MenuItem>
                        <MenuItem value="OtherIndividual">Other Individual</MenuItem>
                        <MenuItem value="Utaite">Utaite</MenuItem>
                        <MenuItem value="Band">Band</MenuItem>
                        <MenuItem value="Vocalist">Vocalist</MenuItem>
                        <MenuItem value="Character">Character</MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>
                </Grid>
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

import { Artist } from "../../../models/Artist";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem
} from "@material-ui/core";
import { useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/core/styles";
import * as yup from "yup";
import { ArtistFragments } from "../../../graphql/fragments";
import { Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import AvatarField from "./AvatarField";
import finalFormMutators from "../../../frontendUtils/finalFormMutators";
import { Song } from "../../../models/Song";
import { VDBArtistCategoryType, VDBArtistRoleType } from "../../../types/vocadb";
import { Album } from "../../../models/Album";

const NEW_ARTIST_MUTATION = gql`
  mutation($data: ArtistInput!) {
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

interface FormValues {
  name: string;
  sortOrder: string;
  mainPictureUrl?: string;
  type: string;
}

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setArtist: (value: Partial<Artist>) => void;
  artistToEdit?: Partial<Artist>;
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
      <Form<FormValues>
        initialValues={{
          name: keyword,
          sortOrder: "",
          mainPictureUrl: "",
          type: "Unknown",
        }}
        mutators={{
          ...finalFormMutators,
        }}
        subscription={{}}
        validate={makeValidate(yup.object({
          name: yup.string().required("Artist name is required"),
          sortOrder: yup.string().required("Artist sort order is required"),
          mainPictureUrl: yup.string().nullable().url("Main picture URL is not a valid URL."),
          type: yup.string().required("Type must be selected."),
        }))}
        onSubmit={async (values) => {
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
              handleClose();
            }
          } catch (e) {
            console.error(`Error occurred while creating artist #${values.name}.`, e);
            snackbar.enqueueSnackbar(`Error occurred while creating artist #${values.name}. (${e})`, {
              variant: "error",
            });
          }
        }}>
        {({submitting, handleSubmit}) => (
          <>
            <DialogTitle id="form-dialog-title">Create new artist entity</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      required
                      fullWidth
                      name="name" type="text" label="Name" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      required
                      fullWidth
                      InputProps={{
                        endAdornment: <TransliterationAdornment sourceName="name" destinationName="sortOrder" />,
                      }}
                      name="sortOrder" type="text" label="Sort order" />
                  </Grid>
                  <Grid item xs={12}>
                    <div className={styles.mainPictureRow}>
                      <AvatarField
                        name="mainPictureUrl"
                        className={styles.mainPictureThumbnail}
                      />
                      <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        name="mainPictureUrl" type="text" label="Main picture URL" />
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel htmlFor="type">Type</InputLabel>
                      <Select
                        type="text"
                        label="Type"
                        name="type"
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
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button disabled={submitting} onClick={handleSubmit} color="primary">
                Create
              </Button>
            </DialogActions>
          </>
        )}
      </Form>
    </Dialog>
  );
}

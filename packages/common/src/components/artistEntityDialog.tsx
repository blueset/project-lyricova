import { Artist } from "../models/Artist";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
} from "@mui/material";
import { useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import TransliterationAdornment from "./TransliterationAdornment";
import { useSnackbar } from "notistack";
import * as yup from "yup";
import { ArtistFragments } from "../utils/fragments";
import { Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import AvatarField from "./AvatarField";
import finalFormMutators from "../frontendUtils/finalFormMutators";
import { DocumentNode } from "graphql";
import React from "react";

const NEW_ARTIST_MUTATION = gql`
  mutation($data: ArtistInput!) {
    newArtist(data: $data) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

const UPDATE_ARTIST_MUTATION = gql`
  mutation($id: Int!, $data: ArtistInput!) {
    updateArtist(id: $id, data: $data) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

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

export default function ArtistEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setArtist,
  create,
  artistToEdit,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const initialValues =
    create || !artistToEdit
      ? {
          name: keyword,
          sortOrder: "",
          mainPictureUrl: "",
          type: "Unknown",
        }
      : {
          name: artistToEdit.name,
          sortOrder: artistToEdit.sortOrder,
          mainPictureUrl: artistToEdit.mainPictureUrl,
          type: artistToEdit.type,
        };

  const artistId = artistToEdit?.id ?? null;

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
        }}
        subscription={{}}
        validate={makeValidate(
          yup.object({
            name: yup.string().required("Artist name is required"),
            sortOrder: yup.string().required("Artist sort order is required"),
            mainPictureUrl: yup
              .string()
              .nullable()
              .url("Main picture URL is not a valid URL."),
            type: yup.string().required("Type must be selected."),
          })
        )}
        onSubmit={async (data) => {
          try {
            if (create) {
              const result = await apolloClient.mutate<{
                newArtist: Partial<Artist>;
              }>({
                mutation: NEW_ARTIST_MUTATION,
                variables: { data },
              });

              if (result.data) {
                setArtist(result.data.newArtist);
                snackbar.enqueueSnackbar(
                  `Artist “${result.data.newArtist.name}” is successfully created.`,
                  {
                    variant: "success",
                  }
                );
                handleClose();
              }
            } else {
              const result = await apolloClient.mutate<{
                updateArtist: Partial<Artist>;
              }>({
                mutation: UPDATE_ARTIST_MUTATION,
                variables: { id: artistId, data },
              });

              if (result.data) {
                setArtist(result.data.updateArtist);
                snackbar.enqueueSnackbar(
                  `Artist “${result.data.updateArtist.name}” is successfully updated.`,
                  {
                    variant: "success",
                  }
                );
                apolloClient.cache.evict({ id: `Artist:${artistId}` });
                handleClose();
              }
            }
          } catch (e) {
            console.error(
              `Error occurred while ${
                create ? "creating" : "updating"
              } artist #${data.name}.`,
              e
            );
            snackbar.enqueueSnackbar(
              `Error occurred while ${
                create ? "creating" : "updating"
              } artist #${data.name}. (${e})`,
              {
                variant: "error",
              }
            );
          }
        }}
      >
        {({ submitting, handleSubmit }) => (
          <>
            <DialogTitle id="form-dialog-title">
              {create
                ? "Create new artist entity"
                : `Edit artist entity #${artistId}`}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    required
                    fullWidth
                    name="name"
                    type="text"
                    label="Name"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    required
                    fullWidth
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
                  <Stack direction="row" alignItems="center">
                    <AvatarField
                      name="mainPictureUrl"
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
                      name="mainPictureUrl"
                      type="text"
                      label="Main picture URL"
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Select
                    type="text"
                    label="Type"
                    name="type"
                    formControlProps={{
                      margin: "dense",
                      variant: "outlined",
                      fullWidth: true,
                    }}
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
                    <MenuItem value="OtherVoiceSynthesizer">
                      Other Voice Synthesizer
                    </MenuItem>
                    <MenuItem value="OtherVocalist">Other Vocalist</MenuItem>
                    <MenuItem value="OtherGroup">Other Group</MenuItem>
                    <MenuItem value="OtherIndividual">
                      Other Individual
                    </MenuItem>
                    <MenuItem value="Utaite">Utaite</MenuItem>
                    <MenuItem value="Band">Band</MenuItem>
                    <MenuItem value="Vocalist">Vocalist</MenuItem>
                    <MenuItem value="Character">Character</MenuItem>
                  </Select>
                </Grid>
              </Grid>
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

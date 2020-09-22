import { Field, Form, Formik } from "formik";
import { TextField } from "formik-material-ui";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Divider, Grid, IconButton, InputAdornment } from "@material-ui/core";
import { gql, useApolloClient } from "@apollo/client";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import { MouseEventHandler } from "react";
import { Song } from "../../../models/Song";
import VocaDBIntegrationBox from "./vocaDBIntegrationBox";

const TRANSLITRATION_QUERY = gql`
  query($text: String!) {
    transliterate(text: $text) {
      plain
    }
  }
`;

const TransliterationAdornment = ({ onClick }: {
  onClick: MouseEventHandler;
}) => (
  <InputAdornment position="end">
    <IconButton
      aria-label="generate transliteration"
      onClick={onClick}
    >
      <AutorenewIcon />
    </IconButton>
  </InputAdornment>
);

const useStyles = makeStyles((theme) => ({
  divider: {
    margin: theme.spacing(2, 0),
  },
}));

interface Props {
  trackName: string;
  trackSortOrder: string;
  artistName: string;
  artistSortOrder: string;
  albumName: string;
  albumSortOrder: string;
  fileId: number;
  song?: Partial<Song>;
}

export default function InfoPanel(
  { trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder, song, fileId, }: Props
) {
  const styles = useStyles();
  const apolloClient = useApolloClient();

  return (
    <Formik
      enableReinitialize
      initialValues={{
        trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder, song,
      }}
      onSubmit={(values, formikHelpers) => {
        /* TODO */
        console.log("SUBMIT", values);
        formikHelpers.setSubmitting(false);
      }}
    >{(formikProps) => {
      const { isSubmitting, submitForm, setFieldValue, values } = formikProps;

      const transliterateField = (
        sourceId: "trackName" | "artistName" | "albumName",
        fieldId: "trackSortOrder" | "artistSortOrder" | "albumSortOrder"
      ) => async () => {
        const text = values[sourceId];
        const result = await apolloClient.query<{
          transliterate: { plain: string; };
        }>({
          query: TRANSLITRATION_QUERY,
          variables: {
            text
          }
        });
        if (!result.error) {
          setFieldValue(fieldId, result.data.transliterate.plain);
        }
      };

      return (
        <Form>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="trackName" type="text" label="Track name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="trackSortOrder" type="text" label="Track sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    onClick={transliterateField("trackName", "trackSortOrder")} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="artistName" type="text" label="Artist name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="artistSortOrder" type="text" label="Artist sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    onClick={transliterateField("artistName", "artistSortOrder")} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="albumName" type="text" label="Album name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                component={TextField}
                variant="outlined"
                margin="dense"
                fullWidth
                name="albumSortOrder" type="text" label="Album sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    onClick={transliterateField("albumName", "albumSortOrder")} />,
                }}
              />
            </Grid>
          </Grid>
          <Divider className={styles.divider} />
          <VocaDBIntegrationBox fieldName="song" formikProps={formikProps} labelName="Linked song" />
          <Button disabled={isSubmitting} onClick={submitForm}>Save</Button>
        </Form>
      );
    }}</Formik>
  );
}
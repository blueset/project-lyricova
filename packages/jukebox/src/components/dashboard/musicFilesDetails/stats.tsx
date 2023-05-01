import { DocumentNode, gql, useApolloClient } from "@apollo/client";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Grid, Button } from "@mui/material";
import finalFormMutators from "lyricova-common/frontendUtils/finalFormMutators";
import { DateTimePicker, TextField, makeValidate } from "mui-rff";
import { useSnackbar } from "notistack";
import { Form } from "react-final-form";
import * as yup from "yup";

const UPDATE_MUSIC_FILE_STATS_MUTATION = gql`
  mutation ($fileId: Int!, $playCount: Int!, $lastPlayed: Date) {
    updateMusicFileStats(
      fileId: $fileId
      playCount: $playCount
      lastPlayed: $lastPlayed
    ) {
      trackName
    }
  }
` as DocumentNode;

interface FormProps {
  playCount?: number;
  lastPlayed?: Date;
}

interface Props extends FormProps {
  fileId: number;
  refresh: () => unknown | Promise<unknown>;
}

export default function StatsPanel({
  fileId,
  playCount,
  lastPlayed,
  refresh,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  return (
    <Form<FormProps>
      mutators={{ ...finalFormMutators }}
      initialValues={{ playCount, lastPlayed }}
      validate={makeValidate(
        yup.object({
          playCount: yup.number().min(0).optional(),
        })
      )}
      onSubmit={async (values) => {
        try {
          const result = await apolloClient.mutate<{
            updateMusicFileStats: { trackName: string };
          }>({
            mutation: UPDATE_MUSIC_FILE_STATS_MUTATION,
            variables: {
              fileId,
              playCount: values.playCount,
              lastPlayed: values.lastPlayed ?? null,
            },
          });
          if (result.data?.updateMusicFileStats?.trackName) {
            snackbar.enqueueSnackbar(
              `Stats of “${result.data?.updateMusicFileStats?.trackName}” is successfully updated.`,
              { variant: "success" }
            );
            await refresh();
          }
        } catch (e) {
          console.error("Error occurred while updating stats.", e);
          snackbar.enqueueSnackbar(
            `Error occurred while updating stats: ${e}`,
            {
              variant: "error",
            }
          );
        }
      }}
    >
      {({ handleSubmit, submitting }) => (
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="playCount"
                label="Play Count"
                type="number"
                fullWidth
                disabled={submitting}
                variant="outlined"
              />
            </Grid>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid item xs={12}>
                <DateTimePicker
                  name="lastPlayed"
                  label="Last Played"
                  disabled={submitting}
                  ampm={false}
                  inputFormat="YYYY-MM-DD HH:mm:ss"
                />
              </Grid>
            </LocalizationProvider>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="outlined"
                color="secondary"
                disabled={submitting}
              >
                Update
              </Button>
            </Grid>
          </Grid>
        </form>
      )}
    </Form>
  );
}

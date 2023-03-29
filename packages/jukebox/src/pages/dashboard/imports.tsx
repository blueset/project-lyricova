import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  LinearProgressProps,
  Typography,
} from "@mui/material";
import { gql, useApolloClient, useMutation } from "@apollo/client";
import { useCallback } from "react";
import { MusicFilesScanOutcome } from "../../graphql/MusicFileResolver";
import { useNamedState } from "../../frontendUtils/hooks";
import { LyricsKitLyricsEntry } from "../../graphql/LyricsProvidersResolver";
import { useSnackbar } from "notistack";
import type { Artist } from "lyricova-common/models/Artist";

const ARTISTS_TO_IMPORT_QUERY = gql`
  query {
    artistsWithFilesNeedEnrol
  }
`;

export default function Imports() {
  const [importing, setImporting] = useNamedState(false, "importing");
  const [artistImportOutcomes, setArtistImportOutcomes] = useNamedState<Artist[]>([], "importing");
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  return (
    <Box p={2}>
      <Typography variant="h4" component="h2">
        Batch imports from VocaDB
      </Typography>
      <Box textAlign="center">
        <Button
          variant="contained"
          color="secondary"
          onClick={async () => {
            setImporting(true);
            const data = await apolloClient.query<{
              artistsWithFilesNeedEnrol: number[];
            }>({
              query: ARTISTS_TO_IMPORT_QUERY,
            });
            if (data.error) {
              snackbar.enqueueSnackbar(`Error: ${data.error}`, { variant: "error" });
              setImporting(false);
              return;
            }
            const artists = data.data.artistsWithFilesNeedEnrol;
            if (artists.length === 0) {
              snackbar.enqueueSnackbar("No artist to import.", { variant: "info" });
              setImporting(false);
              return;
            }
            const importMutation = gql`
              mutation importArtist {
                ${artists.map((a, idx) => `import${idx}: enrolArtistFromVocaDB(artistId: ${a}) { id\n name }`).join("\n")}
              }
            `;
            try {
              const importData = await apolloClient.mutate<{ [key: string]: Artist }>({
                mutation: importMutation,
              });
              snackbar.enqueueSnackbar(`Imported ${artists.length} artists`, { variant: "success" });
              setArtistImportOutcomes(Object.values(importData.data));
            } catch (e) {
              snackbar.enqueueSnackbar(`Error: ${e}`, { variant: "error" });
            }
            setImporting(false);
          }}
          disabled={importing}
        >
          Import imcomplete artist entries
        </Button>
      </Box>
      {artistImportOutcomes.length > 0 && (<>
        <Typography>Imported artists</Typography>
        <ul>{artistImportOutcomes.map(a => <li key={a.id}>{a.id}: {a.name}</li>)}</ul>
      </>)}
    </Box>
  );
}

Imports.layout = getLayout("Imports");

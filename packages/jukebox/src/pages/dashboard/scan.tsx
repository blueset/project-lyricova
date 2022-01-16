import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import { Box, Button, CircularProgress, LinearProgress, LinearProgressProps, Typography } from "@mui/material";
import { gql, useApolloClient, useMutation } from "@apollo/client";
import { useCallback } from "react";
import { MusicFilesScanOutcome } from "../../graphql/MusicFileResolver";
import { useNamedState } from "../../frontendUtils/hooks";
import { LyricsKitLyricsEntry } from "../../graphql/LyricsProvidersResolver";

const SCAN_MUTATION = gql`
  mutation($sessionId: String!) {
    scan(sessionId: $sessionId) {
      added
      deleted
      updated
      unchanged
    }
  }
`;


const SCAN_PROGRESS_SUBSCRIPTION = gql`
  subscription ($sessionId: String!) {
    scanProgress( sessionId: $sessionId) {
      total
      added
      deleted
      updated
      unchanged
    }
  }
`;

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={35}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(
          props.value,
        )}%`}</Typography>
      </Box>
    </Box>
  );
}

export default function Scan() {
  const [scan, scanResult] = useMutation<{ scan: MusicFilesScanOutcome }>(SCAN_MUTATION);
  const [progress, setProgress] = useNamedState(0, "progress");
  const [scanning, setScanning] = useNamedState(false, "scanning");
  const apolloClient = useApolloClient();

  const clickScan = useCallback(async () => {
    setScanning(true);
    const sessionId = `${Math.random()}`;
    const scanPromise = scan({ variables: { sessionId } });
    setProgress(0);

    const subscription = apolloClient.subscribe<{ scanProgress: MusicFilesScanOutcome }>({
      query: SCAN_PROGRESS_SUBSCRIPTION,
      variables: { sessionId }
    });
    const zenSubscription = subscription.subscribe({
      next(x) {
        if (x.data.scanProgress !== null) {
          const { total, added, deleted, updated, unchanged } = x.data.scanProgress;
          if (total > 0) {
            setProgress((added + deleted + updated + unchanged) / total * 100);
          }
        }
      },
      error(err) {
        console.log(`Finished with error: ${err}`);
      },
      complete() {
        console.log("Finished");
      }
    });

    await scanPromise;
    zenSubscription.unsubscribe();

    setScanning(false);
  }, [apolloClient, scan, setProgress, setScanning]);

  let resultNode = <></>;
  if (scanResult.called) {
    if (scanResult.error) {
      resultNode = <div>Error occurred while scanning: {`${scanResult.error}`}</div>;
    } else if (scanResult.data) {
      const data = scanResult.data.scan;
      resultNode = <div>
        {data.added} tracks added;
        {data.deleted} tracks deleted;
        {data.updated} tracks updated;
        {data.unchanged} tracks unchanged;
      </div>;
    } else {
      resultNode = <LinearProgressWithLabel value={progress} />;
    }
  }

  return <Box p={2}>
    <Typography variant="h4" component="h2">Perform scan?</Typography>
    <Box textAlign="center">
      <Button variant="contained" color="secondary" onClick={clickScan} disabled={scanning}>Start scanning</Button>
    </Box>
    {resultNode}
  </Box>;
}

Scan.layout = getLayout("Scan for music files");

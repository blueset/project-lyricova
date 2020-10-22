import {getLayout} from "../../components/dashboard/layouts/DashboardLayout";
import {Box, Button, CircularProgress, Typography} from "@material-ui/core";
import {gql, useMutation} from "@apollo/client";
import {useCallback} from "react";
import {MusicFilesScanOutcome} from "../../graphql/MusicFileResolver";

const SCAN_MUTATION = gql`
  mutation {
    scan {
      added
      deleted
      updated
      unchanged
    }
  }
`;

export default function Scan() {
  const [scan, scanResult] = useMutation<{scan: MusicFilesScanOutcome}>(SCAN_MUTATION);

  const clickScan = useCallback(async () => {
    await scan();

  }, [scan]);

  var resultNode = <></>;
  if (scanResult.called) {
    if (scanResult.error) {
      resultNode = <div>Error occurred while scanning: {`${scanResult.error}`}</div>;
    } else if (scanResult.data) {
      const data = scanResult.data.scan;
      resultNode = <div>
        {data.added} tracks added;
        {data.deleted} tracks deleted;
        {data.updated} tracks updated;
        {data.unchanged} tracks removed;
      </div>;
    } else {
      resultNode = <CircularProgress />;
    }
  }

  return <Box p={2}>
    <Typography variant="h4" component="h2">Perform scan?</Typography>
    <Box textAlign="center">
      <Button variant="contained" color="secondary" onClick={clickScan}>Start scanning</Button>
    </Box>
    {resultNode}
  </Box>;
}

Scan.layout = getLayout("Scan for music files");

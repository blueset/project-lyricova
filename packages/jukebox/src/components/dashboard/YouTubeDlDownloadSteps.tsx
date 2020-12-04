import {
  Button,
  Chip,
  CircularProgress, FormControlLabel,
  Step,
  StepContent,
  StepLabel,
  Stepper, Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { ChangeEvent, Dispatch, FormEvent, ReactNode, SetStateAction, useCallback, useEffect } from "react";
import ButtonRow from "../ButtonRow";
import { useNamedState } from "../../frontendUtils/hooks";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import filesize from "filesize";
import { makeStyles } from "@material-ui/core/styles";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { NextComposedLink } from "../Link";
import { MxGetSearchResult } from "../../graphql/DownloadResolver";
import { useSnackbar } from "notistack";
import { swapExt } from "../../utils/path";

const YOUTUBE_DL_INFO_QUERY = gql`
  query($url: String!) {
    youtubeDlGetInfo(url: $url)
  }
`;

const YOUTUBE_DL_DOWNLOAD_MUTATION = gql`
  mutation($url: String!, $filename: String, $overwrite: Boolean) {
    youtubeDlDownloadAudio(url: $url, options: {filename: $filename, overwrite: $overwrite})
  }
`;

const SINGLE_FILE_SCAN_MUTATION = gql`
  mutation($path: String!) {
    scanByPath(path: $path) {
      id
    }
  }
`;

interface YouTubeDlInfo {
  fulltitle: string;
  _filename: string;
  uploader: string;
  thumbnail: string;
  _duration_raw: number;
  _duration_hms: string;
  formats: {
    format: string;
    filesize: number;
    format_note: string;
    ext: string;
    format_id: string;
    abr?: number;
    acodec: string;
  }[];
}

const useStyles = makeStyles((theme) => ({
  infoTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  infoThumbnail: {
    height: "4em",
    marginRight: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  infoChip: {
    margin: theme.spacing(0, 1, 1, 0),
  },
}));

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

export default function YouTubeDlDownloadSteps({ step, setStep, firstStep }: Props) {
  const styles = useStyles();
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const [videoURL, setVideoURL] = useNamedState("", "videoURL");
  const [filename, setFilename] = useNamedState("", "filename");
  const [overwrite, toggleOverwrite] = useNamedState(false, "overwrite");

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setVideoURL(event.target.value);
  }, [setVideoURL]);

  const handleFilename = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFilename(event.target.value);
  }, [setFilename]);

  const handleOverwrite = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    toggleOverwrite(event.target.checked);
  }, [toggleOverwrite]);

  const [fetchInfo, fetchInfoQuery] = useLazyQuery<{ youtubeDlGetInfo: YouTubeDlInfo }>(
    YOUTUBE_DL_INFO_QUERY,
    {
      onCompleted(data) {
        if (data?.youtubeDlGetInfo) {
          setFilename(swapExt(fetchInfoQuery.data.youtubeDlGetInfo._filename, "mp3"));
        }
      }
    }
  );
  const fetchInfoQueryData = fetchInfoQuery?.data?.youtubeDlGetInfo;
  const handleVerify = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    await fetchInfo({ variables: { url: videoURL } });
    setStep(v => v + 1);
    return false;
  }, [fetchInfo, videoURL, setStep, fetchInfoQuery.data?.youtubeDlGetInfo, setFilename]);

  /** Download state. Null = no result. >= 0, -1: Fail */
  const [downloadState, setDownloadState] = useNamedState<number | null>(null, "downloadState");

  const downloadFile = useCallback(async () => {
    setStep(v => v + 1);
    setDownloadState(null);

    try {
      const outcome = await apolloClient.mutate<{ youtubeDlDownloadAudio: string | null }>({
        mutation: YOUTUBE_DL_DOWNLOAD_MUTATION,
        variables: { url: videoURL, filename, overwrite }
      });

      const filePath = outcome.data.youtubeDlDownloadAudio;
      if (filePath === null) {
        snackbar.enqueueSnackbar(`Failed to download ${videoURL} as ${filename}`, { variant: "error" });
        setDownloadState(-1);
        return;
      }

      // Scan the file downloaded.
      const scanOutcome = await apolloClient.mutate<{ scanByPath: { id: number } }>({
        mutation: SINGLE_FILE_SCAN_MUTATION,
        variables: { path: filePath },
      });
      setDownloadState(scanOutcome.data.scanByPath.id);
      snackbar.enqueueSnackbar(
        `File downloaded with database ID ${scanOutcome.data.scanByPath.id} and path ${filePath}.`,
        {
          variant: "success",
          action: <Button color="default"
                          component={NextComposedLink}
                          href={`/dashboard/review/${downloadState}`}>
            Review file
          </Button>
        }
      );
    } catch (e) {
      console.error("Error occurred while downloading file", e);
      snackbar.enqueueSnackbar(`Error occurred while downloading file: ${e}`, { variant: "error" });
      setStep(v => v - 1);
    }
  }, [apolloClient, downloadState, filename, overwrite, setDownloadState, setStep, snackbar, videoURL]);


  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="youtube-dl-1">
        <StepLabel>{step <= 1 ? <>Download from <code>youtube-dl</code></> : <>Download
          from <code>{videoURL}</code></>}</StepLabel>
        <StepContent>
          <form onSubmit={handleVerify}>
            <TextField value={videoURL} label="URL" variant="outlined" fullWidth margin="normal"
                       onChange={handleChange} />
            <ButtonRow>
              <Button disabled={fetchInfoQuery.loading} variant="contained" color="secondary"
                      type="submit">Verify</Button>
              <Button disabled={fetchInfoQuery.loading} variant="outlined"
                      onClick={() => setStep(v => v - 1)}>Back</Button>
            </ButtonRow>
          </form>
        </StepContent>
      </Step>
      <Step key="youtube-dl-2">
        <StepLabel>Verify info</StepLabel>
        <StepContent>
          {
            fetchInfoQuery.loading ?
              <Alert severity="info">Loading...</Alert>
              : fetchInfoQuery.error ?
              <Alert severity="error">Error: {`${fetchInfoQuery.error}`}</Alert>
              : fetchInfoQueryData ?
                <div>
                  <div className={styles.infoTitle}>
                    <img src={fetchInfoQueryData.thumbnail} alt={fetchInfoQueryData.fulltitle}
                         className={styles.infoThumbnail} />
                    <div>
                      <Typography
                        variant="body1">{fetchInfoQueryData.fulltitle} ({fetchInfoQueryData._duration_hms})</Typography>
                      <Typography variant="body2" color="textSecondary">{fetchInfoQueryData.uploader}</Typography>
                    </div>
                  </div>
                  <Typography variant="body1"
                              gutterBottom>Filename (video): <code>{fetchInfoQueryData._filename}</code></Typography>
                  <div>
                    {fetchInfoQueryData.formats.filter(v => v.abr).map(v => {
                      let chiplabel = v.format;
                      if (v.abr) {
                        chiplabel = `${chiplabel}, ♪${v.abr}k@[${v.acodec || "Unknown codec"}]`;
                      }
                      chiplabel = `${chiplabel}, ${v.filesize ? filesize(v.filesize) : "Unknown size"}, ${v.ext}`;
                      return <Chip
                        key={v.format_id}
                        size="small"
                        className={styles.infoChip}
                        label={chiplabel} />;
                    })}
                  </div>
                </div>
                : "... how did you get there?"
          }
          <TextField
            value={filename} onChange={handleFilename}
            label="Filename" variant="outlined" fullWidth margin="normal" />
          <FormControlLabel
            control={
              <Switch
                checked={overwrite}
                onChange={handleOverwrite}
                color="secondary"
              />
            }
            label="Overwrite existing file with same name"
          />
          <ButtonRow>
            <Button variant="contained" color="secondary" onClick={downloadFile} disabled={!fetchInfoQuery.data}>Download</Button>
            <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="youtube-dl-3">
        <StepLabel>{step !== 3 ? "Download" : downloadState === null ? "Downloading..." : "Download outcome"}</StepLabel>
        <StepContent>
          {downloadState === null && <CircularProgress color="secondary" />}
          <ButtonRow>
            <Button disabled={downloadState === null || downloadState < 0} variant="contained" color="secondary"
                    startIcon={<OpenInNewIcon />}
                    component={NextComposedLink}
                    href={`/dashboard/review/${downloadState}`}
            >Review file</Button>
            <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
            <Button variant="outlined" onClick={() => setStep(0)}>Go to first step</Button>
          </ButtonRow>
        </StepContent>
      </Step>

    </Stepper>
  );
}
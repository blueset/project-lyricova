import {
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction} from "react";
import {
  useCallback,
} from "react";
import ButtonRow from "../ButtonRow";
import { useNamedState } from "../../frontendUtils/hooks";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import filesize from "filesize";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { NextComposedLink } from "lyricova-common/components/Link";
import { useSnackbar } from "notistack";
import { swapExt } from "../../utils/path";
import type { DocumentNode } from "graphql";

const YOUTUBE_DL_INFO_QUERY = gql`
  query($url: String!) {
    youtubeDlGetInfo(url: $url)
  }
` as DocumentNode;

const YOUTUBE_DL_DOWNLOAD_MUTATION = gql`
  mutation($url: String!, $filename: String, $overwrite: Boolean) {
    youtubeDlDownloadAudio(
      url: $url
      options: { filename: $filename, overwrite: $overwrite }
    )
  }
` as DocumentNode;

const SINGLE_FILE_SCAN_MUTATION = gql`
  mutation($path: String!) {
    scanByPath(path: $path) {
      id
    }
  }
` as DocumentNode;

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

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

export default function YouTubeDlDownloadSteps({
  step,
  setStep,
  firstStep,
}: Props) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const [videoURL, setVideoURL] = useNamedState("", "videoURL");
  const [filename, setFilename] = useNamedState("", "filename");
  const [overwrite, toggleOverwrite] = useNamedState(false, "overwrite");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setVideoURL(event.target.value);
    },
    [setVideoURL]
  );

  const handleFilename = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFilename(event.target.value);
    },
    [setFilename]
  );

  const handleOverwrite = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      toggleOverwrite(event.target.checked);
    },
    [toggleOverwrite]
  );

  const [fetchInfo, fetchInfoQuery] = useLazyQuery<{
    youtubeDlGetInfo: YouTubeDlInfo;
  }>(YOUTUBE_DL_INFO_QUERY, {
    onCompleted(data) {
      if (data?.youtubeDlGetInfo) {
        setFilename(
          swapExt(fetchInfoQuery.data.youtubeDlGetInfo._filename, "mp3")
        );
      }
    },
  });
  const fetchInfoQueryData = fetchInfoQuery?.data?.youtubeDlGetInfo;
  const handleVerify = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await fetchInfo({ variables: { url: videoURL } });
      setStep((v) => v + 1);
      return false;
    },
    [fetchInfo, videoURL, setStep]
  );

  /** Download state. Null = no result. >= 0, -1: Fail */
  const [downloadState, setDownloadState] = useNamedState<number | null>(
    null,
    "downloadState"
  );

  const downloadFile = useCallback(async () => {
    setStep((v) => v + 1);
    setDownloadState(null);

    try {
      const outcome = await apolloClient.mutate<{
        youtubeDlDownloadAudio: string | null;
      }>({
        mutation: YOUTUBE_DL_DOWNLOAD_MUTATION,
        variables: { url: videoURL, filename, overwrite },
      });

      const filePath = outcome.data.youtubeDlDownloadAudio;
      if (filePath === null) {
        snackbar.enqueueSnackbar(
          `Failed to download ${videoURL} as ${filename}`,
          { variant: "error" }
        );
        setDownloadState(-1);
        return;
      }

      // Scan the file downloaded.
      const scanOutcome = await apolloClient.mutate<{
        scanByPath: { id: number };
      }>({
        mutation: SINGLE_FILE_SCAN_MUTATION,
        variables: { path: filePath },
      });
      setDownloadState(scanOutcome.data.scanByPath.id);
      snackbar.enqueueSnackbar(
        `File downloaded with database ID ${scanOutcome.data.scanByPath.id} and path ${filePath}.`,
        {
          variant: "success",
          action: (
            <Button
              component={NextComposedLink}
              href={`/dashboard/review/${scanOutcome.data.scanByPath.id}`}
            >
              Review file
            </Button>
          ),
        }
      );
    } catch (e) {
      console.error("Error occurred while downloading file", e);
      snackbar.enqueueSnackbar(`Error occurred while downloading file: ${e}`, {
        variant: "error",
      });
      setStep((v) => v - 1);
    }
  }, [
    apolloClient,
    filename,
    overwrite,
    setDownloadState,
    setStep,
    snackbar,
    videoURL,
  ]);

  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="youtube-dl-1">
        <StepLabel>
          {step <= 1 ? (
            <>
              Download from <code>yt-dlp</code>
            </>
          ) : (
            <>
              Download from <code>{videoURL}</code>
            </>
          )}
        </StepLabel>
        <StepContent>
          <form onSubmit={handleVerify}>
            <TextField
              value={videoURL}
              label="URL"
              variant="outlined"
              fullWidth
              margin="normal"
              onChange={handleChange}
            />
            <ButtonRow>
              <Button
                disabled={fetchInfoQuery.loading}
                variant="contained"
                color="secondary"
                type="submit"
              >
                Verify
              </Button>
              <Button
                disabled={fetchInfoQuery.loading}
                variant="outlined"
                onClick={() => setStep((v) => v - 1)}
              >
                Back
              </Button>
            </ButtonRow>
          </form>
        </StepContent>
      </Step>
      <Step key="youtube-dl-2">
        <StepLabel>Verify info</StepLabel>
        <StepContent>
          {fetchInfoQuery.loading ? (
            <Alert severity="info">Loading...</Alert>
          ) : fetchInfoQuery.error ? (
            <Alert severity="error">Error: {`${fetchInfoQuery.error}`}</Alert>
          ) : fetchInfoQueryData ? (
            <div>
              <Stack direction="row" alignItems="center">
                <img
                  src={fetchInfoQueryData.thumbnail}
                  alt={fetchInfoQueryData.fulltitle}
                  style={{ height: "4em", marginRight: 4, borderRadius: 4 }}
                />
                <div>
                  <Typography variant="body1">
                    {fetchInfoQueryData.fulltitle} (
                    {fetchInfoQueryData._duration_hms})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {fetchInfoQueryData.uploader}
                  </Typography>
                </div>
              </Stack>
              <Typography variant="body1" gutterBottom>
                Filename (video): <code>{fetchInfoQueryData._filename}</code>
              </Typography>
              <div>
                {fetchInfoQueryData.formats
                  .filter((v) => v.abr)
                  .map((v) => {
                    let chiplabel = v.format;
                    if (v.abr) {
                      chiplabel = `${chiplabel}, ♪${v.abr}k@[${v.acodec ||
                        "Unknown codec"}]`;
                    }
                    chiplabel = `${chiplabel}, ${
                      v.filesize ? filesize(v.filesize) : "Unknown size"
                    }, ${v.ext}`;
                    return (
                      <Chip
                        key={v.format_id}
                        size="small"
                        sx={{ marginRight: 1, marginBottom: 1 }}
                        label={chiplabel}
                      />
                    );
                  })}
              </div>
            </div>
          ) : (
            "... how did you get there?"
          )}
          <TextField
            value={filename}
            onChange={handleFilename}
            label="Filename"
            variant="outlined"
            fullWidth
            margin="normal"
          />
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
            <Button
              variant="contained"
              color="secondary"
              onClick={downloadFile}
              disabled={!fetchInfoQuery.data}
            >
              Download
            </Button>
            <Button variant="outlined" onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="youtube-dl-3">
        <StepLabel>
          {step !== 3
            ? "Download"
            : downloadState === null
            ? "Downloading..."
            : "Download outcome"}
        </StepLabel>
        <StepContent>
          {downloadState === null && <CircularProgress color="secondary" />}
          <ButtonRow>
            <Button
              disabled={downloadState === null || downloadState < 0}
              variant="contained"
              color="secondary"
              startIcon={<OpenInNewIcon />}
              component={NextComposedLink}
              href={`/dashboard/review/${downloadState}`}
            >
              Review file
            </Button>
            <Button variant="outlined" onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
            <Button variant="outlined" onClick={() => setStep(0)}>
              Go to first step
            </Button>
          </ButtonRow>
        </StepContent>
      </Step>
    </Stepper>
  );
}

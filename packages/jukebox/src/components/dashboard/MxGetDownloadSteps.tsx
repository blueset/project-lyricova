import {
  Avatar,
  Badge,
  Button,
  Chip, CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Theme,
  Typography
} from "@material-ui/core";
import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useCallback } from "react";
import ButtonRow from "../ButtonRow";
import { useNamedState } from "../../frontendUtils/hooks";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import { MxGetSearchResult } from "../../graphql/DownloadResolver";
import { Alert } from "@material-ui/lab";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import { blue, lightBlue, lightGreen, orange, pink, red, yellow } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import GetAppIcon from "@material-ui/icons/GetApp";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { NextComposedLink } from "../Link";
import parse from "autosuggest-highlight/parse";
import match from "autosuggest-highlight/match";
import { useSnackbar } from "notistack";

const MUSIC_DL_SEARCH_QUERY = gql`
  query($query: String!) {
    mxGetSearch(query: $query) {
      id
      source
      name
      artist
      album
      pic_url
      listen_url
      lyric
    }
  }
`;

const MUSIC_DL_DOWNLOAD_MUTATION = gql`
  mutation($source: String!, $id: ID!) {
    mxGetDownload(id: $id, source: $source)
  }
`;

const SINGLE_FILE_SCAN_MUTATION = gql`
  mutation($path: String!) {
    scanByPath(path: $path) {
      id
    }
  }
`;

function HighlightedText({ text, query, fallback }: { text: string, query: string, fallback: string }) {
  if (!text) return <em>{fallback}</em>;
  const matches = match(text, query);
  const parts = parse(text, matches);
  if (parts.length < 1) return <></>;
  return <>{parts.map((v, idx) =>
    v.highlight ? <mark key={idx}>{v.text}</mark> : <span key={idx}>{v.text}</span>
  )}</>;
}

function CheckURLChip({ url, className, label }: { label: string, className?: string, url: string | null }) {
  return url
    ? <Chip size="small" className={className} variant="default" color="secondary" icon={<CheckIcon />}
            label={label} clickable={true} component={NextComposedLink} target="_blank" href={url} />
    : <Chip size="small" className={className} variant="outlined" color="default" icon={<ClearIcon />}
            label={label} />;
}

function getBackgroundColor(key: string, theme: Theme): string {
  switch (key) {
    case "ne":
      return red[900];
    case "qq":
      return lightGreen[600];
    case "kg":
      return lightBlue[900];
    case "kw":
      return yellow[600];
    case "xi":
      return orange[900];
    case "qi":
      return blue[900];
    case "mi":
      return pink[900];
    default:
      return theme.palette.secondary.dark;
  }
}

const useBadgeStyles = makeStyles<Theme, { key: string }>((theme) => ({
  root: {
    width: 22,
    height: 22,
    fontSize: 10,
    background: props => getBackgroundColor(props.key, theme),
    color: theme.palette.common.white,
    border: `1px solid ${theme.palette.background.paper}`,
    textTransform: "capitalize",
  },
}));

function BadgeAvatar({ children }: { children: unknown }) {
  const name = `${children || "??"}`;
  const truncated =
    name === "kugou" ? "kg" :
      name === "kuwo" ? "kw" :
        name.substring(0, 2);
  const styles = useBadgeStyles({ key: truncated });
  return <Avatar className={styles.root}>{truncated}</Avatar>;
}

const useStyles = makeStyles((theme) => ({
  chip: {
    marginRight: theme.spacing(1),
  },
  buttonRow: {
    margin: 0,
    padding: theme.spacing(1, 0),
    position: "sticky",
    bottom: 0,
    background: theme.palette.background.paper,
    zIndex: 1,
  }
}));

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

dayjs.extend(utc);

export default function MxGetDownloadSteps({ step, setStep, firstStep }: Props) {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");
  const styles = useStyles();
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  }, [setSearchKeyword]);

  const [searchMusic, searchMusicQuery] = useLazyQuery<{ mxGetSearch: MxGetSearchResult[] }>(MUSIC_DL_SEARCH_QUERY);
  const handleSearch = useCallback(async () => {
    await searchMusic({ variables: { query: searchKeyword } });
    setStep(v => v + 1);
  }, [searchKeyword, searchMusic, setStep]);

  /** Download state. Null = no result. >= 0, -1: Fail */
  const [downloadState, setDownloadState] = useNamedState<number | null>(null, "downloadState");

  const downloadFile = useCallback((file: MxGetSearchResult) => async () => {
    setStep(v => v + 1);
    setDownloadState(null);

    try {
      const outcome = await apolloClient.mutate<{ mxGetDownload: string | null }>({
        mutation: MUSIC_DL_DOWNLOAD_MUTATION,
        variables: { id: file.id, source: file.source }
      });

      const filePath = outcome.data.mxGetDownload;
      if (filePath === null) {
        snackbar.enqueueSnackbar(`Failed to download ${file.name} (${file.id}) form ${file.source}`, { variant: "error" });
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
    }
  }, [apolloClient, setDownloadState, setStep, snackbar]);

  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="mxget-1">
        <StepLabel>{step <= 1 ? <>Search via <code>MxGet</code></> : `Search for ${searchKeyword}`}</StepLabel>
        <StepContent>
          <TextField value={searchKeyword} label="Search keywords" variant="outlined" fullWidth margin="normal"
                     onChange={handleChange} />
          <ButtonRow>
            <Button disabled={searchMusicQuery.loading} variant="contained" color="secondary"
                    onClick={handleSearch}>Search</Button>
            <Button disabled={searchMusicQuery.loading} variant="outlined"
                    onClick={() => setStep(v => v - 1)}>Back</Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="mxget-2">
        <StepLabel>Search via <code>MxGet</code></StepLabel>
        <StepContent>
          {searchMusicQuery.data && <List>{
            [...searchMusicQuery.data.mxGetSearch]
              .sort((a, b) => {
                const aq = `${a.name}${a.artist}${a.album}`;
                const bq = `${b.name}${b.artist}${b.album}`;
                const ac = match(aq, searchKeyword).length, bc = match(bq, searchKeyword).length;
                return bc - ac;
              })
              .map((v, idx) => (
                <ListItem key={idx} alignItems="flex-start">
                  <ListItemAvatar>
                    <Badge overlap="rectangle" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                           badgeContent={<BadgeAvatar>{v.source}</BadgeAvatar>}>
                      <Avatar src={v.pic_url} variant="rounded"><MusicNoteIcon /></Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText disableTypography>
                    <Typography variant="body1" component="span" display="block">
                      <HighlightedText text={v.name} query={searchKeyword} fallback="No title" />
                      <small>(<code>{v.id}</code>)</small>
                    </Typography>
                    <Typography variant="body2" component="span" display="block" color="textSecondary">
                      <HighlightedText text={v.artist} query={searchKeyword}
                                       fallback="Various artists" /> / <HighlightedText text={v.album}
                                                                                        query={searchKeyword}
                                                                                        fallback="Unknown artists" />
                    </Typography>
                    <Typography variant="body2" component="span" display="block" color="textSecondary">
                      <CheckURLChip label="Preview" url={v.listen_url} className={styles.chip} />
                      <CheckURLChip label="Cover art" url={v.pic_url} className={styles.chip} />
                      <CheckURLChip label="Lyrics"
                                    url={v.lyric ? `data:text/plain,${encodeURIComponent(v.lyric)}` : null}
                                    className={styles.chip} />
                    </Typography>
                  </ListItemText>
                  <ListItemSecondaryAction>
                    <IconButton onClick={downloadFile(v)}>
                      <GetAppIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}</List>}
          {searchMusicQuery.loading && <Alert severity="info">Loading...</Alert>}
          <ButtonRow className={styles.buttonRow}>
            <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="mxget-3">
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

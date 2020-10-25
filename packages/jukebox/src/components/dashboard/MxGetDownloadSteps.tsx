import {
  Avatar,
  Badge,
  Button,
  Chip,
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
import { gql, useLazyQuery } from "@apollo/client";
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
import { NextComposedLink } from "../Link";
import parse from "autosuggest-highlight/parse";
import match from "autosuggest-highlight/match";

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

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  }, [setSearchKeyword]);

  const [searchMusic, searchMusicQuery] = useLazyQuery<{ mxGetSearch: MxGetSearchResult[] }>(MUSIC_DL_SEARCH_QUERY);
  const handleSearch = useCallback(async () => {
    await searchMusic({ variables: { query: searchKeyword } });
    setStep(v => v + 1);
  }, [searchKeyword, searchMusic, setStep]);

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
          {searchMusicQuery.data && <List>{searchMusicQuery.data.mxGetSearch.map((v, idx) => (
            <ListItem key={idx} alignItems="flex-start">
              <ListItemAvatar>
                <Badge overlap="rectangle" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                       badgeContent={<BadgeAvatar>{v.source}</BadgeAvatar>}>
                  <Avatar src={v.pic_url} variant="rounded"><MusicNoteIcon /></Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText disableTypography>
                <Typography variant="body1" component="span" display="block">
                  <HighlightedText text={v.name} query={searchKeyword} fallback="No title" /> <small>(<code>{v.id}</code>)</small>
                </Typography>
                <Typography variant="body2" component="span" display="block" color="textSecondary">
                  <HighlightedText text={v.artist} query={searchKeyword} fallback="Various artists" /> / <HighlightedText text={v.album} query={searchKeyword} fallback="Unknown artists" />
                </Typography>
                <Typography variant="body2" component="span" display="block" color="textSecondary">
                  <CheckURLChip label="Preview" url={v.listen_url} className={styles.chip} />
                  <CheckURLChip label="Cover art" url={v.pic_url} className={styles.chip} />
                  <CheckURLChip label="Lyrics" url={v.lyric ? `data:text/plain,${encodeURIComponent(v.lyric)}` : null}
                                className={styles.chip} />
                </Typography>
              </ListItemText>
              <ListItemSecondaryAction><IconButton><GetAppIcon /></IconButton></ListItemSecondaryAction>
            </ListItem>
          ))}</List>}
          {searchMusicQuery.loading && <Alert severity="info">Loading...</Alert>}
          <ButtonRow>
            <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="mxget-3">
        <StepLabel>Downloading...</StepLabel>
        <StepContent>
        </StepContent>
      </Step>
    </Stepper>
  );
}

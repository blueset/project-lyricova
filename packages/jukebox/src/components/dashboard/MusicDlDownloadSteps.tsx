import {
  Avatar,
  Badge,
  Button, Chip, IconButton,
  List,
  ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField, Theme,
  Typography
} from "@material-ui/core";
import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useCallback } from "react";
import ButtonRow from "../ButtonRow";
import { useNamedState } from "../../frontendUtils/hooks";
import { gql, useLazyQuery } from "@apollo/client";
import { MusicDlSearchResult } from "../../graphql/DownloadResolver";
import { Alert } from "@material-ui/lab";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import { blue, blueGrey, lightBlue, lightGreen, orange, pink, purple, red } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import GetAppIcon from "@material-ui/icons/GetApp";

const MUSIC_DL_SEARCH_QUERY = gql`
  query($query: String!) {
    musicDlSearch(query: $query) {
      album
      artists
      coverURL
      duration
      lyricsURL
      pickle
      size
      songURL
      source
      title
    }
  }
`;

function CheckURLChip({ url, className, label }: { label: string, className?: string, url: string | null }) {
  return url
    ? <Chip size="small" className={className} variant="default" color="secondary" icon={<CheckIcon />}
            label={label} clickable={true} component="a" target="_blank" href={url} />
    : <Chip size="small" className={className} variant="outlined" color="default" icon={<ClearIcon />}
            label={label} />;
}

function getBackgroundColor(key: string, theme: Theme): string {
  switch (key) {
    case "ne":
    case "16":
      return red[900];
    case "qq":
      return lightGreen[600];
    case "ku":
      return lightBlue[900];
    case "ba":
      return blue[900];
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
  const truncated = `${children || "??"}`.substring(0, 2);
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

export default function MusicDlDownloadSteps({ step, setStep, firstStep }: Props) {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");
  const styles = useStyles();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  }, [setSearchKeyword]);

  const [searchMusic, searchMusicQuery] = useLazyQuery<{ musicDlSearch: MusicDlSearchResult[] }>(MUSIC_DL_SEARCH_QUERY);
  const handleSearch = useCallback(async () => {
    await searchMusic({ variables: { query: searchKeyword } });
    setStep(v => v + 1);
  }, [searchKeyword, searchMusic, setStep]);

  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="music-dl-1">
        <StepLabel>{step <= 1 ? <>Search via <code>music-dl</code></> : `Search for ${searchKeyword}`}</StepLabel>
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
      <Step key="music-dl-2">
        <StepLabel>Search via <code>music-dl</code></StepLabel>
        <StepContent>
          {searchMusicQuery.data && <List>{searchMusicQuery.data.musicDlSearch.map((v, idx) => (
            <ListItem key={idx} alignItems="flex-start">
              <ListItemAvatar>
                <Badge overlap="rectangle" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                       badgeContent={<BadgeAvatar>{v.source}</BadgeAvatar>}>
                  <Avatar src={v.coverURL} variant="rounded"><MusicNoteIcon /></Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText disableTypography>
                <Typography variant="body1" component="span" display="block">{v.title || <em>No title</em>}</Typography>
                <Typography variant="body2" component="span" display="block" color="textSecondary">{v.artists ||
                <em>Various artists</em>} / {v.album || <em>Unknown album</em>}</Typography>
                <Typography variant="body2" component="span" display="block" color="textSecondary">
                  <CheckURLChip label="Preview" url={v.songURL} className={styles.chip} />
                  <CheckURLChip label="Cover art" url={v.coverURL} className={styles.chip} />
                  <CheckURLChip label="Lyrics" url={v.lyricsURL} className={styles.chip} />
                  <Chip size="small" className={styles.chip} variant="outlined" color="default"
                        label={`Duration: ${dayjs.utc(v.duration * 1000).format("HH:mm:ss")}`} />
                  <Chip size="small" className={styles.chip} variant="outlined" color="default"
                        label={`Size: ${(v.size / 1048576).toFixed(2)} MB`} />
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
    </Stepper>
  );
}

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
  Typography,
} from "@mui/material";
import {
  ChangeEvent,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
} from "react";
import ButtonRow from "../ButtonRow";
import { useNamedState } from "../../frontendUtils/hooks";
import { gql, useLazyQuery } from "@apollo/client";
import { MusicDlSearchResult } from "../../graphql/DownloadResolver";
import Alert from "@mui/material/Alert";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { blue, lightBlue, lightGreen, red } from "@mui/material/colors";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import GetAppIcon from "@mui/icons-material/GetApp";
import { DocumentNode } from "graphql";
import { SxProps } from "@mui/system";

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
` as DocumentNode;

function CheckURLChip({
  url,
  className,
  label,
  sx,
}: {
  label: string;
  className?: string;
  url: string | null;
  sx?: SxProps<Theme>;
}) {
  return url ? (
    <Chip
      size="small"
      className={className}
      color="secondary"
      icon={<CheckIcon />}
      label={label}
      clickable={true}
      component="a"
      target="_blank"
      href={url}
      sx={sx}
    />
  ) : (
    <Chip
      size="small"
      className={className}
      variant="outlined"
      color="default"
      icon={<ClearIcon />}
      label={label}
      sx={sx}
    />
  );
}

function getBackgroundColor(key: string): string {
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
      return "secondary.dark";
  }
}

function BadgeAvatar({ children }: { children: unknown }) {
  const truncated = `${children || "??"}`.substring(0, 2);
  return (
    <Avatar
      sx={{
        width: 22,
        height: 22,
        fontSize: 10,
        background: getBackgroundColor(truncated),
        color: "white",
        border: 1,
        borderColor: "background.paper",
        textTransform: "capitalize",
      }}
    >
      {truncated}
    </Avatar>
  );
}

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

dayjs.extend(utc);

export default function MusicDlDownloadSteps({
  step,
  setStep,
  firstStep,
}: Props) {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
    },
    [setSearchKeyword]
  );

  const [searchMusic, searchMusicQuery] = useLazyQuery<{
    musicDlSearch: MusicDlSearchResult[];
  }>(MUSIC_DL_SEARCH_QUERY);
  const handleSearch = useCallback(async () => {
    await searchMusic({ variables: { query: searchKeyword } });
    setStep((v) => v + 1);
  }, [searchKeyword, searchMusic, setStep]);

  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="music-dl-1">
        <StepLabel>
          {step <= 1 ? (
            <>
              Search via <code>music-dl</code>
            </>
          ) : (
            `Search for ${searchKeyword}`
          )}
        </StepLabel>
        <StepContent>
          <TextField
            value={searchKeyword}
            label="Search keywords"
            variant="outlined"
            fullWidth
            margin="normal"
            onChange={handleChange}
          />
          <ButtonRow>
            <Button
              disabled={searchMusicQuery.loading}
              variant="contained"
              color="secondary"
              onClick={handleSearch}
            >
              Search
            </Button>
            <Button
              disabled={searchMusicQuery.loading}
              variant="outlined"
              onClick={() => setStep((v) => v - 1)}
            >
              Back
            </Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="music-dl-2">
        <StepLabel>
          Search via <code>music-dl</code>
        </StepLabel>
        <StepContent>
          {searchMusicQuery.data && (
            <List>
              {searchMusicQuery.data.musicDlSearch.map((v, idx) => (
                <ListItem key={idx} alignItems="flex-start">
                  <ListItemAvatar>
                    <Badge
                      overlap="rectangular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={<BadgeAvatar>{v.source}</BadgeAvatar>}
                    >
                      <Avatar src={v.coverURL} variant="rounded">
                        <MusicNoteIcon />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText disableTypography>
                    <Typography
                      variant="body1"
                      component="span"
                      display="block"
                    >
                      {v.title || <em>No title</em>}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      display="block"
                      color="textSecondary"
                    >
                      {v.artists || <em>Various artists</em>} /{" "}
                      {v.album || <em>Unknown album</em>}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      display="block"
                      color="textSecondary"
                    >
                      <CheckURLChip
                        label="Preview"
                        url={v.songURL}
                        sx={{ mr: 1 }}
                      />
                      <CheckURLChip
                        label="Cover art"
                        url={v.coverURL}
                        sx={{ mr: 1 }}
                      />
                      <CheckURLChip
                        label="Lyrics"
                        url={v.lyricsURL}
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        size="small"
                        sx={{ mr: 1 }}
                        variant="outlined"
                        color="default"
                        label={`Duration: ${dayjs
                          .utc(v.duration * 1000)
                          .format("HH:mm:ss")}`}
                      />
                      <Chip
                        size="small"
                        sx={{ mr: 1 }}
                        variant="outlined"
                        color="default"
                        label={`Size: ${(v.size / 1048576).toFixed(2)} MB`}
                      />
                    </Typography>
                  </ListItemText>
                  <ListItemSecondaryAction>
                    <IconButton>
                      <GetAppIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
          {searchMusicQuery.loading && (
            <Alert severity="info">Loading...</Alert>
          )}
          <ButtonRow>
            <Button variant="outlined" onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
          </ButtonRow>
        </StepContent>
      </Step>
    </Stepper>
  );
}

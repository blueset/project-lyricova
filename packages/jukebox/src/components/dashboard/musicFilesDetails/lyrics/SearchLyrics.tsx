import { Form } from "react-final-form";
import {
  Avatar,
  Badge,
  Button, Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar, ListItemSecondaryAction, ListItemText, Theme, Typography,
} from "@material-ui/core";
import { TextField } from "mui-rff";
import { makeStyles } from "@material-ui/core/styles";
import { gql, useApolloClient } from "@apollo/client";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { LyricsKitLyricsEntry } from "../../../../graphql/LyricsProvidersResolver";
import { useSnackbar } from "notistack";
import clsx from "clsx";
import {
  red,
  lightBlue,
  orange,
  pink,
  blueGrey,
  blue,
  purple, lightGreen
} from "@material-ui/core/colors";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";
import ContentCopyIcon from "@material-ui/icons/ContentCopy";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import { lyricsAnalysis, LyricsAnalysisResult } from "../../../../utils/lyricsCheck";
import { Lyrics } from "lyrics-kit";
import { useCallback, useEffect, useMemo } from "react";
import TooltipIconButton from "../../TooltipIconButton";


const SEARCH_LYRICS_QUERY = gql`
  query($title: String!, $artists: String!, $duration: Float) {
    lyricsKitSearch(title: $title, artists: $artists, options: {
      duration: $duration,
      useLRCX: true,
    }) {
      lyrics
      quality
      isMatched
      metadata
      tags
    }
  }
`;

const useAnalysisStyle = makeStyles((theme) => ({
  chip: {
    marginRight: theme.spacing(1),
  },
}));

function InlineAnalysisResult({ result, duration, length }: { result?: LyricsAnalysisResult, duration: number, length?: number }) {
  const styles = useAnalysisStyle();

  const lengthChip = !length
    ? <Chip size="small" variant="outlined" color="default" label="?? seconds" className={styles.chip} />
    : Math.abs(length - duration) < 3
      ? <Chip size="small" variant="default" color="secondary" label={`${length} seconds`} className={styles.chip} />
      : <Chip size="small" variant="outlined" color="primary" label={`${length} seconds`} className={styles.chip} />;

  if (result) {
    const translation = result.hasTranslation
      ? <Chip size="small" className={styles.chip} variant="default" color="secondary" icon={<CheckIcon />}
              label="Translation" />
      : <Chip size="small" className={styles.chip} variant="outlined" color="default" icon={<ClearIcon />}
              label="Translation" />;
    const inlineTimeTags = result.hasInlineTimeTags
      ? <Chip size="small" className={styles.chip} variant="default" color="secondary" icon={<CheckIcon />}
              label="Inline time tags" />
      : <Chip size="small" className={styles.chip} variant="outlined" color="default" icon={<ClearIcon />}
              label="Inline time tags" />;
    const furigana = result.hasFurigana
      ? <Chip size="small" className={styles.chip} variant="default" color="secondary" icon={<CheckIcon />}
              label="Furigana" />
      : <Chip size="small" className={styles.chip} variant="outlined" color="default" icon={<ClearIcon />}
              label="Furigana" />;
    const simplifiedJapanese = result.hasSimplifiedJapanese
      ? <Chip size="small" className={styles.chip} variant="default" color="primary" icon={<CheckIcon />}
              label="Simplified Japanese" />
      : <Chip size="small" className={styles.chip} variant="outlined" color="secondary" icon={<ClearIcon />}
              label="Simplified Japanese" />;
    const lastTimesamp = result.lastTimestamp < duration
      ? <Chip size="small" variant="outlined" color="secondary" label={`Last line: ${result.lastTimestamp} seconds`} />
      : <Chip size="small" variant="outlined" color="primary" label={`Last line: ${result.lastTimestamp} seconds`} />;

    return <>
      {lengthChip}{translation}{inlineTimeTags}{furigana}{simplifiedJapanese}{lastTimesamp}
    </>;
  } else {
    return <>{lengthChip}<Chip size="small" variant="default" color="primary" icon={<ClearIcon />}
                               label="Parse failed" /></>;
  }
}

function getBackgroundColor(key: string, theme: Theme): string {
  switch (key) {
    case "Ne":
      return red[900];
    case "QQ":
      return lightGreen[600];
    case "Ku":
      return lightBlue[900];
    case "Xi":
      return orange[900];
    case "Ge":
      return pink[900];
    case "Vi":
      return blueGrey[600];
    case "Sy":
      return blue[900];
    case "Ma":
      return purple[600];
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
  },
}));

function BadgeAvatar({ children }: { children: unknown }) {
  const truncated = `${children || "??"}`.substring(0, 2);
  const styles = useBadgeStyles({ key: truncated });
  return <Avatar className={styles.root}>{truncated}</Avatar>;
}

const useStyles = makeStyles((theme) => ({
  form: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  textField: {
    marginRight: theme.spacing(1),
  },
  durationField: {
    flexBasis: "25em",
  },
  secondaryAction: {
    paddingRight: 104,
  },
}));

interface FormValues {
  title: string;
  artists?: string;
  duration: number;
}

interface Props extends FormValues {
}

export default function SearchLyrics({ title, artists, duration }: Props) {
  const styles = useStyles();

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const [searchResults, setSearchResults] = useNamedState<LyricsKitLyricsEntry[]>([], "searchResults");
  const parsedResults = useMemo(() => searchResults.map((v) => {
    try {
      const lyrics = new Lyrics(v.lyrics);
      const analysis = lyricsAnalysis(lyrics);
      return { lyrics, analysis };
    } catch {
      return null;
    }
  }), [searchResults]);

  const copyText = useCallback((text: string) => async () => {
    navigator.clipboard.writeText(text).then(function () {
      snackbar.enqueueSnackbar("Copied!", { variant: "success" });
    }, function (err) {
      console.error("Could not copy text: ", err);
      snackbar.enqueueSnackbar(`Failed to copy: ${err}`, { variant: "error" });
    });
  }, [snackbar]);

  return <>
    <Form<FormValues>
      initialValues={{ title, artists, duration, }}
      onSubmit={async (values) => {
        try {
          const result = await apolloClient.query<{ lyricsKitSearch: LyricsKitLyricsEntry[] }>({
            query: SEARCH_LYRICS_QUERY,
            variables: {
              ...values,
            },
          });
          if (result.data) {
            const results = [...result.data.lyricsKitSearch];
            results.sort((a, b) => b.quality - a.quality);
            setSearchResults(results);
          }
        } catch (e) {
          console.error(`Error while loading search result; ${e}`);
          snackbar.enqueueSnackbar(`Failed to load search results: ${e}`, { variant: "error" });
        }
      }}
    >
      {({ submitting, handleSubmit }) => (<form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          className={styles.textField}
          variant="outlined"
          required
          fullWidth
          margin="dense"
          name="title" type="text" label="Title"
        />
        <TextField
          className={styles.textField}
          variant="outlined"
          fullWidth
          margin="dense"
          name="artists" type="text" label="Artists"
        />
        <TextField
          className={clsx(styles.textField, styles.durationField)}
          variant="outlined"
          disabled
          margin="dense"
          InputProps={{ endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
          name="duration" type="number" label="Duration"
        />
        <Button
          variant="contained"
          color="secondary"
          type="submit"
          disabled={submitting}
        >
          Search
        </Button>
      </form>)}
    </Form>
    <List>
      {searchResults.map((v, idx) => <ListItem key={idx} alignItems="flex-start" classes={{
        secondaryAction: styles.secondaryAction
      }}>
        <ListItemAvatar>
          <Badge overlap="circle" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                 badgeContent={<BadgeAvatar>{v.metadata?.source}</BadgeAvatar>}>
            <Avatar src={v.metadata?.artworkURL}><MusicNoteIcon /></Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText disableTypography>
          <Typography variant="body1" component="span" display="block">{v.tags?.ti || <em>No title</em>}</Typography>
          <Typography variant="body2" component="span" display="block" color="textSecondary">{v.tags?.ar ||
          <em>Various artists</em>} / {v.tags?.al || <em>Unknown album</em>}</Typography>
          <Typography variant="body2" component="span" display="block" color="textSecondary"
                      noWrap>{v.lyrics.replace(/\n?\[[^\]]*?]/g, "¶").replace(/^¶+/g, "")}</Typography>
          <Typography variant="body2" component="span" display="block" color="textSecondary"><InlineAnalysisResult
            result={parsedResults[idx]?.analysis} duration={duration}
            length={v.tags?.length as number | undefined} /></Typography>
        </ListItemText>
        <ListItemSecondaryAction>
          <TooltipIconButton title="Copy lyrics" onClick={copyText(v.lyrics)}><ContentCopyIcon /></TooltipIconButton>
          <TooltipIconButton title="Copy cover URL" disabled={!(v.metadata?.artworkURL)} onClick={copyText(v.metadata?.artworkURL)}><FileCopyIcon /></TooltipIconButton>
        </ListItemSecondaryAction>
      </ListItem>)}
    </List>
  </>;
}
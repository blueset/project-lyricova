import { Form } from "react-final-form";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  styled,
  Typography,
} from "@mui/material";
import { TextField } from "mui-rff";
import { gql, useApolloClient } from "@apollo/client";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { LyricsKitLyricsEntry } from "../../../../graphql/LyricsProvidersResolver";
import { useSnackbar } from "notistack";
import {
  red,
  lightBlue,
  orange,
  pink,
  blueGrey,
  blue,
  purple,
  lightGreen,
} from "@mui/material/colors";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import {
  lyricsAnalysis,
  LyricsAnalysisResult,
} from "../../../../utils/lyricsCheck";
import { Lyrics } from "lyrics-kit";
import { useCallback, useMemo } from "react";
import TooltipIconButton from "../../TooltipIconButton";
import { DocumentNode } from "graphql";
import { Subscription } from "zen-observable-ts";

type TypographyChildren = React.ComponentProps<typeof Typography>["children"];

const SEARCH_LYRICS_QUERY = gql`
  query(
    $title: String!
    $artists: String!
    $duration: Float
    $sessionId: String
  ) {
    lyricsKitSearch(
      title: $title
      artists: $artists
      options: { duration: $duration, useLRCX: true }
      sessionId: $sessionId
    )
      @connection(
        key: "lyricsKitSearch"
        filter: ["title", "artists", "options"]
      ) {
      lyrics
      quality
      isMatched
      metadata
      tags
    }
  }
` as DocumentNode;

const SEARCH_LYRICS_PROGRESS_SUBSCRIPTION = gql`
  subscription($sessionId: String!) {
    lyricsKitSearchIncremental(sessionId: $sessionId) {
      lyrics
      quality
      isMatched
      metadata
      tags
    }
  }
` as DocumentNode;

const AnalysisChip = styled(Chip)({ marginRight: 1 });

function InlineAnalysisResult({
  result,
  duration,
  length,
}: {
  result?: LyricsAnalysisResult;
  duration: number;
  length?: number;
}) {
  const lengthChip = !length ? (
    <AnalysisChip
      size="small"
      variant="outlined"
      color="default"
      label="?? seconds"
    />
  ) : Math.abs(length - duration) < 3 ? (
    <AnalysisChip size="small" color="secondary" label={`${length} seconds`} />
  ) : (
    <AnalysisChip
      size="small"
      variant="outlined"
      color="primary"
      label={`${length} seconds`}
    />
  );

  if (result) {
    const translation = result.hasTranslation ? (
      <AnalysisChip
        size="small"
        color="secondary"
        icon={<CheckIcon />}
        label="Translation"
      />
    ) : (
      <AnalysisChip
        size="small"
        variant="outlined"
        color="default"
        icon={<ClearIcon />}
        label="Translation"
      />
    );
    const inlineTimeTags = result.hasInlineTimeTags ? (
      <AnalysisChip
        size="small"
        color="secondary"
        icon={<CheckIcon />}
        label="Inline time tags"
      />
    ) : (
      <AnalysisChip
        size="small"
        variant="outlined"
        color="default"
        icon={<ClearIcon />}
        label="Inline time tags"
      />
    );
    const furigana = result.hasFurigana ? (
      <AnalysisChip
        size="small"
        color="secondary"
        icon={<CheckIcon />}
        label="Furigana"
      />
    ) : (
      <AnalysisChip
        size="small"
        variant="outlined"
        color="default"
        icon={<ClearIcon />}
        label="Furigana"
      />
    );
    const simplifiedJapanese = result.hasSimplifiedJapanese ? (
      <AnalysisChip
        size="small"
        color="primary"
        icon={<CheckIcon />}
        label="Simplified Japanese"
      />
    ) : (
      <AnalysisChip
        size="small"
        variant="outlined"
        color="secondary"
        icon={<ClearIcon />}
        label="Simplified Japanese"
      />
    );
    const lastTimestamp =
      result.lastTimestamp < duration ? (
        <AnalysisChip
          size="small"
          variant="outlined"
          color="secondary"
          label={`Last line: ${result.lastTimestamp} seconds`}
        />
      ) : (
        <AnalysisChip
          size="small"
          variant="outlined"
          color="primary"
          label={`Last line: ${result.lastTimestamp} seconds`}
        />
      );

    return (
      <>
        {lengthChip}
        {translation}
        {inlineTimeTags}
        {furigana}
        {simplifiedJapanese}
        {lastTimestamp}
      </>
    );
  } else {
    return (
      <>
        {lengthChip}
        <AnalysisChip
          size="small"
          color="primary"
          icon={<ClearIcon />}
          label="Parse failed"
        />
      </>
    );
  }
}

function getBackgroundColor(key: string): string {
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
    case "Mu":
      return orange[900];
    case "Yo":
      return red[900];
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
      }}
    >
      {truncated}
    </Avatar>
  );
}

interface FormValues {
  title: string;
  artists?: string;
  duration: number;
}

export default function SearchLyrics({ title, artists, duration }: FormValues) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const [searchResults, setSearchResults] = useNamedState<
    LyricsKitLyricsEntry[]
  >([], "searchResults");
  const parsedResults = useMemo(
    () =>
      searchResults.map((v) => {
        try {
          const lyrics = new Lyrics(v.lyrics);
          const analysis = lyricsAnalysis(lyrics);
          return { lyrics, analysis };
        } catch {
          return null;
        }
      }),
    [searchResults]
  );

  const copyText = useCallback(
    (text: string) => async () => {
      navigator.clipboard.writeText(text).then(
        function() {
          snackbar.enqueueSnackbar("Copied!", { variant: "success" });
        },
        function(err) {
          console.error("Could not copy text: ", err);
          snackbar.enqueueSnackbar(`Failed to copy: ${err}`, {
            variant: "error",
          });
        }
      );
    },
    [snackbar]
  );

  return (
    <>
      <Form<FormValues>
        initialValues={{ title, artists, duration }}
        onSubmit={async (values) => {
          try {
            const sessionId = `${Math.random()}`;
            setSearchResults([]);

            const query = apolloClient.query<{
              lyricsKitSearch: LyricsKitLyricsEntry[];
            }>({
              query: SEARCH_LYRICS_QUERY,
              variables: {
                ...values,
                sessionId,
              },
            });

            const subscription = apolloClient.subscribe<{
              lyricsKitSearchIncremental: LyricsKitLyricsEntry;
            }>({
              query: SEARCH_LYRICS_PROGRESS_SUBSCRIPTION,
              variables: { sessionId },
            });
            const zenSubscription = subscription.subscribe({
              start(subscription: Subscription) {
                console.log("subscription started", subscription);
              },
              next(x) {
                console.log("subscription event", x);
                if (x.data.lyricsKitSearchIncremental !== null) {
                  setSearchResults((results) => {
                    const arr = [...results, x.data.lyricsKitSearchIncremental];
                    arr.sort((a, b) => b.quality - a.quality);
                    return arr;
                  });
                }
              },
              error(err) {
                console.log(`Finished with error: ${err}`);
              },
              complete() {
                console.log("Finished");
              },
            });

            const result = await query;
            if (result.data) {
              const results = [...result.data.lyricsKitSearch];
              results.sort((a, b) => b.quality - a.quality);
              setSearchResults(results);
            }
            zenSubscription.unsubscribe();
          } catch (e) {
            console.error(`Error while loading search result; ${e}`);
            snackbar.enqueueSnackbar(`Failed to load search results: ${e}`, {
              variant: "error",
            });
          }
        }}
      >
        {({ submitting, handleSubmit }) => (
          <form
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
            onSubmit={handleSubmit}
          >
            <TextField
              sx={{ marginRight: 1 }}
              variant="outlined"
              required
              fullWidth
              margin="dense"
              name="title"
              type="text"
              label="Title"
            />
            <TextField
              sx={{ marginRight: 1 }}
              variant="outlined"
              fullWidth
              margin="dense"
              name="artists"
              type="text"
              label="Artists"
            />
            <TextField
              sx={{ marginRight: 1, flexBasis: "25em" }}
              variant="outlined"
              margin="dense"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">sec</InputAdornment>
                ),
                readOnly: true,
              }}
              name="duration"
              type="number"
              label="Duration"
            />
            <Button
              variant="contained"
              color="secondary"
              type="submit"
              disabled={submitting}
            >
              Search
            </Button>
          </form>
        )}
      </Form>
      <List>
        {searchResults.map((v, idx) => (
          <ListItem key={idx} alignItems="flex-start" sx={{ pr: 12 }}>
            <ListItemAvatar>
              <Badge
                overlap="rectangular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={<BadgeAvatar>{v.metadata?.source}</BadgeAvatar>}
              >
                <Avatar src={v.metadata?.artworkURL} variant="rounded">
                  <MusicNoteIcon />
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText disableTypography>
              <Typography variant="body1" display="block">
                {`${v.tags?.ti}` || <em>No title</em>}
              </Typography>
              <Typography variant="body2" display="block" color="textSecondary">
                {`${v.tags?.ar}` || <em>Various artists</em>} /{" "}
                {`${v.tags?.al}` || <em>Unknown album</em>}
              </Typography>
              <Typography
                variant="body2"
                display="block"
                color="textSecondary"
                noWrap
              >
                {v.lyrics.replace(/\n?\[[^\]]*?]/g, "¶").replace(/^¶+/g, "")}
              </Typography>
              <Typography variant="body2" display="block" color="textSecondary">
                <InlineAnalysisResult
                  result={parsedResults[idx]?.analysis}
                  duration={duration}
                  length={v.tags?.length as number | undefined}
                />
              </Typography>
            </ListItemText>
            <ListItemSecondaryAction>
              <TooltipIconButton
                title="Copy lyrics"
                onClick={copyText(v.lyrics)}
              >
                <ContentCopyIcon />
              </TooltipIconButton>
              <TooltipIconButton
                title="Copy cover URL"
                disabled={!v.metadata?.artworkURL}
                onClick={copyText(v.metadata?.artworkURL)}
              >
                <FileCopyIcon />
              </TooltipIconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </>
  );
}

import { Box, Button, Grid, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import LyricsPreview from "./LyricsPreview";
import { lyricsAnalysis } from "../../../utils/lyricsCheck";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useSnackbar } from "notistack";
import { Lyrics } from "lyrics-kit/core";
import { useNamedState } from "../../../frontendUtils/hooks";
import LyricsEditDialog from "./LyricsEditDialog";
import { gql, useApolloClient } from "@apollo/client";
import type { DocumentNode } from "graphql";

const REMOVE_LYRICS_MUTATION = gql`
  mutation($fileId: Int!) {
    removeLyrics(fileId: $fileId)
  }
` as DocumentNode;

interface Props {
  fileId: number;
  lrcLyrics?: string;
  lrcxLyrics?: string;
  title: string;
  artists: string;
  duration: number;
  songId?: number;
  refresh: () => unknown | Promise<unknown>;
}

dayjs.extend(utc);

export default function LyricsPanel({
  fileId,
  lrcLyrics,
  lrcxLyrics,
  refresh,
  title,
  artists,
  duration,
  songId,
}: Props) {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const [isLyricsEditDialogOpen, toggleLyricsEditDialogOpen] = useNamedState(
    false,
    "isLyricsEditDialogOpen"
  );

  const handleOpenLyricsEditDialog = useCallback(() => {
    toggleLyricsEditDialogOpen(true);
  }, [toggleLyricsEditDialogOpen]);

  const handleRemoveLyrics = useCallback(async () => {
    try {
      const result = await apolloClient.mutate<{ removeLyrics: boolean }>({
        mutation: REMOVE_LYRICS_MUTATION,
        variables: { fileId },
      });
      if (result) {
        snackbar.enqueueSnackbar(`Lyrics removed for ${title}.`, {
          variant: "success",
        });
        await refresh();
      } else {
        snackbar.enqueueSnackbar(`Lyrics not removed for ${title}.`, {
          variant: "error",
        });
      }
    } catch (e) {
      console.error("Lyrics removal failed", e);
      snackbar.enqueueSnackbar(`Lyrics not removed for ${title}: ${e}`, {
        variant: "error",
      });
    }
  }, [apolloClient, fileId, refresh, snackbar, title]);

  const effectiveLyricsText = lrcxLyrics || lrcLyrics || null;

  const lyrics = useMemo(() => {
    if (!effectiveLyricsText) return null;
    try {
      return new Lyrics(effectiveLyricsText);
    } catch (e) {
      console.error("Error while parsing lyrics", e);
      snackbar.enqueueSnackbar(`Error while parsing lyrics: ${e}`, {
        variant: "error",
      });
      return null;
    }
  }, [effectiveLyricsText, snackbar]);

  let lyricsNode = (
    <Typography variant="h6" component="div">
      No lyrics
    </Typography>
  );
  if (lyrics) {
    lyricsNode = <LyricsPreview lyrics={lyrics} fileId={fileId} />;
  }

  const analysisResult = useMemo(() => lyricsAnalysis(lyrics), [lyrics]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={9}>
          {lyricsNode}
        </Grid>
        <Grid item xs={12} sm={3}>
          <Typography variant="h6" component="h3">
            Lyric state
          </Typography>
          <Box component="section" sx={{ marginBottom: 2 }}>
            <Typography>
              Lyrics type:{" "}
              {lrcxLyrics ? (
                <Typography component="span" color="secondary">
                  LRCX
                </Typography>
              ) : lrcLyrics ? (
                "LRC"
              ) : (
                <Typography component="span" color="textSecondary">
                  No lyrics
                </Typography>
              )}
            </Typography>
            {effectiveLyricsText !== null && (
              <>
                {lrcxLyrics !== null && (
                  <>
                    <Typography>
                      Has translation:{" "}
                      {analysisResult.hasTranslation ? (
                        <Typography component="span" color="secondary">
                          Yes
                        </Typography>
                      ) : (
                        <Typography component="span">No</Typography>
                      )}
                    </Typography>
                    <Typography>
                      Has inline time tags:{" "}
                      {analysisResult.hasInlineTimeTags ? (
                        <Typography component="span" color="secondary">
                          Yes
                        </Typography>
                      ) : (
                        <Typography component="span">No</Typography>
                      )}
                    </Typography>
                    <Typography>
                      Has furigana:{" "}
                      {analysisResult.hasFurigana ? (
                        <Typography component="span" color="secondary">
                          Yes
                        </Typography>
                      ) : (
                        <Typography component="span">No</Typography>
                      )}
                    </Typography>
                  </>
                )}
                <Typography>
                  Has “Simplified Japanese”:{" "}
                  {analysisResult.hasSimplifiedJapanese ? (
                    <Typography component="span" color="error">
                      Yes
                    </Typography>
                  ) : (
                    <Typography component="span" color="secondary">
                      No
                    </Typography>
                  )}
                </Typography>
                <Typography>
                  Last timestamp:{" "}
                  {dayjs
                    .utc(analysisResult.lastTimestamp * 1000)
                    .format("HH:mm:ss")}
                </Typography>
              </>
            )}
          </Box>
          <Typography variant="h6" component="h3">
            What to do?
          </Typography>
          <Button
            sx={{ marginRight: 1, marginBottom: 1 }}
            variant="outlined"
            onClick={handleOpenLyricsEditDialog}
          >
            Adjust
          </Button>
          <Button
            sx={{ marginRight: 1, marginBottom: 1 }}
            variant="outlined"
            color="primary"
            onClick={handleRemoveLyrics}
          >
            Remove
          </Button>
        </Grid>
      </Grid>
      <LyricsEditDialog
        refresh={refresh}
        fileId={fileId}
        isOpen={isLyricsEditDialogOpen}
        toggleOpen={toggleLyricsEditDialogOpen}
        initialLrc={lrcLyrics}
        initialLrcx={lrcxLyrics}
        title={title}
        artists={artists}
        duration={duration}
        songId={songId}
      />
    </>
  );
}

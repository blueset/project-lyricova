import IndexLayout from "../components/public/layouts/IndexLayout";
import { useAppContext } from "../components/public/AppContext";
import { useNamedState } from "../frontendUtils/hooks";
import { FocusedLyrics2 } from "../components/public/lyrics/focused2";
import { PlainLyrics } from "../components/public/lyrics/plain";
import { LyricsSwitchButton } from "../components/public/LyricsSwitchButton";
import { gql, useQuery } from "@apollo/client";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { ReactNode } from "react";
import { Box, makeStyles } from "@material-ui/core";
import _ from "lodash";
import clsx from "clsx";
import { FocusedLyrics } from "../components/public/lyrics/focused";
import { RingoLyrics } from "../components/public/lyrics/ringo";

const LYRICS_QUERY = gql`
  query Lyrics($id: Int!) {
   musicFile(id: $id) {
      lyrics {
        lines {
          content
          position
          attachments {
            translation
            timeTag {
              duration
              tags {
                index
                timeTag
              }
            }
          }
        }
      }
    }
  }
`;

const MODULE_LIST: { [key: string]: (lyrics: LyricsKitLyrics) => JSX.Element } = {
  "Focused": (lyrics: LyricsKitLyrics) => <FocusedLyrics lyrics={lyrics} blur={true} />,
  "Focused Clear": (lyrics: LyricsKitLyrics) => <FocusedLyrics lyrics={lyrics} blur={false} />,
  "Focused/2": (lyrics: LyricsKitLyrics) => <FocusedLyrics2 lyrics={lyrics} />,
  "Plain": (lyrics: LyricsKitLyrics) => <PlainLyrics lyrics={lyrics} />,
  "Ringo": (lyrics: LyricsKitLyrics) => <RingoLyrics lyrics={lyrics} resize={true} />,
  "Ringo Unisize": (lyrics: LyricsKitLyrics) => <RingoLyrics lyrics={lyrics} resize={false} />,
};

const useStyle = makeStyles({
  messageBox: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "2.5em",
    fontStyle: "italic",
    filter: "var(--jukebox-cover-filter-brighter)",
  }
});

export default function Index() {
  const { playlist } = useAppContext();
  const [module, setModule] = useNamedState<keyof typeof MODULE_LIST>(_.keys(MODULE_LIST)[0], /* name */"module");

  const keys = Object.keys(MODULE_LIST) as (keyof typeof MODULE_LIST)[];
  const moduleNode = MODULE_LIST[module];

  const lyricsQuery = useQuery<{ musicFile?: { lyrics: LyricsKitLyrics } }>(LYRICS_QUERY, {
    variables: {
      id: playlist.getCurrentSong()?.id
    }
  });

  const styles = useStyle({
    coverUrl: playlist.getCurrentCoverUrl()
  });

  const MessageBox = ({ children }: { children: ReactNode }) => (
    <Box className={clsx(styles.messageBox, "coverMask")} p={4}>{children}</Box>
  );

  let node = <MessageBox>Default</MessageBox>;
  if (lyricsQuery.loading) {
    node = <MessageBox>Loading...</MessageBox>;
  } else if (lyricsQuery.error) {
    if (playlist.nowPlaying !== null) {
      node = <MessageBox>{`${lyricsQuery.error}`}</MessageBox>;
    } else {
      node = <MessageBox>No track.</MessageBox>;
    }
  } else if (lyricsQuery.data.musicFile.lyrics !== null) {
    node = moduleNode(lyricsQuery.data.musicFile.lyrics);
  } else {
    node = <MessageBox>No lyrics</MessageBox>;
  }

  return (<>
    {node}
    <LyricsSwitchButton module={module} setModule={setModule} moduleNames={keys} />
  </>);
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Index.layout = IndexLayout;

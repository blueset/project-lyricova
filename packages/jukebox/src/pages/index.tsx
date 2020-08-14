import IndexLayout from "../components/public/layouts/IndexLayout";
import { useAppContext } from "../components/public/AppContext";
import { useNamedState } from "../frontendUtils/hooks";
import { StaticLyrics } from "../components/public/lyrics/static";
import { DynamicLyrics } from "../components/public/lyrics/dynamic";
import { LyricsSwitchButton } from "../components/public/LyricsSwitchButton";
import { gql, useQuery } from "@apollo/client";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { ReactNode } from "react";
import { Box, makeStyles, Theme } from "@material-ui/core";

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
  "Static": (lyrics: LyricsKitLyrics) => <StaticLyrics lyrics={lyrics} />,
  "Dynamic": (lyrics: LyricsKitLyrics) => <DynamicLyrics lyrics={lyrics} />,
};

const useStyle = makeStyles<Theme, { coverUrl: string | null }>({
  messageBox: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "2.5em",
    fontStyle: "italic",
    filter: ({ coverUrl }) => coverUrl ? "url(#sharpBlurBrighter)" : "url(#brighter)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundImage: ({ coverUrl }) => coverUrl ? `url(${coverUrl})` : null,
    "-webkit-background-clip": ({ coverUrl }) => coverUrl ? "text" : null,
    backgroundClip: ({ coverUrl }) => coverUrl ? "text" : null,
    color: ({ coverUrl }) => coverUrl ? "transparent" : "rgba(255,255,255,0.6)",
    mixBlendMode: ({ coverUrl }) => coverUrl ? null : "hard-light",
  }
});

export default function Index() {
  const { playlist } = useAppContext();
  const [module, setModule] = useNamedState<keyof typeof MODULE_LIST>("Static", /* name */"module");

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
    <Box className={styles.messageBox} p={4}>{children}</Box>
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
    <LyricsSwitchButton module={module} setModule={setModule} moduleNames={keys} />
    {node}
  </>);
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Index.layout = IndexLayout;

import IndexLayout from "../components/public/layouts/IndexLayout";
import { useAppContext } from "../components/public/AppContext";
import { useNamedState } from "../frontendUtils/hooks";
import { StaticLyrics } from "../components/public/lyrics/static";
import { DynamicLyrics } from "../components/public/lyrics/dynamic";
import { LyricsSwitchButton } from "../components/public/LyricsSwitchButton";
import { gql, useQuery } from "@apollo/client";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { spawn } from "child_process";
import { ReactNode } from "react";

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

  let node = <div>Default</div>;
  if (lyricsQuery.loading) {
    node = <div>Loading...</div>;
  } else if (lyricsQuery.error) {
    if (playlist.nowPlaying !== null) {
      node = <div>{`${lyricsQuery.error}`}</div>;
    } else {
      node = <div>No track.</div>;
    }
  } else if (lyricsQuery.data.musicFile.lyrics !== null) {
    node = moduleNode(lyricsQuery.data.musicFile.lyrics);
  } else {
    node = <div>No lyrics</div>;
  }

  return (<>
    <LyricsSwitchButton module={module} setModule={setModule} moduleNames={keys} />
    {node}
  </>);
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Index.layout = IndexLayout;

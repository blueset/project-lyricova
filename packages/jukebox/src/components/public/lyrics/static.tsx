import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box, makeStyles, Theme } from "@material-ui/core";
import { blendStyleProperties, BlendStyleParams } from "../../../frontendUtils/blendStyle";

const useStyle = makeStyles<Theme, BlendStyleParams>({
  currentLine: {
    fontSize: "4.5em",
    fontWeight: 600,
    marginBottom: 32,
    lineHeight: 1.2,
    transition: "font-size 0.25s",
    ...blendStyleProperties(),
    "& > small": {
      display: "block",
      fontSize: "0.6em",
    }
  },
  nextLine: {
    fontSize: "2.5em",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.3)",
    lineHeight: 1.2,
    transition: "font-size 0.25s",
    ...blendStyleProperties({ filterName: "#sharpBlurBright" }),
    "& > small": {
      display: "block",
      fontSize: "0.8em",
    }
  }
});

interface Props {
  lyrics: LyricsKitLyrics;
}


interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
}

function LyricsLineElement({ className, line }: LyricsLineElementProps) {
  if (!line) return null;
  return (<div className={className} lang="ja">
    {line.content}
    {line.attachments?.translation && (
      <small lang="zh">{line.attachments.translation}</small>
    )}
  </div>);
}

export function StaticLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle({ coverUrl: playlist.getCurrentCoverUrl() });

  const lines = lyrics.lines;


  return (<Box padding={4} width={1} height={1} display="flex" flexDirection="column" justifyContent="center">
    {line !== null && lines.map((l, idx) => {
      if (idx < line || idx > line + 1) return null;
      return <LyricsLineElement className={idx === line ? styles.currentLine : styles.nextLine} line={l} key={idx} />;
    })}
  </Box>);
}
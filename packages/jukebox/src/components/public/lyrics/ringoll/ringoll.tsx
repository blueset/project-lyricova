import { LyricsKitLyrics } from "../../../../graphql/LyricsKitObjects";
import { LyricsVirtualizer } from "./LyricsVirtualizer";
import { RowRenderer } from "./RowRenderer";
import { styled } from "@mui/material";

const RingollContainer = styled("div")`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: clip;
  padding: 1rem 2rem;
  mask-border-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-border-image-slice: 49% 0 fill;
  mask-border-image-width: 30% 0;
  mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-box-image-slice: 49% 0 fill;
  mask-box-image-width: 30% 0;
  -webkit-mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask-box-image-slice: 49% 0 fill;
  -webkit-mask-box-image-width: 30% 0;
`;

interface Props {
  lyrics: LyricsKitLyrics;
}

/** Lyricova’s own implementation of scrollable lyrics based on the architecture of AMLL. */
export function RingollLyrics({ lyrics }: Props) {
  return (
    <LyricsVirtualizer rows={lyrics.lines} estimatedRowHeight={20} containerAs={RingollContainer}>
      {(props) => props.row && <RowRenderer key={props.row.position} {...props} />}
    </LyricsVirtualizer>
  );
}

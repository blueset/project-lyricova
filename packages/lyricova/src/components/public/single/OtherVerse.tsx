import type { Verse } from "lyricova-common/models/Verse";
import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import classes from "./OtherVerse.module.scss";
import { VerseRenderer } from "./VerseRenderer";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Tooltip } from "@mui/material";

interface OtherVerseProps {
  verse: Verse;
}

export function OtherVerse({ verse }: OtherVerseProps) {
  return (
    <div
      className={`container verticalPadding ${classes.verse}`}
      lang={verse.language}
    >
      <h2 className={classes.verseTitle}>
        {verse.language}{" "}
        {verse.isOriginal && (
          <Tooltip title="Original" placement="top">
            <StarBorderIcon
              sx={{ fontSize: "1em", verticalAlign: "text-bottom" }}
            />
          </Tooltip>
        )}
      </h2>
      <div>
        <VerseRenderer verse={verse} />
      </div>
      {verse.translator && <cite>Translation by {verse.translator}</cite>}
    </div>
  );
}

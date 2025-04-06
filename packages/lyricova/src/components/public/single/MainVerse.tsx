import type { Entry } from "@lyricova/api/graphql/types";
import { TagRow } from "../TagRow";
import classes from "./MainVerse.module.scss";
import { VerseRenderer } from "./VerseRenderer";
import { VerseResizer } from "../VerseResizer";

interface MainVerseProps {
  entry: Entry;
}

export function MainVerse({ entry }: MainVerseProps) {
  const verse = entry.verses.find((verse) => verse.isMain);
  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  return (
    <section className={`container ${classes.entryMain}`} lang={verse.language}>
      <TagRow tags={entry.tags} />
      <div className={classes.meta}>
        <div className={classes.title}>{entry.title}</div>
        <div className={classes.artists}>{artistString}</div>
      </div>
      <VerseResizer className={classes.verse}>
        <VerseRenderer verse={verse} />
      </VerseResizer>
      {verse.translator && <cite>Translation by {verse.translator}</cite>}
    </section>
  );
}

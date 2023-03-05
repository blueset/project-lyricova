import { Entry } from "lyricova-common/models/Entry";
import { useCallback, useEffect, useRef } from "react";
import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import { TagRow } from "../TagRow";
import { PulseStatus } from "./PulseStatus";
import classes from "./TopEntry.module.scss";

interface TopEntryProps {
  entry: Entry;
}

export function TopEntry({ entry }: TopEntryProps) {
  const mainVerse = entry.verses.find((verse) => verse.isMain);
  const otherVerses = entry.verses.filter((verse) => !verse.isMain);
  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  const verseRef = useRef<HTMLDivElement>(null);

  const resizeVerse = useCallback((elm: HTMLDivElement) => {
    const containerWidth = elm.parentElement.scrollWidth;
    const fontSize = parseInt(window.getComputedStyle(elm).fontSize);
    let scaledSize =
      Math.round(((containerWidth * 0.6) / elm.scrollWidth) * fontSize * 100) /
      100;
    scaledSize = (scaledSize * 100) / containerWidth;
    // scaledSize = Math.max(35, Math.min(scaledSize, 100));
    elm.style.fontSize = `clamp(1.75rem, ${scaledSize}vw, 5rem)`;
  }, []);

  useEffect(() => {
    const verseRefEl = verseRef.current;
    if (verseRefEl) {
      resizeVerse(verseRefEl);
      // const resizeObserver = new ResizeObserver((entries) => {
      //   resizeVerse(verseRefEl);
      // });
      // resizeObserver.observe(document.body);
      // return () => {
      //   resizeObserver.disconnect();
      // };
    }
  }, [verseRef]);

  return (
    <article className={`container verticalPadding ${classes.container}`}>
      <div className={classes.otherVerses}>
        {otherVerses.map((verse) => (
          <div key={verse.id} lang={verse.language}>
            <PlainTextHangingPunct>{verse.text}</PlainTextHangingPunct>
          </div>
        ))}
      </div>
      <TagRow tags={entry.tags} />
      <div className={classes.verse} ref={verseRef} lang={mainVerse.language}>
        <PlainTextHangingPunct>{mainVerse.text}</PlainTextHangingPunct>
      </div>
      <div className={classes.meta}>
        <div className={classes.title}>{entry.title}</div>
        <div className={classes.artists}>{artistString}</div>
      </div>
      <div className={classes.pulse}>
        <PulseStatus entry={entry} />
      </div>
      <img src="/images/arrow.svg" className={classes.arrow} aria-hidden />
    </article>
  );
}

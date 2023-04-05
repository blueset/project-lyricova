import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
// import { buildSketch } from "../../frontendUtils/marcacos";
import type { ScreensaverProps } from "../../utils/screensaverProps";
import { getServerSideProps as getProps } from "../../utils/screensaverProps";
import dynamic from "next/dynamic";
import classes from "./marcacos.module.scss";
import { TagRow } from "../../components/public/TagRow";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const Marcacos = dynamic(() => import("../../components/public/Marcacos"), {
  ssr: false,
});

export const getServerSideProps: GetServerSideProps<ScreensaverProps> =
  getProps;

export default function MarcacosScreensaver({
  entries,
  verses,
}: ScreensaverProps) {
  const [entryId, setEntryId] = useState(1);
  const [[h, m, s], setTime] = useState(["00", "00", "00"]);

  useEffect(() => {
    const now = new Date();
    setTime([
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ]);
    const timer = setInterval(() => {
      const now = new Date();
      setTime([
        now.getHours().toString().padStart(2, "0"),
        now.getMinutes().toString().padStart(2, "0"),
        now.getSeconds().toString().padStart(2, "0"),
      ]);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const entry = entries[entryId];
  const artistString = !entry
    ? "Unknown artists"
    : !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;
  return (
    <>
      <div className={classes.metaRow}>
        <div className={classes.meta}>
          <span className={classes.title}>
            {entry?.title ?? "Unknown track"}
          </span>
          <span className={classes.artists}>{artistString}</span>
          <TagRow tags={entry?.tags ?? []} />
        </div>

        <div className={classes.headerTime}>
          {h}
          <span className={classes.colon}>:</span>
          {m}
          <span className={classes.colon}>:</span>
          {s}
        </div>
      </div>
      <div className={classes.credit}>
        <span>Project Lyricova Screensaver Gen 4</span>
        <span>
          <a href="https://www.andreburnier.com/project/marcacos">Marcacos</a>{" "}
          originally by André Brunier, 2020
        </span>
      </div>
      <Marcacos entries={entries} verses={verses} onNewVerse={setEntryId} />
    </>
  );
}

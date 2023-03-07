import { siteName, tagLine1, tagLine2 } from "../../../utils/consts";
import classes from "./SubArchiveHeader.module.scss";
import { NavPanel } from "../nav/NavPanel";
import { Search } from "../nav/Search";
import { Title } from "../nav/Title";
import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import _ from "lodash";

const resizer = _.debounce((elm: HTMLElement) => {
  // console.time("resizer");
  elm = elm.querySelector("[data-resizer]") as HTMLElement;
  if (!elm) return;

  elm.style.maxWidth = "initial";
  const width = elm.offsetWidth;
  const height = elm.offsetHeight;
  let w: number;
  // for (w = width; w; w--) {
  //   elm.style.maxWidth = w + "px";
  //   if (elm.offsetHeight !== height) break;
  // }

  let left: number = 1;
  let right: number = width;
  let mid: number;

  w = width;
  elm.style.maxWidth = w + "px";
  if (elm.offsetHeight === height) {
    while (left <= right) {
      mid = Math.floor((left + right) / 2);
      elm.style.maxWidth = mid + "px";

      if (elm.offsetHeight <= height) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    elm.style.maxWidth = right + "px";
    w = right;
  }

  if (w < elm.scrollWidth) {
    /* elm.style.width = */
    elm.style.maxWidth = elm.scrollWidth + "px";
  } else {
    elm.style.maxWidth = w + 1 + "px";
  }
  // console.timeEnd("resizer");
}, 100);

const buildObserver = () =>
  new ResizeObserver((entries) => {
    for (const entry of entries) {
      resizer(entry.target as HTMLElement);
    }
  });

interface SubArchiveHeaderProps {
  type: string;
  keywords: ReactNode;
  page: number;
}

export function SubArchiveHeader({
  page,
  type,
  keywords,
}: SubArchiveHeaderProps) {
  // const keywordsRef = useRef<HTMLDivElement>(null);

  const resizeObserverRef = useRef<ResizeObserver>();

  useEffect(() => {
    console.log("Ref updated");
  }, [resizeObserverRef]);

  return (
    <header className={`container verticalPadding ${classes.headerRow}`}>
      <Search />
      <div className={classes.headerMain}>
        <div className={classes.typeTitleLeft}>
          {siteName}
          <br />
          <strong>{type}</strong>
        </div>
        <div className={classes.pageNumberGroup}>
          <div className={classes.page}>Page</div>
          <div className={classes.pageNumber}>
            #<span>{`${page}`.padStart(2, "0")}</span>
          </div>
        </div>
        <div className={classes.right}>
          <div className={classes.typeTitle}>
            {siteName}
            <br />
            <strong>{type}</strong>
          </div>
          <div
            className={classes.keywords}
            data-resizer
            ref={(elm) => {
              if (!resizeObserverRef.current) {
                resizeObserverRef.current = buildObserver();
              }
              // console.log("Ref used", resizeObserverRef.current, elm);
              if (elm) {
                resizeObserverRef.current?.observe(document.body);
              } else {
                resizeObserverRef.current?.disconnect();
              }
            }}
          >
            {keywords}
          </div>
        </div>
      </div>
      <NavPanel />
    </header>
  );
}

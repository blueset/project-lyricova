import { siteName, tagLine1, tagLine2 } from "../../../utils/consts";
import classes from "./ArchiveHeader.module.scss";
import { NavPanel } from "../nav/NavPanel";
import { Search } from "../nav/Search";
import { Title } from "../nav/Title";

interface ArchiveHeaderProps {
  page: number;
}

export function ArchiveHeader({ page }: ArchiveHeaderProps) {
  const siteNameWords = siteName.split(" ");
  const siteNamePre = siteNameWords
    .slice(0, siteNameWords.length - 1)
    .join(" ");
  const siteNamePost = siteNameWords[siteNameWords.length - 1];
  return (
    <header className={`container verticalPadding ${classes.headerRows}`}>
      <div className={classes.headerRow}>
        <Search />
        <div className={classes.headerMain}>
          <div className={classes.left}>
            <div>Archive Page</div>
          </div>
          <div className={classes.center}>
            #<span>{`${page}`.padStart(2, "0")}</span>
          </div>
          <div className={classes.right}>
            <div>
              {siteNamePre} <strong>{siteNamePost}</strong>
            </div>
          </div>
        </div>
        <NavPanel />
      </div>
      <div className={classes.tagLine}>
        <strong>{tagLine1}</strong> <span>{tagLine2}</span>
      </div>
    </header>
  );
}

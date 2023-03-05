import { siteName, tagLine1, tagLine2 } from "../../utils/consts";
import classes from "./IndexHeader.module.scss";
import { Jukebox } from "./nav/Jukebox";
import { Search } from "./nav/Search";

export function IndexHeader() {
  return (
    <header className={`container verticalPadding ${classes.headerRow}`}>
      <div>
        <h1 className={classes.title}>{siteName}</h1>
        <h1 className={classes.subtitle}>
          <strong>{tagLine1}</strong> {tagLine2}
        </h1>
      </div>
      <nav className={classes.nav}>
        <Jukebox />
        <Search />
      </nav>
    </header>
  );
}

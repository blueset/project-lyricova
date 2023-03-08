import classes from "./IndexHeader.module.scss";
import { Jukebox } from "./nav/Jukebox";
import { NavPanel } from "./nav/NavPanel";
import { Screensavers } from "./nav/Screensavers";
import { Search } from "./nav/Search";
import { Title } from "./nav/Title";

export function IndexHeader() {
  return (
    <header className={`container verticalPadding ${classes.headerRow}`}>
      <div>
        <Title />
      </div>
      <nav className={classes.nav}>
        <NavPanel />
      </nav>
    </header>
  );
}

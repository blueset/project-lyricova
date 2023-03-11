import { useRouter } from "next/router";
import classes from "./IndexHeader.module.scss";
import { Link } from "./Link";
import { Jukebox } from "./nav/Jukebox";
import { NavPanel } from "./nav/NavPanel";
import { Screensavers } from "./nav/Screensavers";
import { Search } from "./nav/Search";
import { Title } from "./nav/Title";

export function IndexHeader() {
  const router = useRouter();
  const isHome = router.pathname === "/";
  return (
    <header className={`container verticalPadding ${classes.headerRow}`}>
      <div>
        {isHome ? (
          <Title />
        ) : (
          <Link href="/">
            <Title />
          </Link>
        )}
      </div>
      <nav className={classes.nav}>
        <Screensavers />
        <Jukebox />
        <Search />
        <NavPanel />
      </nav>
    </header>
  );
}

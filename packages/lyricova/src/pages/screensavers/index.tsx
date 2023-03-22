import classes from "./index.module.scss";
import Head from "next/head";
import Balancer from "react-wrap-balancer";
import { NavPanel } from "../../components/public/nav/NavPanel";
import { Footer } from "../../components/public/Footer";
import { Link } from "../../components/public/Link";

export default function ScreensaversDirectory() {
  return (
    <div className={`container ${classes.container}`}>
      <div className={classes.top}>
        <NavPanel />
      </div>
      <h1>
        <Link href="/">
          Project Lyricov<span>a</span>
        </Link>
      </h1>
      <h2>
        Screen
        <wbr />
        saver<span>s</span>
      </h2>
      <blockquote>
        <Balancer ratio={1}>
          Or… actually something like a digital billboard. Screens nowadays
          don’t need such a thing to be “saved” anyway, aren’t they?
        </Balancer>
      </blockquote>
      <nav className={classes.nav}>
        <Link
          href="/screensavers/centered"
          title="This is the original Gen 2 Screensaver"
        >
          Centered
        </Link>
        <Link
          href="/screensavers/stacked"
          title="This is the original Gen 3 Screensaver"
        >
          Stacked
        </Link>
        <Link href="/screensavers/marcacos">Marcacos</Link>
        <Link href="/screensavers/docs">Options</Link>
      </nav>
      <div className={classes.bottom}>
        <Footer />
      </div>
      <style global jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght,XTRA@8..144,150,300,600&display=swap");
      `}</style>
    </div>
  );
}

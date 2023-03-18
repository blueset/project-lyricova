import Link from "next/link";
import classes from "./index.module.scss";
import Head from "next/head";
import Balancer from "react-wrap-balancer";
import { NavPanel } from "../../components/public/nav/NavPanel";
import { Footer } from "../../components/public/Footer";

export default function ScreensaversDirectory() {
  return (
    <div className={`container ${classes.container}`}>
      <div className={classes.top}>
        <NavPanel />
      </div>
      <h1>
        <Link href="/screensavers/typing">Project Lyricova</Link>
      </h1>
      <h2>
        Screen
        <wbr />
        savers
      </h2>
      <blockquote>
        <Balancer ratio={1}>
          Or… actually something like a digital billboard. Screens nowadays
          don’t need such a thing to be “saved” anyway, aren’t they?
        </Balancer>
      </blockquote>
      <nav className={classes.nav}>
        <Link href="/screensavers/typing">Typing</Link>
        <Link href="/screensavers/marcacos">Marcacos</Link>
      </nav>
      <div className={classes.bottom}>
        <Footer />
      </div>
      <style jsx global>{`
        html,
        body {
          height: 100%;
        }
        #__next {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      `}</style>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght,XTRA@8..144,150,300,600&display=swap"
          rel="stylesheet"
        />
      </Head>
    </div>
  );
}

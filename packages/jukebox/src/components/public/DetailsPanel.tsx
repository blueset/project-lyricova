// import style from "./DetailsPanel.module.scss";
import { CSSProperties, ReactNode } from "react";
import { Box, IconButton, makeStyles, createMuiTheme, ThemeProvider } from "@material-ui/core";
import Link, { NextComposedLink } from "../Link";
import SearchIcon from "@material-ui/icons/Search";
import { useRouter } from "next/router";
import Theme from "../../frontendUtils/theme";

const useStyle = makeStyles({
  link: {
    fontSize: "1.75em",
    fontWeight: 500,
    marginRight: "1em",
    fontStyle: "italic",
    color: Theme.palette.text.secondary,
    "&.active": {
      color: Theme.palette.primary.light,
    }
  },
  containerBox: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  backgroundStyle: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    filter: "url(#sharpBlur)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    zIndex: 0,
  },
  backgroundShade: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1,
  },
  hideSvg: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    width: "1px",
  },
});

const theme = createMuiTheme({
  ...Theme,
  palette: {
    ...Theme.palette,
    primary: {
      ...Theme.palette.primary,
      main: Theme.palette.primary.light
    }
  }
});

interface Props {
  coverUrl: number | null;
  children?: ReactNode;
}

export default function DetailsPanel({ coverUrl = null, children }: Props) {
  const style = useStyle();
  const router = useRouter();

  let backgroundNode = <div className={style.backgroundShade}></div>;

  if (coverUrl) {
    backgroundNode = (<>
      <div className={style.backgroundStyle} style={{ backgroundImage: `url(${coverUrl})` }}></div>
      <div className={style.backgroundShade}></div>
    </>);
  }


  // console.log(router.pathname);

  return (
    <ThemeProvider theme={theme}>
      <div className={style.containerBox}>
        {backgroundNode}
        <Box pt={2} pb={2} pl={4} pr={2} display="flex" flexDirection="row" alignItems="center" zIndex={2}>
          <Link className={style.link} href="/">Lyrics</Link>
          <Link className={style.link} href="/library/tracks" activeCriteria={(v) => v.startsWith("/library/")}>Library</Link>
          <Link className={style.link} href="/info">Information</Link>
          <Box flexGrow={1}></Box>
          <IconButton component={NextComposedLink} color={router.pathname === "/search" ? "primary" : "default"} href="/search" aria-label="delete">
            <SearchIcon />
          </IconButton>
        </Box>
        <Box position="relative" width="1" flexGrow={1} zIndex={2}>
          {children}
        </Box>
        <svg className={style.hideSvg}>
          <filter id="sharpBlur">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="sharpBlurBrighter">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0" result="colorMatrix" />
            <feFlood flood-color="#ffffff" flood-opacity="1" result="floodWhite" />
            <feBlend mode="overlay" in="floodWhite" in2="colorMatrix" result="blend" />
            <feFlood flood-color="#ffffff" flood-opacity="0.25" result="floodWhite25" />
            <feBlend mode="overlay" in="floodWhite25" in2="blend" result="furtherBlend" />
            <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
          </filter>
        </svg>
      </div>
    </ThemeProvider>
  );
}
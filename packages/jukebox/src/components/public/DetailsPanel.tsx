// import style from "./DetailsPanel.module.scss";
import { CSSProperties, ReactNode } from "react";
import { Box, IconButton, makeStyles, createMuiTheme, ThemeProvider, Theme as MUITheme } from "@material-ui/core";
import Link, { NextComposedLink } from "../Link";
import SearchIcon from "@material-ui/icons/Search";
import { useRouter } from "next/router";
import Theme from "../../frontendUtils/theme";

const useStyle = makeStyles<
  MUITheme,
  { coverUrl: string },
  "link" | "containerBox" | "backgroundStyle" | "backgroundShade" | "hideSvg" | "@global"
>({
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
  "@global": {
    ".coverMask": {
      backgroundImage: ({ coverUrl }) => coverUrl ? `url(${coverUrl})` : null,
      color: ({ coverUrl }) => coverUrl ? ["transparent", "!important"] : null,
      mixBlendMode: ({ coverUrl }) => coverUrl ? ["none", "!important"] : null,
      backgroundClip: ({ coverUrl }) => coverUrl ? "text" : null,
      "-webkit-background-clip": ({ coverUrl }) => coverUrl ? "text" : null,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      "--jukebox-cover-filter-blur": ({ coverUrl }) => coverUrl ? "url(#sharpBlur)" : null,
      "--jukebox-cover-filter-bright": ({ coverUrl }) => coverUrl ? "url(#sharpBlurBright)" : null,
      "--jukebox-cover-filter-brighter": ({ coverUrl }) => coverUrl ? "url(#sharpBlurBrighter)" : null,
      "--jukebox-cover-filter-brighter-blurless": ({ coverUrl }) => coverUrl ? "url(#brighter)" : null,
    }
  }
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
  coverUrl: string | null;
  children?: ReactNode;
}

export default function DetailsPanel({ coverUrl = null, children }: Props) {
  const style = useStyle({ coverUrl });
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
        <Box position="relative" width="1" flexGrow={1} zIndex={2} overflow="auto">
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
            <feFlood floodColor="#ffffff" floodOpacity="1" result="floodWhite" />
            <feBlend mode="overlay" in="floodWhite" in2="colorMatrix" result="blend" />
            <feFlood floodColor="#ffffff" floodOpacity="0.3" result="floodWhite25" />
            <feBlend mode="hard-light" in="floodWhite25" in2="blend" result="furtherBlend" />
            <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="brighter">
            <feFlood floodColor="#ffffff" floodOpacity="1" result="floodWhite" />
            <feBlend mode="overlay" in="floodWhite" in2="SourceGraphic" result="blend" />
            <feFlood floodColor="#ffffff" floodOpacity="0.3" result="floodWhite25" />
            <feBlend mode="hard-light" in="floodWhite25" in2="blend" result="furtherBlend" />
            <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="sharpBlurBright">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0" result="colorMatrix" />
            <feFlood floodColor="#000000" floodOpacity="0.5" result="floodWhite" />
            <feBlend mode="darken" in="floodWhite" in2="colorMatrix" result="blend" />
            <feFlood floodColor="#ffffff" floodOpacity="0.2" result="floodWhite25" />
            <feBlend mode="hard-light" in="floodWhite25" in2="blend" result="furtherBlend" />
            <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
          </filter>
        </svg>
      </div>
    </ThemeProvider>
  );
}
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
  blur: boolean;
  children?: ReactNode;
}

export default function DetailsPanel({ blur, children }: Props) {
  const inlineStyle: CSSProperties = {};
  if (blur) {
    inlineStyle.backdropFilter = "blur(16px)";
  }

  const style = useStyle();
  const router = useRouter();

  // console.log(router.pathname);

  return (
    <ThemeProvider theme={theme}>
      <Box width="100%" height="100%" bgcolor="rgba(0,0,0,0.6)" display="flex" flexDirection="column" style={inlineStyle}>
        <Box pt={2} pb={2} pl={4} pr={2} display="flex" flexDirection="row" alignItems="center">
          <Link className={style.link} href="/">Lyrics</Link>
          <Link className={style.link} href="/library/tracks" activeCriteria={(v) => v.startsWith("/library/")}>Library</Link>
          <Link className={style.link} href="/info">Information</Link>
          <Box flexGrow={1}></Box>
          <IconButton component={NextComposedLink} color={router.pathname === "/search" ? "primary" : "default"} href="/search" aria-label="delete">
            <SearchIcon />
          </IconButton>
        </Box>
        <Box position="relative" width="1" flexGrow={1}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

DetailsPanel.defaults = {
  blur: false
};
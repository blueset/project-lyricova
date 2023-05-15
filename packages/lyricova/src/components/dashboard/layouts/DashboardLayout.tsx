import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Theme, CSSObject } from "@mui/material";
import {
  Toolbar,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
  ListSubheader,
  Box,
  ListItemButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import type { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import MuiAppBar from "@mui/material/AppBar";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ArticleIcon from "@mui/icons-material/Article";
import CloseIcon from "@mui/icons-material/Close";
import LabelIcon from "@mui/icons-material/Label";
import {
  AuthContext,
  AuthContextConsumer,
} from "lyricova-common/components/AuthContext";
import { useRouter } from "next/router";
import { NextComposedLink } from "lyricova-common/components/Link";
import Head from "next/head";
import type { SnackbarKey } from "notistack";
import { SnackbarProvider, useSnackbar } from "notistack";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { ApolloProvider } from "@apollo/client";
import apolloClient from "lyricova-common/frontendUtils/apollo";

const DRAWER_WIDTH = 240;
const DASHBOARD_TITLE = "Lyricova Dashboard";

const openedMixin = (theme: Theme): CSSObject => ({
  width: DRAWER_WIDTH,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(9)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: DRAWER_WIDTH,
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

interface NavMenuItemProps {
  href: string;
  as?: string;
  text: string;
  icon?: ReactNode;
  activeCriteria?: (pathName: string) => boolean;
  prefixMatch?: boolean;
}

function NavMenuItem({
  href,
  text,
  icon,
  activeCriteria,
  as,
  prefixMatch,
}: NavMenuItemProps) {
  const router = useRouter();
  const criteria =
    activeCriteria ||
    ((v: string) => (prefixMatch ? v.startsWith(href) : v === href));

  return (
    <ListItemButton
      component={NextComposedLink}
      selected={criteria(router.pathname)}
      href={href}
      as={as}
    >
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={text} />
    </ListItemButton>
  );
}

function CloseSnackbarButton({ id }: { id: SnackbarKey }) {
  const { closeSnackbar } = useSnackbar();
  return (
    <IconButton onClick={() => closeSnackbar(id)}>
      <CloseIcon />
    </IconButton>
  );
}

interface Props {
  title?: string;
  children: ReactNode;
}

export default function DashboardLayout({ title, children }: Props) {
  const router = useRouter();

  const container = () => window.document.body || undefined;

  const defaultDrawerOpen = useMediaQuery<Theme>((theme) =>
    theme.breakpoints.up("sm")
  );
  const [isDrawerOpen, setDrawerOpen] = useState(defaultDrawerOpen);
  const popupState = usePopupState({
    variant: "popover",
    popupId: "appbar-menu",
  });

  useEffect(() => {
    setDrawerOpen(defaultDrawerOpen);
  }, [defaultDrawerOpen, setDrawerOpen]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  const logOut = async () => {
    await router.push("/logout");
    popupState.close();
  };
  const webAuthn = async () => {
    await router.push("/dashboard/webauthn");
    popupState.close();
  };

  const drawer = (
    <>
      <DrawerHeader>
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        <NavMenuItem
          text="Dashboard"
          href="/dashboard"
          icon={<DashboardIcon />}
        />
      </List>
      <Divider />
      {/* <List>
        <ListSubheader inset>Databank</ListSubheader>
        <NavMenuItem
          text="Review"
          href="/dashboard/review"
          prefixMatch
          icon={<RateReviewIcon />}
        />
        <NavMenuItem
          text="Music entries"
          href="/dashboard/songs"
          prefixMatch
          icon={<MusicNoteIcon />}
        />
        <NavMenuItem
          text="Artist entries"
          href="/dashboard/artists"
          prefixMatch
          icon={<RecentActorsIcon />}
        />
        <NavMenuItem
          text="Album entries"
          href="/dashboard/albums"
          prefixMatch
          icon={<AlbumIcon />}
        />
        <NavMenuItem
          text="Playlists"
          href="/dashboard/playlists"
          prefixMatch
          icon={<QueueMusicIcon />}
        />
        <NavMenuItem text="Scan" href="/dashboard/scan" icon={<CachedIcon />} />
      </List>
      <Divider />*/}
      <List>
        <ListSubheader inset>Entries</ListSubheader>
        <NavMenuItem
          text="Entries"
          href="/dashboard/entries"
          prefixMatch
          icon={<ArticleIcon />}
        />
        <NavMenuItem
          text="Tags"
          href="/dashboard/tags"
          prefixMatch
          icon={<LabelIcon />}
        />
      </List>
      <Box sx={{ display: "flex", flexGrow: 1 }} />
      <List dense>
        <ListItem>
          <ListItemText
            inset
            primaryTypographyProps={{ color: "textSecondary" }}
          >
            Project Lyricova
            <br />
            since 2013
            <br />
            by 1A23 Studio
          </ListItemText>
        </ListItem>
      </List>
    </>
  );

  const pageTitle = title ? `${title} - ${DASHBOARD_TITLE}` : DASHBOARD_TITLE;
  title = title || DASHBOARD_TITLE;

  return (
    <ApolloProvider client={apolloClient}>
      <AuthContext>
        <Head>
          <title>{pageTitle}</title>
          <meta property="og:title" content={pageTitle} key="title" />
        </Head>
        <SnackbarProvider
          maxSnack={4}
          action={(snackbarId) => <CloseSnackbarButton id={snackbarId} />}
        >
          <AuthContextConsumer>
            {(userContext) => (
              <Box sx={{ display: "flex" }}>
                <AppBar position="fixed" open={isDrawerOpen}>
                  <Toolbar>
                    <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={handleDrawerToggle}
                      sx={{
                        marginRight: "36px",
                        ...(isDrawerOpen && { display: "none" }),
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{ flexGrow: 1 }}
                      noWrap
                    >
                      {title}
                    </Typography>
                    <IconButton
                      aria-label="account of current user"
                      color="inherit"
                      {...bindTrigger(popupState)}
                    >
                      <Avatar
                        alt={userContext.user?.displayName}
                        src={`https://www.gravatar.com/avatar/${userContext.user?.emailMD5}`}
                      />
                    </IconButton>
                    <Menu
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      keepMounted
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                      {...bindMenu(popupState)}
                    >
                      <MenuItem>
                        <ListItemText onClick={webAuthn} primary="WebAuthn" />
                      </MenuItem>
                      <MenuItem onClick={logOut}>
                        <ListItemText
                          primary="Log out"
                          primaryTypographyProps={{ color: "error" }}
                        />
                      </MenuItem>
                    </Menu>
                  </Toolbar>
                </AppBar>
                <Drawer variant="permanent" open={isDrawerOpen}>
                  {drawer}
                </Drawer>
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <DrawerHeader />
                  {children}
                </Box>
              </Box>
            )}
          </AuthContextConsumer>
        </SnackbarProvider>
      </AuthContext>
    </ApolloProvider>
  );
}

// eslint-disable-next-line react/display-name
export const getLayout = (title?: string) => (page: ReactNode) =>
  <DashboardLayout title={title}>{page}</DashboardLayout>;

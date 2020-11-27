import {ReactNode, useEffect, MouseEvent} from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  makeStyles,
  Hidden,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Theme,
  Menu,
  MenuItem,
  Avatar,
  ListSubheader
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import DashboardIcon from "@material-ui/icons/Dashboard";
import RateReviewIcon from "@material-ui/icons/RateReview";
import RecentActorsIcon from "@material-ui/icons/RecentActors";
import AlbumIcon from "@material-ui/icons/Album";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import QueueMusicIcon from "@material-ui/icons/QueueMusic";
import CachedIcon from "@material-ui/icons/Cached";
import GetAppIcon from "@material-ui/icons/GetApp";
import clsx from "clsx";
import {useNamedState} from "../../../frontendUtils/hooks";
import {AuthContext, AuthContextConsumer} from "../../public/AuthContext";
import {useRouter} from "next/router";
import {NextComposedLink} from "../../Link";
import Head from "next/head";
import { SnackbarProvider } from "notistack";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";

const DRAWER_WIDTH = 240;
const DASHBOARD_TITLE = "Jukebox Dashboard";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  appBar: {
    [theme.breakpoints.up("sm")]: {
      marginLeft: DRAWER_WIDTH,
      zIndex: theme.zIndex.drawer + 1,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    },
  },
  appBarShift: {
    [theme.breakpoints.up("sm")]: {
      marginLeft: DRAWER_WIDTH,
      width: `calc(100% - ${DRAWER_WIDTH}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    },
  },
  drawerPaper: {
    width: DRAWER_WIDTH,
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: DRAWER_WIDTH,
      flexShrink: 0,
      whiteSpace: "nowrap",
    },
  },
  hideToggle: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  },
  drawerOpen: {
    [theme.breakpoints.up("sm")]: {
      width: DRAWER_WIDTH,
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }
  },
  drawerClose: {
    [theme.breakpoints.up("sm")]: {
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      overflowX: "hidden",
      width: theme.spacing(7) + 1,
    }
  },
  title: {
    flexGrow: 1,
  },
  filler: {
    flexGrow: 1,
  },
  main: {
    flexGrow: 1,
    width: 0,
  },
}));

interface NavMenuItemProps {
  href: string;
  as?: string;
  text: string;
  icon?: ReactNode;
  activeCriteria?: (pathName: string) => boolean;
  prefixMatch?: boolean;
}

function NavMenuItem({href, text, icon, activeCriteria, as, prefixMatch}: NavMenuItemProps) {
  const router = useRouter();
  const criteria = activeCriteria || ((v: string) => (prefixMatch ? v.startsWith(href) : v === href));

  return <ListItem button
                   component={NextComposedLink}
                   selected={criteria(router.pathname)}
                   href={href}
                   as={as}
  >
    {icon && <ListItemIcon>{icon}</ListItemIcon>}
    <ListItemText primary={text}/>
  </ListItem>;
}

interface Props {
  title?: string;
  children: ReactNode;
}

export default function DashboardLayout({title, children}: Props) {
  const styles = useStyles();
  const router = useRouter();

  const container = () => window.document.body || undefined;

  const defaultDrawerOpen = useMediaQuery<Theme>((theme) => theme.breakpoints.up("sm"));
  const [isDrawerOpen, setDrawerOpen] = useNamedState(defaultDrawerOpen, "isDrawerOpen");
  const popupState = usePopupState({ variant: "popover", popupId: "appbar-menu" });

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

  const drawer = (
    <>
      <div className={styles.toolbar}>
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon/>
        </IconButton>
      </div>
      <Divider/>
      <List>
        <NavMenuItem text="Dashboard" href="/dashboard" icon={<DashboardIcon/>}/>
      </List>
      <Divider/>
      <List>
        <ListSubheader inset>Databank</ListSubheader>
        <NavMenuItem text="Review" href="/dashboard/review" prefixMatch icon={<RateReviewIcon/>}/>
        <NavMenuItem text="Music entries" href="/dashboard/songs" prefixMatch icon={<MusicNoteIcon/>}/>
        <NavMenuItem text="Artist entries" href="/dashboard/artists" prefixMatch icon={<RecentActorsIcon/>}/>
        <NavMenuItem text="Album entries" href="/dashboard/albums" prefixMatch icon={<AlbumIcon/>}/>
        <NavMenuItem text="Playlists" href="/dashboard/playlists" prefixMatch icon={<QueueMusicIcon/>}/>
        <NavMenuItem text="Scan" href="/dashboard/scan" icon={<CachedIcon/>}/>
      </List><Divider/>
      <List>
        <ListSubheader inset>Files</ListSubheader>
        <NavMenuItem text="Download" href="/dashboard/download" icon={<GetAppIcon/>}/>
      </List>
      <div className={styles.filler}/>
      <List dense>
        <ListItem>
          <ListItemText inset primaryTypographyProps={{color: "textSecondary"}}>Project Lyricova<br/>since 2013<br/>by
            1A23 Studio</ListItemText>
        </ListItem>
      </List>
    </>
  );

  const pageTitle = title ? `${title} - ${DASHBOARD_TITLE}` : DASHBOARD_TITLE;
  title = title || DASHBOARD_TITLE;

  return <AuthContext>
    <Head>
      <title>{pageTitle}</title>
      <meta property="og:title" content={pageTitle} key="title"/>
    </Head>
    <SnackbarProvider maxSnack={4}>
      <AuthContextConsumer>{(userContext) =>
      <div className={styles.container}>
        <AppBar position="fixed" className={clsx(styles.appBar, {
          [styles.appBarShift]: isDrawerOpen,
        })}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              className={clsx(styles.menuButton, isDrawerOpen && styles.hideToggle)}
              onClick={handleDrawerToggle}
            >
              <MenuIcon/>
            </IconButton>
            <Typography variant="h6" className={styles.title} noWrap>
              {title}
            </Typography>
            <IconButton
              aria-label="account of current user"
              color="inherit"
              {...bindTrigger(popupState)}
            >
              <Avatar alt={userContext.user?.displayName} src={`https://www.gravatar.com/avatar/${userContext.user?.emailMD5}`}/>
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
              getContentAnchorEl={null}
              {...bindMenu(popupState)}
            >
              <MenuItem onClick={logOut}>
                <ListItemText
                  primary="Log out"
                  primaryTypographyProps={{color: "error"}}
                />
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <nav
          className={clsx(styles.drawer, {
            [styles.drawerOpen]: isDrawerOpen,
            [styles.drawerClose]: !isDrawerOpen,
          })} aria-label="Dashboard menu">
          <Hidden smUp implementation="js">
            <Drawer
              container={container}
              variant="temporary"
              open={isDrawerOpen}
              onClose={handleDrawerToggle}
              classes={{
                paper: styles.drawerPaper,
              }}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
            >
              {drawer}
            </Drawer>
          </Hidden>
          <Hidden xsDown implementation="js">
            <Drawer
              classes={{
                paper: clsx({
                  [styles.drawerOpen]: isDrawerOpen,
                  [styles.drawerClose]: !isDrawerOpen,
                }),
              }}
              variant="permanent"
              open
            >
              {drawer}
            </Drawer>
          </Hidden>
        </nav>
        <main className={styles.main}>
          <div className={styles.toolbar}/>
          {children}
        </main>
      </div>
    }</AuthContextConsumer>
    </SnackbarProvider>
  </AuthContext>;
}

// eslint-disable-next-line react/display-name
export const getLayout = (title?: string) => ((page: ReactNode) => <DashboardLayout
  title={title}>{page}</DashboardLayout>);

import { ReactNode, useEffect } from "react";
import { AppBar, Toolbar, IconButton, Typography, makeStyles, Hidden, Drawer, Divider, List, ListItem, ListItemIcon, ListItemText, useMediaQuery, Theme, Menu, MenuItem, Avatar, ListSubheader } from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import DashboardIcon from "@material-ui/icons/Dashboard";
import RateReviewIcon from "@material-ui/icons/RateReview";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import QueueMusicIcon from "@material-ui/icons/QueueMusic";
import clsx from "clsx";
import { useNamedState } from "../../../frontendUtils/hooks";
import { AuthContext, AuthContextConsumer } from "../AuthContext";
import { useRouter } from "next/router";
import { NextComposedLink } from "../../Link";
import Head from "next/head";

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
  },
}));

interface NavMenuItemProps {
  href: string;
  as?: string;
  text: string;
  icon?: ReactNode;
  activeCriteria?: (pathName: string) => boolean;
}

function NavMenuItem({ href, text, icon, activeCriteria, as }: NavMenuItemProps) {
  const router = useRouter();
  const criteria = activeCriteria || ((v: string) => v === href);

  return <ListItem button
    component={NextComposedLink}
    selected={criteria(router.pathname)}
    href={href}
    as={as}
  >
    {icon && <ListItemIcon>{icon}</ListItemIcon>}
    <ListItemText primary={text} />
  </ListItem>;
}

interface Props {
  title?: string;
  children: ReactNode;
}

export default function DashabordLayout({ title, children }: Props) {
  const styles = useStyles();
  const router = useRouter();

  const container = () => window.document.body || undefined;

  const defaultDrawerOpen = useMediaQuery<Theme>((theme) => theme.breakpoints.up("sm"));
  const [isDrawerOpen, setDrawerOpen] = useNamedState(defaultDrawerOpen, "isDrawerOpen");
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useNamedState<HTMLElement>(null, "userMenuAnchorEl");

  useEffect(() => {
    setDrawerOpen(defaultDrawerOpen);
  }, [defaultDrawerOpen, setDrawerOpen]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const logOut = () => {
    router.push("/logout");
    handleUserMenuClose();
  };

  const drawer = (
    <>
      <div className={styles.toolbar} >
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <Divider />
      <List>
        <NavMenuItem text="Dashboard" href="/dashboard" icon={<DashboardIcon />} />
      </List>
      <Divider />
      <List>
        <ListSubheader inset>Sections</ListSubheader>
        <NavMenuItem text="Review" href="/dashboard/review" icon={<RateReviewIcon />} />
        <NavMenuItem text="Music files" href="/dashboard/musicFiles" icon={<FileCopyIcon />} />
        <NavMenuItem text="Music entries" href="/dashboard/entries" icon={<MusicNoteIcon />} />
        <NavMenuItem text="Playlists" href="/dashboard/playlists" icon={<QueueMusicIcon />} />
      </List>
      <div className={styles.filler}></div>
      <List dense>
        <ListItem>
          <ListItemText inset primaryTypographyProps={{ color: "textSecondary" }}>Project Lyricova<br />since 2013<br />by 1A23 Studio</ListItemText>
        </ListItem>
      </List>
    </>
  );

  const pageTitle = title ? `${title} - ${DASHBOARD_TITLE}` : DASHBOARD_TITLE;
  title = title || DASHBOARD_TITLE;

  return <AuthContext>
    <Head>
      <title>{pageTitle}</title>
      <meta property="og:title" content={pageTitle} key="title" />
    </Head>
    <AuthContextConsumer>{(user) =>
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
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" className={styles.title} noWrap>
              {title}
            </Typography>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleUserMenu}
              color="inherit"
            >
              <Avatar alt={user?.displayName} src={`https://www.gravatar.com/avatar/${user?.emailMD5}`} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={userMenuAnchorEl}
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
              open={Boolean(userMenuAnchorEl)}
              onClose={handleUserMenuClose}
            >
              <MenuItem onClick={logOut}>
                <ListItemText
                  primary="Log out"
                  primaryTypographyProps={{ color: "error" }}
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
          <div className={styles.toolbar} />
          {children}
        </main>
      </div>
    }</AuthContextConsumer>
  </AuthContext>;
}

export const getLayout = (title?: string) => ((page: ReactNode) => <DashabordLayout title={title}>{page}</DashabordLayout>);
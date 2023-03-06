import { IconButton, Portal, Tooltip } from "@mui/material";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import classes from "./NavPanel.module.scss";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { Title } from "./Title";
import { NextComposedLink } from "lyricova-common/components/Link";
import { jukeboxUrl } from "../../../utils/consts";
import gsap from "gsap";
import {
  disableBodyScroll,
  enableBodyScroll,
  clearAllBodyScrollLocks,
} from "body-scroll-lock";

interface NavEntryProps {
  href: string;
  children: string;
}

function NavEntry({ href, children }: NavEntryProps) {
  const isExternal = href.startsWith("http");
  const Component = isExternal ? "a" : NextComposedLink;

  const positionChars = useCallback((elm: HTMLElement) => {
    const chars = elm.querySelectorAll("[data-animate-char]");
    const refNode = elm.querySelector("[data-animate-sub-text]") as HTMLElement;
    const refText = refNode.firstChild as Text;
    const range = document.createRange();
    range.setStartBefore(refText);
    chars.forEach((char, i) => {
      const charEl = char as HTMLElement;
      range.setEnd(refText, i);
      const refLength = range.getBoundingClientRect().width;
      charEl.style.left = `${(refLength / refNode.clientWidth) * 100}%`;
    });
  }, []);

  return (
    <Component
      href={href}
      className={classes.navEntry}
      ref={(elm) => elm && positionChars(elm)}
    >
      <span className={classes.mainNavText}>
        {[...children].map((char, i) => (
          <span key={i} data-animate-char>
            {char}
          </span>
        ))}
      </span>
      <span className={classes.subNavText} data-animate-sub-text>
        {children}
      </span>
    </Component>
  );
}

export function NavPanel() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline>();
  const togglePanel = useCallback(
    (open: boolean) => {
      setIsPanelOpen(open);
      if (open) {
        timelineRef.current?.restart();
        disableBodyScroll(document.body);
      } else {
        enableBodyScroll(document.body);
      }
    },
    [setIsPanelOpen]
  );

  useEffect(() => {
    return () => {
      clearAllBodyScrollLocks();
    };
  }, []);

  const buildTimeline = useCallback(
    (navEl: HTMLElement) => {
      if (!navEl) return;

      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline();
      navEl.querySelectorAll("a").forEach((elm, i) => {
        tl.staggerFromTo(
          elm.querySelectorAll("[data-animate-char]"),
          0.3,
          // Reveal from bottom
          {
            y: "100%",
            opacity: 0,
          },
          // To top
          {
            y: "0%",
            opacity: 1,
            ease: "power4.out",
          },
          0.05,
          "<+0.2"
        );
      });
      timelineRef.current = tl;
    },
    [timelineRef]
  );

  return (
    <>
      <Portal>
        <div
          className={clsx(isPanelOpen && classes.open, classes.panelBackdrop)}
          onClick={() => togglePanel(false)}
        >
          <header
            className={clsx("container verticalPadding", classes.navPanel)}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Close menu">
              <IconButton
                onClick={() => togglePanel(false)}
                data-nav-icon="close"
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
            <nav className={classes.nav} ref={(elm) => buildTimeline(elm)}>
              <NavEntry href={jukeboxUrl}>Jukebox</NavEntry>
              <NavEntry href="/screensaver">Screensavers</NavEntry>
              <NavEntry href="/search">Search</NavEntry>
              <NavEntry href="/tags">Tags</NavEntry>
              <NavEntry href="/login">Log in</NavEntry>
              <NavEntry href="https://1a23.com">1A23 Studio</NavEntry>
            </nav>
            <NextComposedLink className={classes.titleContainer} href="/">
              <Title />
            </NextComposedLink>
          </header>
        </div>
      </Portal>
      <Tooltip title="Menu">
        <IconButton onClick={() => togglePanel(true)}>
          <MenuIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}

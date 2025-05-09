"use client";

import { Root as Portal } from "@radix-ui/react-portal";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import classes from "./NavPanel.module.scss";
import { Title } from "./Title";
import { jukeboxUrl } from "../../../utils/consts";
import gsap from "gsap";
import {
  disableBodyScroll,
  enableBodyScroll,
  clearAllBodyScrollLocks,
} from "body-scroll-lock";
import { usePathname } from "next/navigation";
import { Link } from "../Link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Button } from "@lyricova/components/components/ui/button";
import { Menu, X } from "lucide-react";

interface NavEntryProps {
  href: string;
  children: string;
  rel?: string;
}

function NavEntry({ href, children, rel }: NavEntryProps) {
  const isExternal = href.startsWith("http");
  const Component = isExternal ? "a" : Link;
  const pathname = usePathname();

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
      data-active={pathname.startsWith(href)}
      ref={(elm) => elm && positionChars(elm)}
      rel={rel}
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
  const timelineRef = useRef<gsap.core.Timeline>(null);
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

      const tl = gsap.timeline({
        delay: 0.1,
      });
      navEl.querySelectorAll("a").forEach((elm, i) => {
        tl.fromTo(
          elm.querySelectorAll("[data-animate-char]"),
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
            duration: 0.3,
            stagger: 0.025,
          },
          "<+0.05"
        );
      });
      timelineRef.current = tl;
    },
    [timelineRef]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPanelOpen && e.key === "Escape") {
        togglePanel(false);
      }
    };
    document.body.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, togglePanel]);

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghostBright"
                  size="icon"
                  onClick={() => togglePanel(false)}
                  data-nav-icon="close"
                >
                  <X />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close menu</TooltipContent>
            </Tooltip>
            <nav className={classes.nav} ref={(elm) => buildTimeline(elm)}>
              <NavEntry href={jukeboxUrl}>Jukebox</NavEntry>
              <NavEntry href="/screensavers">Screensavers</NavEntry>
              <NavEntry href="/search" rel="search">
                Search
              </NavEntry>
              <NavEntry href="/tags">Tags</NavEntry>
              <NavEntry href="/login">Log in</NavEntry>
              <NavEntry href="https://1a23.com">1A23 Studio</NavEntry>
            </nav>
            <Link className={classes.titleContainer} href="/">
              <Title />
            </Link>
          </header>
        </div>
      </Portal>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghostBright"
            size="icon"
            onClick={() => togglePanel(true)}
            data-nav-icon="menu"
          >
            <Menu />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Menu</TooltipContent>
      </Tooltip>
    </>
  );
}

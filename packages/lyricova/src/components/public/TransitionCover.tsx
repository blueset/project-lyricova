import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  disableBodyScroll,
  enableBodyScroll,
  clearAllBodyScrollLocks,
} from "body-scroll-lock";
import classes from "./TransitionCover.module.scss";
const IS_SERVER = typeof window === "undefined";
const useIsomorphicLayoutEffect = IS_SERVER ? useEffect : useLayoutEffect;

/// <reference types="../../types/global" />

function buildTimeline(
  elm: HTMLDivElement,
  top: number
): [gsap.core.Timeline, gsap.core.Timeline] {
  const cover1 = elm.querySelector<HTMLDivElement>("." + classes.cover1);
  const cover2 = elm.querySelector<HTMLDivElement>("." + classes.cover2);
  const cover3 = elm.querySelector<HTMLDivElement>("." + classes.cover3);
  const logoContainer = elm.querySelector<HTMLDivElement>(
    "." + classes.logoContainer
  );
  const paths = logoContainer.querySelectorAll("path");

  paths.forEach((path) => {
    const length = path.getTotalLength();
    path.setAttribute("stroke-dasharray", length.toString());
    path.setAttribute("stroke-dashoffset", length.toString());
  });

  const startTimeline = gsap.timeline({
    paused: true,
    defaults: {
      duration: 0.5,
      ease: "power3.in",
    },
    onComplete: () => startTimeline.play("revealLogo"),
  });
  startTimeline
    .set(elm, { y: top, display: "block" }, 0)
    .fromTo(
      cover1,
      { y: "-50%", scaleY: 0, transformOrigin: "center" },
      { scaleY: 2 }
    )
    .fromTo(
      cover2,
      { y: "-50%", scaleY: 0, transformOrigin: "center" },
      { scaleY: 2 },
      "<+0.1"
    )
    .fromTo(
      cover3,
      { y: "-50%", scaleY: 0, transformOrigin: "center" },
      { scaleY: 2 },
      "<+0.1"
    )
    .addLabel("revealLogo")
    .set(logoContainer, { y: -top, opacity: 1 })
    .fromTo(
      paths,
      { strokeDashoffset: (idx, target) => target.getTotalLength() },
      { strokeDashoffset: 0, duration: 0.5, stagger: 0.025 },
      "+1.5"
    )
    .fromTo(
      paths,
      { attr: { "fill-opacity": 0, "stroke-opacity": 1 } },
      {
        attr: { "fill-opacity": 1, "stroke-opacity": 0 },
        duration: 1,
        stagger: 0.025,
      },
      "<-0.2"
    )
    .to(
      paths,
      { attr: { "fill-opacity": 0 }, duration: 1, stagger: 0.025 },
      ">+0.5"
    );

  const endTimeline = gsap
    .timeline({
      paused: true,
      defaults: {
        duration: 1,
        ease: "power3.out",
      },
    })
    .set(elm, { y: 0, display: "block" }, 0)
    .set(
      [cover1, cover2, cover3],
      { y: "50%", scaleY: 2, transformOrigin: "bottom" },
      0
    )
    .fromTo(
      logoContainer,
      { y: 0, opacity: 1 },
      { opacity: 0, duration: 0.25 },
      0
    )
    .to(cover3, { scaleY: 0 }, "<")
    .to(cover2, { scaleY: 0 }, "<+0.1")
    .to(cover1, { scaleY: 0 }, "<+0.1")
    .set(elm, { display: "none" });

  return [startTimeline, endTimeline];
}

export function TransitionCover() {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<[gsap.core.Timeline, gsap.core.Timeline]>();
  const currentRouteRef = useRef<string>();
  currentRouteRef.current = router.asPath;

  useIsomorphicLayoutEffect(() => {
    const handleRouteChange = (path: string) => {
      // console.log("handleRouteChange", window.lastClickTop);
      if (coverRef.current) {
        if (timelineRef.current) {
          timelineRef.current[0].kill();
          timelineRef.current[1].kill();
        }
        // console.log(path, currentRouteRef.current);
        if (path === currentRouteRef.current) {
          timelineRef.current = null;
          return;
        }
        timelineRef.current = buildTimeline(
          coverRef.current,
          window.lastClickTop ?? window.innerHeight / 2
        );
        timelineRef.current[0].play();
        disableBodyScroll(document.body);
      }
    };
    const handleRouteChangeComplete = () => {
      // console.log("handleRouteChangeComplete", window.lastClickTop);
      if (timelineRef.current) {
        const timeout =
          Math.max(0, 0.75 - timelineRef.current[0].progress()) * 1000;
        // console.log("timeout", timeout);
        setTimeout(() => {
          timelineRef.current[0].pause();
          timelineRef.current[1].play();
          enableBodyScroll(document.body);
        }, timeout);
      }
      window.lastClickTop = undefined;
    };
    // const onKeyPress = (evt: KeyboardEvent) => {
    //   if (evt.key === "1") {
    //     handleRouteChange();
    //   } else if (evt.key === "2") {
    //     handleRouteChangeComplete();
    //   }
    // };
    router.events.on("routeChangeStart", handleRouteChange);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);
    router.events.on("routeChangeError", handleRouteChangeComplete);
    // window.addEventListener("keypress", onKeyPress);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      router.events.off("routeChangeError", handleRouteChangeComplete);
      // window.removeEventListener("keypress", onKeyPress);
      clearAllBodyScrollLocks();
    };
  }, [router]);

  async function onFontLoading(elm: HTMLDivElement) {
    if (timelineRef.current) {
      timelineRef.current[0].kill();
      timelineRef.current[1].kill();
    }

    const isIosDevice =
      typeof window !== "undefined" &&
      window.navigator?.platform &&
      (/iP(ad|hone|od)/.test(window.navigator.platform) ||
        (window.navigator.platform === "MacIntel" &&
          window.navigator.maxTouchPoints > 1));
    if (isIosDevice) return;

    timelineRef.current = buildTimeline(
      elm,
      window.lastClickTop ?? window.innerHeight / 2
    );
    // console.log("startTimeline", timelineRef.current);
    timelineRef.current[0].play("revealLogo");
    disableBodyScroll(document.body);

    // await document.fonts.ready;
    const promises: Promise<any>[] = [];
    document.fonts.forEach((f) => promises.push(f.loaded));
    await Promise.race(promises);
    promises.splice(0, promises.length);
    document.fonts.forEach(
      (f) => f.status === "loading" && promises.push(f.loaded)
    );
    if (promises.length) await Promise.all(promises);

    // console.log("stopTimeline", timelineRef.current);
    timelineRef.current[0].pause();
    timelineRef.current[1].play();
    enableBodyScroll(document.body);
  }

  // console.log(
  //   typeof document === "undefined" ? typeof document : document?.fonts.status
  // );
  // typeof document !== "undefined" &&
  // document?.fonts.forEach((f) => console.log(f, f.status));
  const coverElm =
    coverRef.current ||
    ((typeof document !== "undefined"
      ? document.getElementById("transitionCover")
      : undefined) as HTMLDivElement);
  // console.log("coverElm", coverElm);
  if (coverElm) {
    let isLoaded = false;
    if (typeof document !== "undefined") {
      isLoaded = true;
      document.fonts.forEach(
        (f) => (isLoaded = isLoaded && f.status === "loaded")
      );
    }
    // console.log("isLoaded", isLoaded);
    if (!isLoaded) {
      onFontLoading(coverElm);
    }
  }

  return (
    <div ref={coverRef} className={classes.cover} id="transitionCover">
      <div className={classes.cover1} />
      <div className={classes.cover2} />
      <div className={classes.cover3} />
      <div className={classes.logoContainer}>
        <svg
          width="225"
          height="90"
          viewBox="0 0 225 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.647949 34.9998V0.0078125H20.3279C23.8479 0.0078125 26.68 0.535812 28.824 1.59181C30.968 2.61581 32.5199 4.05581 33.4799 5.91181C34.4719 7.73581 34.9679 9.86381 34.9679 12.2958C34.9679 14.8878 34.392 17.0958 33.24 18.9198C32.088 20.7118 30.408 22.1038 28.2 23.0958C26.024 24.0558 23.3519 24.5358 20.1839 24.5358H8.75995V17.6718H18.792C20.4239 17.6718 21.7199 17.4958 22.68 17.1438C23.6399 16.7598 24.3279 16.2158 24.7439 15.5118C25.1919 14.8078 25.4159 13.9758 25.4159 13.0158V11.7198C25.4159 10.6638 25.1759 9.79981 24.6959 9.12781C24.2479 8.42381 23.528 7.89581 22.5359 7.54381C21.576 7.19181 20.328 7.01581 18.792 7.01581H9.57595V34.9998H0.647949Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M39.3062 35V15.608C39.3062 13.56 39.9462 11.992 41.2262 10.904C42.5062 9.81597 44.1862 9.27197 46.2662 9.27197H58.1222V15.272H47.5622V35H39.3062Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M74.6323 35.48C71.7203 35.48 69.1443 35 66.9043 34.04C64.6643 33.08 62.9203 31.624 61.6723 29.672C60.4243 27.72 59.8003 25.272 59.8003 22.328V21.896C59.8003 18.952 60.4243 16.504 61.6723 14.552C62.9523 12.6 64.6963 11.16 66.9043 10.232C69.1443 9.27199 71.7203 8.79199 74.6323 8.79199C77.5443 8.79199 80.1203 9.27199 82.3603 10.232C84.6003 11.16 86.3443 12.6 87.5923 14.552C88.8403 16.504 89.4643 18.952 89.4643 21.896V22.328C89.4643 25.272 88.8403 27.72 87.5923 29.672C86.3443 31.624 84.6003 33.08 82.3603 34.04C80.1523 35 77.5763 35.48 74.6323 35.48ZM74.6323 29.432C76.0403 29.432 77.2083 29.192 78.1363 28.712C79.0643 28.232 79.7683 27.576 80.2483 26.744C80.7603 25.912 81.0163 24.952 81.0163 23.864V20.408C81.0163 19.32 80.7763 18.36 80.2963 17.528C79.8163 16.664 79.0963 16.008 78.1363 15.56C77.2083 15.08 76.0403 14.84 74.6323 14.84C73.2563 14.84 72.0883 15.08 71.1283 15.56C70.2003 16.008 69.4963 16.664 69.0163 17.528C68.5363 18.36 68.2963 19.32 68.2963 20.408V23.864C68.2963 24.952 68.5363 25.912 69.0163 26.744C69.4963 27.576 70.2003 28.232 71.1283 28.712C72.0883 29.192 73.2563 29.432 74.6323 29.432Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M87.8652 43.0158V36.8238H94.0092V9.27181H102.265V36.5358C102.265 38.7438 101.577 40.3758 100.201 41.4318C98.8252 42.4878 97.0492 43.0158 94.8732 43.0158H87.8652ZM94.0092 5.91181V0.0078125H102.265V5.91181H94.0092Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M121.792 35.48C118.752 35.48 116.112 34.984 113.872 33.992C111.632 32.968 109.888 31.48 108.64 29.528C107.424 27.544 106.816 25.112 106.816 22.232V21.944C106.816 19 107.44 16.552 108.688 14.6C109.968 12.648 111.728 11.192 113.968 10.232C116.208 9.27199 118.816 8.79199 121.792 8.79199C124.48 8.79199 126.896 9.23999 129.04 10.136C131.184 11.032 132.88 12.376 134.128 14.168C135.408 15.96 136.048 18.152 136.048 20.744V24.008H115.36C115.36 24.136 115.36 24.296 115.36 24.488C115.36 24.68 115.36 24.808 115.36 24.872C115.36 25.928 115.6 26.824 116.08 27.56C116.592 28.296 117.328 28.872 118.288 29.288C119.248 29.672 120.416 29.864 121.792 29.864C123.456 29.864 124.832 29.56 125.92 28.952C127.008 28.344 127.632 27.576 127.792 26.648H135.664C135.504 28.408 134.832 29.96 133.648 31.304C132.464 32.616 130.848 33.64 128.8 34.376C126.784 35.112 124.448 35.48 121.792 35.48ZM115.36 20.552L114.064 19.352H129.184L127.888 20.552V18.92C127.888 17.384 127.312 16.216 126.16 15.416C125.04 14.584 123.552 14.168 121.696 14.168C120.512 14.168 119.44 14.36 118.48 14.744C117.52 15.096 116.752 15.624 116.176 16.328C115.632 17.032 115.36 17.896 115.36 18.92V20.552Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M153.852 35.48C150.94 35.48 148.348 35 146.076 34.04C143.836 33.08 142.092 31.624 140.844 29.672C139.596 27.72 138.972 25.272 138.972 22.328V21.896C138.972 18.952 139.596 16.504 140.844 14.552C142.124 12.6 143.884 11.16 146.124 10.232C148.364 9.27199 150.94 8.79199 153.852 8.79199C156.732 8.79199 159.196 9.20799 161.244 10.04C163.324 10.872 164.956 12.04 166.14 13.544C167.324 15.048 167.964 16.792 168.06 18.776H159.852C159.66 17.464 159.02 16.488 157.932 15.848C156.844 15.176 155.484 14.84 153.852 14.84C152.444 14.84 151.26 15.08 150.3 15.56C149.372 16.008 148.668 16.664 148.188 17.528C147.708 18.36 147.468 19.32 147.468 20.408V23.864C147.468 24.952 147.708 25.912 148.188 26.744C148.668 27.576 149.388 28.232 150.348 28.712C151.308 29.192 152.476 29.432 153.852 29.432C155.612 29.432 157.02 29.064 158.076 28.328C159.132 27.592 159.724 26.632 159.852 25.448H168.108C168.076 27.368 167.452 29.096 166.236 30.632C165.052 32.136 163.404 33.32 161.292 34.184C159.18 35.048 156.7 35.48 153.852 35.48Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M180.413 34.9997C178.813 34.9997 177.549 34.5837 176.621 33.7517C175.693 32.8877 175.229 31.6557 175.229 30.0557V12.5357H183.485V29.0957H189.965V34.9997H180.413ZM169.661 15.2717V9.27167H175.229V1.15967H183.485V9.27167H190.013V15.2717H169.661Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M0.647949 80.9998V46.0078H9.57595V75.4318L8.03995 73.8958H29.688V80.9998H0.647949Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M27.4017 89.016V82.824H39.4977V77.352L26.4897 55.272H35.1777L42.1857 68.328L43.2897 70.632H43.6737L44.7777 68.328L51.9777 55.272H60.7617L47.7537 77.352V82.632C47.7537 84.776 47.0977 86.376 45.7857 87.432C44.5057 88.488 42.7937 89.016 40.6497 89.016H27.4017Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M63.8687 81V61.608C63.8687 59.56 64.5087 57.992 65.7887 56.904C67.0687 55.816 68.7487 55.272 70.8287 55.272H82.6847V61.272H72.1247V81H63.8687Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M86.4624 80.9997V55.2717H94.7184V80.9997H86.4624ZM86.4624 51.9597V46.0557H94.7184V51.9597H86.4624Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M114.149 81.48C111.237 81.48 108.645 81 106.373 80.04C104.133 79.08 102.389 77.624 101.141 75.672C99.893 73.72 99.269 71.272 99.269 68.328V67.896C99.269 64.952 99.893 62.504 101.141 60.552C102.421 58.6 104.181 57.16 106.421 56.232C108.661 55.272 111.237 54.792 114.149 54.792C117.029 54.792 119.493 55.208 121.541 56.04C123.621 56.872 125.253 58.04 126.437 59.544C127.621 61.048 128.261 62.792 128.357 64.776H120.149C119.957 63.464 119.317 62.488 118.229 61.848C117.141 61.176 115.781 60.84 114.149 60.84C112.741 60.84 111.557 61.08 110.597 61.56C109.669 62.008 108.965 62.664 108.485 63.528C108.005 64.36 107.765 65.32 107.765 66.408V69.864C107.765 70.952 108.005 71.912 108.485 72.744C108.965 73.576 109.685 74.232 110.645 74.712C111.605 75.192 112.773 75.432 114.149 75.432C115.909 75.432 117.317 75.064 118.373 74.328C119.429 73.592 120.021 72.632 120.149 71.448H128.405C128.373 73.368 127.749 75.096 126.533 76.632C125.349 78.136 123.701 79.32 121.589 80.184C119.477 81.048 116.997 81.48 114.149 81.48Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M145.882 81.48C142.97 81.48 140.394 81 138.154 80.04C135.914 79.08 134.17 77.624 132.922 75.672C131.674 73.72 131.05 71.272 131.05 68.328V67.896C131.05 64.952 131.674 62.504 132.922 60.552C134.202 58.6 135.946 57.16 138.154 56.232C140.394 55.272 142.97 54.792 145.882 54.792C148.794 54.792 151.37 55.272 153.61 56.232C155.85 57.16 157.594 58.6 158.842 60.552C160.09 62.504 160.714 64.952 160.714 67.896V68.328C160.714 71.272 160.09 73.72 158.842 75.672C157.594 77.624 155.85 79.08 153.61 80.04C151.402 81 148.826 81.48 145.882 81.48ZM145.882 75.432C147.29 75.432 148.458 75.192 149.386 74.712C150.314 74.232 151.018 73.576 151.498 72.744C152.01 71.912 152.266 70.952 152.266 69.864V66.408C152.266 65.32 152.026 64.36 151.546 63.528C151.066 62.664 150.346 62.008 149.386 61.56C148.458 61.08 147.29 60.84 145.882 60.84C144.506 60.84 143.338 61.08 142.378 61.56C141.45 62.008 140.746 62.664 140.266 63.528C139.786 64.36 139.546 65.32 139.546 66.408V69.864C139.546 70.952 139.786 71.912 140.266 72.744C140.746 73.576 141.45 74.232 142.378 74.712C143.338 75.192 144.506 75.432 145.882 75.432Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M172.481 81L161.489 55.272H170.033L177.473 74.472H177.809L185.249 55.272H193.793L182.801 81H172.481Z"
            fill="currentColor"
            strokeWidth="1"
          />
          <path
            d="M206.663 81.48C204.135 81.48 201.959 80.952 200.135 79.896C198.311 78.808 196.919 77.288 195.959 75.336C194.999 73.384 194.519 71.128 194.519 68.568V67.704C194.519 65.656 194.807 63.832 195.383 62.232C195.991 60.632 196.839 59.272 197.927 58.152C199.047 57.032 200.375 56.2 201.911 55.656C203.447 55.08 205.159 54.792 207.047 54.792C209.159 54.792 211.015 55.16 212.615 55.896C214.247 56.632 215.383 57.624 216.023 58.872H216.455L216.791 55.272H224.663V81H216.407L216.455 77.352H216.023C215.319 78.6 214.119 79.608 212.423 80.376C210.759 81.112 208.839 81.48 206.663 81.48ZM209.591 75.384C211.703 75.384 213.335 74.84 214.487 73.752C215.671 72.664 216.263 71.208 216.263 69.384V66.84C216.263 65.592 215.991 64.52 215.447 63.624C214.935 62.728 214.183 62.04 213.191 61.56C212.231 61.08 211.031 60.84 209.591 60.84C208.311 60.84 207.191 61.064 206.231 61.512C205.303 61.928 204.583 62.584 204.071 63.48C203.559 64.344 203.303 65.432 203.303 66.744V69.432C203.303 70.776 203.559 71.896 204.071 72.792C204.583 73.656 205.303 74.312 206.231 74.76C207.191 75.176 208.311 75.384 209.591 75.384Z"
            fill="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

import Head from "next/head";
import { siteName } from "../utils/consts";
import classes from "./404.module.scss";
import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

const statusCodes = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy Deprecated",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Content",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
} as const;

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const codes = container.querySelector(`.${classes.codes}`);
    const messages = container.querySelector(`.${classes.messages}`);
    const code404 = codes?.querySelector('div[aria-hidden="false"]');
    const message404 = messages?.querySelector('div[aria-hidden="false"]');
    const caption = container.querySelector(`.${classes.caption}`);

    const em = parseFloat(getComputedStyle(container).fontSize);
    const height = container.clientHeight;
    const lineHeight = code404.clientHeight;
    const codeTop =
      code404.getBoundingClientRect().top - codes.getBoundingClientRect().top;
    const messageBottom =
      messages.getBoundingClientRect().bottom -
      message404.getBoundingClientRect().bottom;

    const tl = gsap.timeline();
    tl.fromTo(
      codes,
      { top: 0 },
      {
        duration: 6,
        top: -codeTop + height / 2 - lineHeight / 2,
        ease: "elastic(1, 0.5)",
      }
    );
    tl.fromTo(
      messages,
      { bottom: 0 },
      {
        duration: 6,
        bottom: -messageBottom + height / 2 - lineHeight / 2,
        ease: "elastic(1, 0.5)",
      },
      "<"
    );
    tl.fromTo(
      caption,
      { x: "-120%", opacity: 0 },
      { x: 0, opacity: 1, duration: 1, ease: "power4.out" },
      ">-0.5"
    );
    tl.set(codes, { top: `calc(${-codeTop / em}em + 50% - 0.55em)` });
    tl.set(messages, {
      bottom: `calc(${-messageBottom / em}em + 50% - 0.55em)`,
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <>
      <Head>
        <title>{`404 Not Found – ${siteName}`}</title>
      </Head>
      <div className={classes.container} ref={containerRef}>
        <div className={classes.codes}>
          {Object.keys(statusCodes).map((code) => (
            <div aria-hidden={code !== "404"} key={code}>
              {code}
            </div>
          ))}
        </div>
        <div className={classes.messages}>
          {Object.values(statusCodes).map((message) => (
            <div aria-hidden={message !== "Not Found"} key={message}>
              {message}
            </div>
          ))}
        </div>
        <div className={classes.caption}>
          Oops! That’s awkward.
          <br />
          Return to <Link href="/">{siteName}</Link>
        </div>
      </div>
      <style jsx global>
        {":root, body, #__next { height: 100%; }"}
      </style>
    </>
  );
}

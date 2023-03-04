import { Fragment, useEffect, useRef } from "react";
import classes from "./PlainTextHangingPunct.module.scss";

function CollapsedSpan({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.marginLeft = -ref.current.offsetWidth + "px";
    }
  }, [ref, children]);
  if (!children) return null;
  return <span ref={ref}>{children}</span>;
}

interface PlainTextHangingPunctProps {
  children: string;
}

export function PlainTextHangingPunct({
  children,
}: PlainTextHangingPunctProps) {
  const lines = children
    .split("\n")
    .map((line) => line.match(/^(\p{P}*)(.*?)(\p{P}*)$/u));
  return (
    <>
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          <CollapsedSpan>{line[1]}</CollapsedSpan>
          {line[2]}
          {line[3] && <span className={classes.hangingRight}>{line[3]}</span>}
          <br />
        </Fragment>
      ))}
    </>
  );
}

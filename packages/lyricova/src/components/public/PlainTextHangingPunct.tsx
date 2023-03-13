import { Fragment, useEffect, useRef } from "react";
import classes from "./PlainTextHangingPunct.module.scss";

function CollapsedSpan({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      const width = ref.current.offsetWidth;
      const fontSize = parseFloat(
        window.getComputedStyle(ref.current).fontSize
      );
      ref.current.style.marginLeft = -width / fontSize + "em";
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
    .map((line) => line.match(/^([\p{Ps}\p{Pi}"]*)(.*?)(\p{Po}*)$/u));
  return (
    <>
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {idx > 0 && <br />}
          <CollapsedSpan>{line[1]}</CollapsedSpan>
          {line[2]}
          {line[3] && <span className={classes.hangingRight}>{line[3]}</span>}
        </Fragment>
      ))}
    </>
  );
}

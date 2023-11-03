import { Fragment, useEffect, useRef } from "react";
import classes from "./PlainTextHangingPunct.module.scss";

function CollapsedSpan({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLSpanElement;
          const width = target.offsetWidth;
          const fontSize = parseFloat(window.getComputedStyle(target).fontSize);
          target.style.marginLeft = -width / fontSize + "em";
        }
      });
      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, [ref, children]);
  if (!children) return null;
  return (
    <span ref={ref} className={classes.hangingLeft}>
      {children}
    </span>
  );
}

interface PlainTextHangingPunctProps {
  children: string;
}

function shiftinPuncts(line: string, match: RegExpMatchArray | null, start: string, end: string ): RegExpMatchArray | null {
  if (match && line.match(new RegExp(`${start}.*${end}`, "g"))) {
    const front = match[1].split(start);
    const back = match[3].split(end);
    match[2] = `${start.repeat(front.length - 1)}${match[2]}${end.repeat(back.length - 1)}`;
    match[1] = front.join("");
    match[3] = back.join("");
  }
  return match;
}

export function PlainTextHangingPunct({
  children,
}: PlainTextHangingPunctProps) {
  const lines = children
    .split("\n")
    .map((line) => {
      let match = line.match(/^([\p{Ps}\p{Pi}"]*)(.*?)(\p{Po}*)$/u);
      match = shiftinPuncts(line, match, "「", "」");
      match = shiftinPuncts(line, match, "『", "』");
      match = shiftinPuncts(line, match, "｢", "｣");
      return match;
    });
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

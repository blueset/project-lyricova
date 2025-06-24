export function shiftinPuncts(
  line: string,
  match: RegExpMatchArray | null,
  start: string,
  end: string
): RegExpMatchArray | null {
  if (match && line.match(new RegExp(`${start}.*${end}`, "g"))) {
    const front = match[1]?.split(start) ?? [];
    const back = match[3]?.split(end) ?? [];
    match[2] = `${start.repeat(front.length - 1)}${match[2]}${end.repeat(
      Math.max(back.length - 1, 0)
    )}`;
    match[1] = front.join("");
    match[3] = back.join("");
  }
  return match;
}

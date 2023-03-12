import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import classes from "./BaseVerseRenderer.module.scss";

interface BaseVerseRendererProps {
  children: string;
  renderMode: "plain" | "stylized" | "html";
}

export function BaseVerseRenderer({
  children,
  renderMode,
}: BaseVerseRendererProps) {
  if (renderMode === "plain") {
    return <PlainTextHangingPunct>{children}</PlainTextHangingPunct>;
  } else if (renderMode === "stylized") {
    return <span className={classes.stylized}>{children}</span>;
  }
  return <span dangerouslySetInnerHTML={{ __html: children }} />;
}

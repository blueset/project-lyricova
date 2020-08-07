import style from "./DetailsPanel.module.scss";
import { CSSProperties } from "react";

interface Props {
  blur: boolean;
}
export default function DetailsPanel({ blur }: Props) {
  const inlineStyle: CSSProperties = {};
  if (blur) {
    inlineStyle.backdropFilter = "blur(16px)";
  }
  return (
    <div className={style.root} style={inlineStyle}>
      aa
    </div>
  );
}

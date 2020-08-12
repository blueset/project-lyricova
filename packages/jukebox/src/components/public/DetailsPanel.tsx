import style from "./DetailsPanel.module.scss";
import { CSSProperties, ReactNode } from "react";

interface Props {
  blur: boolean;
  children?: ReactNode;
}

export default function DetailsPanel({ blur, children }: Props) {
  const inlineStyle: CSSProperties = {};
  if (blur) {
    inlineStyle.backdropFilter = "blur(16px)";
  }
  return (
    <div className={style.root} style={inlineStyle}>
      {children}
    </div>
  );
}

DetailsPanel.defaults = {
  blur: false
};
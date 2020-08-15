import type { StyleRules } from "@material-ui/styles/withStyles";

export type BlendStyleParams = {
  coverUrl: string | null;
};

type Params = {
  filterName?: string;
}

type Props = BlendStyleParams;
type ValuesOf<T> = T[keyof T];
export const blendStyleProperties: (params?: Params) => ValuesOf<StyleRules<Props>> = ({ filterName } = {}) => {
  return {
    filter: ({ coverUrl }) => coverUrl ? `url(${filterName || "#sharpBlurBrighter"})` : null,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundImage: ({ coverUrl }) => coverUrl ? `url(${coverUrl})` : null,
    "-webkit-background-clip": ({ coverUrl }) => coverUrl ? "text" : null,
    backgroundClip: ({ coverUrl }) => coverUrl ? "text" : null,
    color: ({ coverUrl }) => coverUrl ? "transparent" : "rgba(255,255,255,0.6)",
    mixBlendMode: ({ coverUrl }) => coverUrl ? null : "hard-light",
  };
};
import type { StyleRules } from "@material-ui/styles/withStyles";

export type BlendStyleParams = {
  coverUrl: string | null;
};

type Params = {
  filterName?: string;
  color?: string;
}

type Props = BlendStyleParams;
type ValuesOf<T> = T[keyof T];
export const blendStyleProperties: (params?: Params) => ValuesOf<StyleRules<Props>> = ({ filterName, color } = {}) => {
  return {
    filter: ({ coverUrl }) => coverUrl ? `url(${filterName || "#sharpBlurBrighter"})` : null,
    backgroundImage: ({ coverUrl }) => coverUrl ? `url(${coverUrl})` : null,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    "-webkit-background-clip": ({ coverUrl }) => coverUrl ? "text" : null,
    backgroundClip: ({ coverUrl }) => coverUrl ? "text" : null,
    color: ({ coverUrl }) => coverUrl ? "transparent" : color || null,
    mixBlendMode: ({ coverUrl }) => coverUrl ? null : "hard-light",
  };
};
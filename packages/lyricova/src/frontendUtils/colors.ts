import Color from "colorjs.io";
import type { Tag } from "lyricova-common/models/Tag";

function stringifyColor(color: Color) {
  return color.to("srgb").toString();
}

export function generateColorGradient(tags: Tag[], forceGradient = true) {
  if (tags.length === 0) return "";
  if (tags.length === 1 && !forceGradient) return tags[0].color;
  const colorObjs = tags.map((tag) => new Color(tag.color));
  if (forceGradient && tags.length === 1) {
    colorObjs.push(colorObjs[0].clone());
    colorObjs[1].lch.l += 15;
  }
  const steps = colorObjs
    .map<Color[]>((color, i) => {
      if (i === 0) return [];
      return colorObjs[i - 1].steps(color, {
        space: "lch",
        hue: "shorter",
        steps: 5,
      });
    })
    .flat();
  const stepStrs = steps.map((step) => stringifyColor(step));
  return `linear-gradient(to right, ${stepStrs.join(", ")})`;
}

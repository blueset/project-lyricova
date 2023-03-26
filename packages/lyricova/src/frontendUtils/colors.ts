import Color from "colorjs.io";
import type { Tag } from "lyricova-common/models/Tag";

function stringifyColor(color: Color) {
  return color.to("srgb").toString();
}

export function generateColorGradientFunction(
  tags: Pick<Tag, "color">[],
  forceGradient = true
) {
  if (tags.length === 0) return () => "white";
  if (tags.length === 1 && !forceGradient)
    return (pos: number) => tags[0].color;
  const colorObjs = tags.map((tag) => new Color(tag.color));
  if (forceGradient && tags.length === 1) {
    colorObjs.push(colorObjs[0].clone());
    colorObjs[1].lch.l += 15;
  }
  const ranges = colorObjs
    .slice(0, -1)
    .map((color, i) =>
      color.range(colorObjs[i + 1], { space: "lch", hue: "shorter" })
    );
  return (pos: number) =>
    stringifyColor(
      ranges[Math.floor(pos * ranges.length)](
        (pos * ranges.length) % 1
      ) as unknown as Color
    );
}

export function generateColorGradientSteps(
  tags: Pick<Tag, "color">[],
  forceGradient = true
) {
  if (tags.length === 0) return [];
  if (tags.length === 1 && !forceGradient) return [tags[0].color];
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
  return steps.map((step) => stringifyColor(step));
}

export function generateColorGradient(
  tags: Pick<Tag, "color">[],
  forceGradient = true
) {
  if (tags.length === 0) return "";
  if (tags.length === 1 && !forceGradient) return tags[0].color;
  return `linear-gradient(to right, ${generateColorGradientSteps(
    tags,
    forceGradient
  ).join(", ")})`;
}

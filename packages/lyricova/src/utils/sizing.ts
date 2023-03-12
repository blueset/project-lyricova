export const resizeVerse = (elm: HTMLElement) => {
  elm.style.whiteSpace = "nowrap";
  const containerWidth = elm.parentElement.scrollWidth;
  const fontSize = parseFloat(window.getComputedStyle(elm).fontSize);
  const containerHeight = elm.parentElement.scrollHeight;
  const max = containerHeight / fontSize < 5 ? 5 : 4;
  let scaledSize =
    Math.round(((containerWidth * 0.6) / elm.offsetWidth) * fontSize * 100) /
    100;
  scaledSize = (scaledSize * 100) / containerWidth;
  elm.style.whiteSpace = "unset";
  elm.style.fontSize = `clamp(1.75rem, ${scaledSize}vw, ${max}rem)`;
};

/**
 * Get the nearest parent which scrolls.
 *
 * @param element Element to look from.
 * @param includeHidden Whether to include `overflow: hidden` parents.
 * @author Web_Designer and StackOverflow community
 * @url https://stackoverflow.com/a/42543908/1989455
 */
export function getScrollParent(element: HTMLElement, includeHidden: boolean = true) {
  const style = getComputedStyle(element);
  const excludeStaticParent = style.position === "absolute";
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

  if (style.position === "fixed") return document.body;
  for (let parent = element; (parent = parent.parentElement);) {
    const style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === "static") {
      continue;
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
  }

  return document.body;
}
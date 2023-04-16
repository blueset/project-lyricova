/**
 * Measure the dimension of an element given its HTML code.
 *
 * Note: requires a `div` with ID `measure-layer` present in the current DOM
 * for it to apply proper styles.
 */
export function measureElement(element: string): {
  height: number;
  width: number;
} {
  const measureLayer =
    document.getElementById("measure-layer") || document.body;
  const container = document.createElement("div");
  container.style.display = "inline-block";
  container.style.position = "absolute";
  if (measureLayer === document.body) {
    container.style.zIndex = "-1";
    container.style.visibility = "hidden";
    container.style.top = "0";
    container.style.left = "0";
  }
  measureLayer.appendChild(container);

  container.innerHTML = element;

  // Gets the element size
  const height = container.clientHeight;
  const width = container.clientWidth;
  container.parentNode.removeChild(container);
  return { height, width };
}

export default measureElement;

function* recursivelyFindTextNode(el: Node): Generator<Node> {
  if (el.nodeType === Node.TEXT_NODE) {
    yield el;
  } else if (el.nodeType === Node.ELEMENT_NODE) {
    if (el.nodeName === "RUBY") {
      if (el.childNodes.length > 0) {
        yield* recursivelyFindTextNode(el.childNodes[0]);
      }
    } else {
      for (let i = 0; i < el.childNodes.length; i++) {
        yield* recursivelyFindTextNode(el.childNodes[i]);
      }
    }
  }
}

/**
 * Measure width per character in an element.
 *
 * The element must only have children of a mix of the following types
 * - `<span>text</span>`
 * - `<ruby>text<rt>...</rt></ruby>`
 *
 * Length is measured in a single line with `nowrap` wrap settings.
 *
 * @returns list of length in pixels for for the sum of length up to n-th character in the element.
 */
export function measureTextWidths(el: HTMLElement): number[] {
  if (!el) return [];

  const result: number[] = [];
  const oldWS = el.style.whiteSpace;
  const oldDisplay = el.style.display;
  const oldWidth = el.style.width;
  el.style.whiteSpace = "pre";
  el.style.display = "inline";
  el.style.width = "fit-content";

  const range = document.createRange();
  range.setStartBefore(el);
  const nodes = [...recursivelyFindTextNode(el)];
  for (const textNode of nodes) {
    const textLength = [...textNode.textContent].length;
    for (let i = 0; i < textLength; i++) {
      range.setEnd(textNode, i);
      const rect = range.getBoundingClientRect();
      if (rect.width !== 0) result.push(rect.width);
    }
  }
  range.setEndAfter(nodes.length > 0 ? nodes[nodes.length - 1] : el);
  const rect = range.getBoundingClientRect();
  result.push(rect.width);

  el.style.whiteSpace = oldWS;
  el.style.display = oldDisplay;
  el.style.width = oldWidth;

  return result;
}

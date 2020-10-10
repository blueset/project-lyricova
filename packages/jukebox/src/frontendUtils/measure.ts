/**
 * Measure the dimension of an element given its HTML code.
 * 
 * Note: requires a `div` with ID `measure-layer` present in the current DOM
 * for it to apply proper styles.
 */
export function measureElement(element: string): { height: number, width: number } {
  const measureLayer = document.getElementById("measure-layer") || document.body;
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

/**
 * Measure width per character in an element.
 *
 * The element must only have children of a mix of the following types
 * - `<span>text</span>`
 * - `<ruby>text<rt>...</rt></ruby>`
 *
 * Length is measured in a single line with `pre` wrap settings.
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

  const children = Array.from(el.childNodes);
  const baseOffsetLeft = el.offsetLeft;
  el.innerHTML = "";
  children.forEach(childNode => {
    if (childNode.nodeName === "RUBY") {
      const child = childNode as HTMLElement;
      el.appendChild(child);
      const widthBefore = child.offsetLeft - baseOffsetLeft;
      const textLength = [...child.childNodes[0].textContent].length;
      const width = child.offsetWidth;
      for (let i = 0; i < textLength; i++) {
        result.push(widthBefore + (width / textLength * (i + 1)));
      }
    } else if (childNode.nodeName === "SPAN") {
      const child = childNode as HTMLSpanElement;
      const chars = [...child.innerText];
      const clone = child.cloneNode() as HTMLSpanElement;
      el.appendChild(clone);
      chars.forEach(c => {
        clone.innerText += c;
        result.push(clone.offsetLeft - baseOffsetLeft + clone.offsetWidth);
      });
      el.removeChild(clone);
      el.appendChild(child);
    } else {
      throw new Error(`Unexpected element found during measurement: ${childNode}`);
    }
  });

  el.style.whiteSpace = oldWS;
  el.style.display = oldDisplay;
  el.style.width = oldWidth;

  return result;
}

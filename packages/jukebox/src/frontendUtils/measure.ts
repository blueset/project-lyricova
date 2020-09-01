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
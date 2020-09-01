export function measureElement(element: string) {
  const measureLayer = document.getElementById("measure-layer");
  const container = document.createElement("div");
  container.style.display = "inline-block";
  container.style.position = "absolute";
  measureLayer.appendChild(container);

  container.innerHTML = element;

  // Gets the element size
  const height = container.clientHeight;
  const width = container.clientWidth;
  container.parentNode.removeChild(container);
  return { height, width };
}

export default measureElement;
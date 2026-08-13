export function estimateJsonArrayLength(value: string) {
  const arrayStart = value.indexOf("[");
  if (arrayStart === -1) return 0;

  let arrayDepth = 1;
  let objectDepth = 0;
  let inString = false;
  let escaped = false;
  let rootString = false;
  let itemStarted = false;
  let itemCounted = false;
  let count = 0;

  const countCurrentItem = () => {
    if (itemStarted && !itemCounted) {
      count++;
      itemCounted = true;
    }
  };

  for (let index = arrayStart + 1; index < value.length; index++) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
        if (rootString) {
          countCurrentItem();
          rootString = false;
        }
      }
      continue;
    }

    const atRoot = arrayDepth === 1 && objectDepth === 0;

    if (character === '"') {
      if (atRoot && !itemStarted) {
        itemStarted = true;
        rootString = true;
      }
      inString = true;
    } else if (character === "{") {
      if (atRoot && !itemStarted) itemStarted = true;
      objectDepth++;
    } else if (character === "}") {
      if (objectDepth > 0) {
        objectDepth--;
        if (arrayDepth === 1 && objectDepth === 0) countCurrentItem();
      }
    } else if (character === "[") {
      if (atRoot && !itemStarted) itemStarted = true;
      arrayDepth++;
    } else if (character === "]") {
      if (atRoot) {
        countCurrentItem();
        return count;
      }
      arrayDepth--;
      if (arrayDepth === 1 && objectDepth === 0) countCurrentItem();
    } else if (atRoot && character === ",") {
      countCurrentItem();
      itemStarted = false;
      itemCounted = false;
    } else if (atRoot && !itemStarted && !/\s/.test(character)) {
      itemStarted = true;
    }
  }

  return count;
}

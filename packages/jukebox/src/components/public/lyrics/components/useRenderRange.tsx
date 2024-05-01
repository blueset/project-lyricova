const BUFFER_ROWS = 5;

function binarySearch(arr: number[], target: number, isEnd: boolean) {
  let left = 0;
  let right = arr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid] === target) {
      result = mid;
      break;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (result === -1) {
    if (isEnd) {
      result = left;
    } else {
      result = right;
    }
  }

  return result;
}

export function useRenderRange({
  scrollOffset,
  rowAccumulateHeight,
  containerSize,
}: {
  scrollOffset: number;
  rowAccumulateHeight: number[];
  containerSize: { width: number; height: number };
}) {
  const startRow = binarySearch(rowAccumulateHeight, scrollOffset, /* isEnd */ false);
  const endRow = binarySearch(rowAccumulateHeight, scrollOffset + containerSize.height, /* isEnd */ true);
  const renderStartRow = Math.max(0, startRow - BUFFER_ROWS);
  const renderEndRow = Math.min(rowAccumulateHeight.length - 1, endRow + BUFFER_ROWS);
  return {
    renderStartRow,
    renderEndRow,
  };
}
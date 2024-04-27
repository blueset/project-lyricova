import { useRef, useState, useCallback, useReducer, useEffect } from "react";
import _ from "lodash";

export function useRowMeasurement({
  estimatedRowHeight,
  containerSize,
  rowCount
}: {
  estimatedRowHeight: number;
  containerSize: { width: number; height: number };
  rowCount: number;
}) {
  const rowHeightCache = useRef<number[]>(new Array(rowCount).fill(estimatedRowHeight));
  const rowAccumulateHeightCache = useRef<number[]>(new Array(rowCount + 1).fill(0).map((_, i) => i * estimatedRowHeight));

  useEffect(() => {
    rowHeightCache.current = new Array(rowCount).fill(estimatedRowHeight);
    rowAccumulateHeightCache.current = new Array(rowCount + 1).fill(0).map((_, i) => i * estimatedRowHeight);
  }, [estimatedRowHeight, rowCount]);

  const elArrayRef = useRef<HTMLElement[]>([]);
  const sizeUpdateCount = useRef(0);
  const [siteUpdaateCountState, setSiteUpdateCountState] = useState(0);

  const forceUpdate = useReducer(() => ({}), {})[1];
  const debouncedForceUpdate = useCallback(_.debounce(forceUpdate, 100), [forceUpdate]);

  const rowRefHandler = useCallback(
    (index: number) => (el: HTMLElement) => {
      elArrayRef.current[index] = el;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rowHeightCache.current[index] !== rect.height) {
          sizeUpdateCount.current++;
          rowHeightCache.current[index] = rect.height;
          debouncedForceUpdate();
        }
      }
    },
    [debouncedForceUpdate]
  );

  useEffect(() => {
    const elArrray = elArrayRef.current;
    let isChanged = false;
    for (const el of elArrray) {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rowHeightCache.current[elArrray.indexOf(el)] !== rect.height) {
          rowHeightCache.current[elArrray.indexOf(el)] = rect.height;
          isChanged = true;
        }
      }
    }
    if (isChanged) {
      sizeUpdateCount.current++;
      debouncedForceUpdate();
    }
  }, [containerSize, debouncedForceUpdate]);

  if (sizeUpdateCount.current !== siteUpdaateCountState) {
    rowAccumulateHeightCache.current = rowHeightCache.current.reduce((acc, height) => {
      acc.push(acc[acc.length - 1] + height);
      return acc;
    }, [0]);
    setSiteUpdateCountState(sizeUpdateCount.current);
  }

  return {
    rowRefHandler,
    rowAccumulateHeight: rowAccumulateHeightCache.current,
  };
}
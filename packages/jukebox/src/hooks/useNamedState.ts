import { type Dispatch, type SetStateAction, useState, useDebugValue } from "react";

export function useNamedState<T>(
  initialValue: T | (() => T),
  name: string
): [T, Dispatch<SetStateAction<T>>] {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

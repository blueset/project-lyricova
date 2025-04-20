import {
  type Dispatch,
  type SetStateAction,
  useState,
  useDebugValue,
  useRef,
  useCallback,
} from "react";

export function useNamedStateWithRef<T>(
  initialValue: T | (() => T),
  name: string
): [T, Dispatch<SetStateAction<T>>, React.RefObject<T>] {
  const [state, _setState] = useState<T>(initialValue);
  const ref = useRef<T>(state);
  useDebugValue(`${name}: ${state}`);
  const setState = useCallback(
    (value: SetStateAction<T>) => {
      if (typeof value !== "function") {
        ref.current = value;
      }
      _setState((prev) => {
        const newValue =
          typeof value === "function"
            ? (value as (prevState: T) => T)(prev)
            : value;
        ref.current = newValue;
        return newValue;
      });
    },
    [_setState]
  );
  return [state, setState, ref];
}

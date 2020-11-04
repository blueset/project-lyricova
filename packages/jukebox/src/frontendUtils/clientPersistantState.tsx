import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useNamedState } from "./hooks";

export function useClientPersistentState<T>(defaultValue: T, name: string, namespace: string): [T, Dispatch<SetStateAction<T>>] {
  const [isMounted, toggleIsMounted] = useState(false);
  const key = `${namespace}.${name}`;
  const [value, setValue] = useNamedState(defaultValue, name);

  // Update local storage when value changes
  useEffect(() => {
    if (isMounted) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [isMounted, key, value]);

  // Mount node and use the state.
  useEffect(() => {
    const stickyValue = window.localStorage.getItem(key);

    if (stickyValue !== null) {
      setValue(JSON.parse(stickyValue));
    }

    toggleIsMounted(true);
  }, [key, setValue]);

  return [value, setValue];
}
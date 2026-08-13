import {
  type UIEventHandler,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

const BOTTOM_THRESHOLD = 2;

function isAtBottom(element: HTMLElement) {
  return (
    element.scrollHeight - element.clientHeight - element.scrollTop <=
    BOTTOM_THRESHOLD
  );
}

export function useAutoScroll<T extends HTMLElement>(content: unknown) {
  const elementRef = useRef<T | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const element = elementRef.current;
    if (element && shouldAutoScrollRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  const setElementRef = useCallback(
    (element: T | null) => {
      elementRef.current = element;
      scrollToBottom();
    },
    [scrollToBottom],
  );

  const handleScroll = useCallback<UIEventHandler<T>>((event) => {
    shouldAutoScrollRef.current = isAtBottom(event.currentTarget);
  }, []);

  const resetAutoScroll = useCallback(() => {
    shouldAutoScrollRef.current = true;
    scrollToBottom();
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [content, scrollToBottom]);

  return {
    ref: setElementRef,
    onScroll: handleScroll,
    resetAutoScroll,
  };
}

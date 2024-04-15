import { RefObject, useRef, useEffect } from "react";

export function useContainerSize({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement>;
}) {
    const containerSizeRef = useRef({ width: 0, height: 0 });
    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            containerSizeRef.current = {
                width: container.clientWidth,
                height: container.clientHeight,
            };
            console.log("containerSizeRef.current (init)", containerSizeRef.current);
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    containerSizeRef.current = { width, height };
                    console.log("containerSizeRef.current (resize)", containerSizeRef.current);
                }
            });
            resizeObserver.observe(container);
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [containerRef]);

    // const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    // useLayoutEffect(() => {
    //   const container = containerRef.current;
    //   if (!container) return;
    //   const rect = container.getBoundingClientRect();
    //   setContainerSize({ width: rect.width, height: rect.height });
  
    //   const observer = new ResizeObserver((entries) => {
    //     const rect = entries[0].contentRect;
    //     setContainerSize({ width: rect.width, height: rect.height });
    //   });
    //   observer.observe(container);
    //   return () => observer.disconnect();
    // }, [containerRef]);

    return containerSizeRef.current;
    // return containerSize;
}
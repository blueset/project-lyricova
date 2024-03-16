import { RefObject, useEffect, useRef } from "react";

export function useLyricsVirtualizer({
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
    }, []);
}
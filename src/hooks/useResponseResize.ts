import { useCallback, useRef, useState } from "react";

const RESPONSE_MIN_HEIGHT = 80;
const RESPONSE_DEFAULT_FRACTION = 0.5;

export function useResponseResize() {
  const [responseFraction, setResponseFraction] = useState(
    RESPONSE_DEFAULT_FRACTION,
  );
  const isResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleResponseResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const offsetY = ev.clientY - rect.top;
      const totalHeight = rect.height;

      // Clamp so both panels keep a minimum height
      const minFractionTop = RESPONSE_MIN_HEIGHT / totalHeight;
      const maxFractionTop = 1 - RESPONSE_MIN_HEIGHT / totalHeight;
      const topFraction = Math.min(
        maxFractionTop,
        Math.max(minFractionTop, offsetY / totalHeight),
      );
      // responseFraction is the bottom part (response)
      setResponseFraction(1 - topFraction);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return {
    responseFraction,
    containerRef,
    handleResponseResizeMouseDown,
  } as const;
}

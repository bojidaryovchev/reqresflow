import { useEffect, useRef, useState } from "react";

interface ContextMenuState<T = string> {
  x: number;
  y: number;
  tabId: T;
}

export function useContextMenu<T = string>() {
  const [menu, setMenu] = useState<ContextMenuState<T> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menu]);

  return { menu, setMenu, menuRef } as const;
}

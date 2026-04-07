import { useCallback, useState } from "react";
import { HistoryEntry } from "../types/electron";

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    window.electronAPI.saveHistory([]);
  }, []);

  return {
    history,
    setHistory,
    clearHistory,
  };
}

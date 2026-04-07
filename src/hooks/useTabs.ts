import { useCallback, useState } from "react";
import { RequestTab as RequestTabType } from "../types/electron";
import { generateId } from "../utils/helpers";
import { REQUEST_FIELDS } from "../utils/request-builder";
import { createEmptyTab } from "../utils/request";

export function useTabs() {
  const [tabs, setTabs] = useState<RequestTabType[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const updateTab = useCallback(
    (id: string, updates: Partial<RequestTabType>) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const touchesRequestField = Object.keys(updates).some((k) =>
            REQUEST_FIELDS.has(k),
          );
          const dirty = touchesRequestField ? { isDirty: true } : {};
          return { ...t, ...updates, ...dirty };
        }),
      );
    },
    [],
  );

  const addTab = useCallback(() => {
    const newTab = createEmptyTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) {
          setActiveTabId("");
          return [];
        }
        const idx = prev.findIndex((t) => t.id === id);
        const remaining = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const newIdx = Math.min(idx, remaining.length - 1);
          setActiveTabId(remaining[newIdx].id);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const duplicateTab = useCallback((id: string) => {
    setTabs((prev) => {
      const source = prev.find((t) => t.id === id);
      if (!source) return prev;
      const newPayloads = source.payloads.map((p) => ({
        ...p,
        id: generateId(),
      }));
      const activePayloadIdx = source.payloads.findIndex(
        (p) => p.id === source.activePayloadId,
      );
      const dup: RequestTabType = {
        ...source,
        id: generateId(),
        payloads: newPayloads,
        activePayloadId:
          newPayloads[activePayloadIdx >= 0 ? activePayloadIdx : 0].id,
        response: null,
        error: null,
        savedToCollectionId: null,
        savedRequestId: null,
        sourceHistoryId: null,
        isDirty: false,
      };
      const idx = prev.findIndex((t) => t.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      setActiveTabId(dup.id);
      return next;
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId("");
  }, []);

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    updateTab,
    addTab,
    closeTab,
    duplicateTab,
    closeAllTabs,
  };
}

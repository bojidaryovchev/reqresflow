import { useCallback, useEffect, useState } from "react";
import { Collection, RequestTab, SavedRequest } from "../types/electron";
import { generateId } from "../utils/helpers";

interface UseSaveToCollectionDeps {
  activeTab: RequestTab | null;
  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  setTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>;
  getCurrentRequest: () => SavedRequest | null;
}

export function useSaveToCollection({
  activeTab,
  collections,
  setCollections,
  setTabs,
  getCurrentRequest,
}: UseSaveToCollectionDeps) {
  const [showSavePicker, setShowSavePicker] = useState(false);

  // Save current tab's request back to its collection (overwrite) or open picker
  const saveRequestToCollection = useCallback(() => {
    const tab = activeTab;
    if (!tab) return;

    if (!tab.savedToCollectionId || !tab.savedRequestId) {
      setShowSavePicker(true);
      return;
    }

    const linkedCollection = collections.find(
      (c) => c.id === tab.savedToCollectionId,
    );
    const linkedRequest = linkedCollection?.requests.find(
      (r) => r.id === tab.savedRequestId,
    );
    if (!linkedCollection || !linkedRequest) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? { ...t, savedToCollectionId: null, savedRequestId: null }
            : t,
        ),
      );
      setShowSavePicker(true);
      return;
    }

    const request = getCurrentRequest();
    if (!request) return;
    const updated = collections.map((c) => {
      if (c.id !== tab.savedToCollectionId) return c;
      return {
        ...c,
        requests: c.requests.map((r) =>
          r.id === tab.savedRequestId
            ? {
                ...request,
                id: r.id,
                name: tab.name && tab.name !== "Untitled" ? tab.name : r.name,
              }
            : r,
        ),
      };
    });
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
    setTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, isDirty: false } : t)),
    );
  }, [activeTab, collections, getCurrentRequest]);

  // Save to a specific collection (for the picker)
  const saveToPickedCollection = useCallback(
    (collectionId: string) => {
      if (!activeTab) return;
      const request = getCurrentRequest();
      if (!request) return;
      const newRequestId = generateId();
      const updated = collections.map((c) => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          requests: [...c.requests, { ...request, id: newRequestId }],
        };
      });
      setCollections(updated);
      window.electronAPI.saveCollections(updated);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                savedToCollectionId: collectionId,
                savedRequestId: newRequestId,
                isDirty: false,
              }
            : t,
        ),
      );
      setShowSavePicker(false);
    },
    [activeTab, collections, getCurrentRequest],
  );

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveRequestToCollection();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [saveRequestToCollection]);

  return {
    showSavePicker,
    setShowSavePicker,
    saveRequestToCollection,
    saveToPickedCollection,
  };
}

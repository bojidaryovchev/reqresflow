import { useCallback } from "react";
import {
  Collection,
  Payload,
  RequestTab,
  ResponseCapture,
} from "../types/electron";
import { generateId } from "../utils/helpers";

export function usePayloads(
  activeTab: RequestTab | null,
  updateTab: (id: string, updates: Partial<RequestTab>) => void,
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>,
) {
  const activePayload = activeTab
    ? activeTab.payloads.find((p) => p.id === activeTab.activePayloadId) ||
      activeTab.payloads[0]
    : null;
  const body = activePayload?.body || "";

  const updatePayloadBody = useCallback(
    (value: string) => {
      if (!activeTab) return;
      updateTab(activeTab.id, {
        payloads: activeTab.payloads.map((p) =>
          p.id === activeTab.activePayloadId ? { ...p, body: value } : p,
        ),
      });
    },
    [activeTab, updateTab],
  );

  const addPayload = useCallback(() => {
    if (!activeTab) return;
    const newPayload: Payload = {
      id: generateId(),
      name: `Payload ${activeTab.payloads.length + 1}`,
      body: "",
      bodyType: activeTab.bodyType,
      rawLanguage: activeTab.rawLanguage,
      formData: [{ enabled: true, key: "", value: "", type: "text" }],
      graphql: { query: "", variables: "" },
      binaryFilePath: "",
    };
    updateTab(activeTab.id, {
      payloads: [...activeTab.payloads, newPayload],
      activePayloadId: newPayload.id,
    });
  }, [activeTab, updateTab]);

  const removePayload = useCallback(
    (id: string) => {
      if (!activeTab) return;
      if (activeTab.payloads.length <= 1) return;
      const updated = activeTab.payloads.filter((p) => p.id !== id);
      updateTab(activeTab.id, {
        payloads: updated,
        activePayloadId:
          activeTab.activePayloadId === id
            ? updated[0].id
            : activeTab.activePayloadId,
      });
    },
    [activeTab, updateTab],
  );

  const renamePayload = useCallback(
    (id: string, name: string) => {
      if (!activeTab) return;
      updateTab(activeTab.id, {
        payloads: activeTab.payloads.map((p) =>
          p.id === id ? { ...p, name } : p,
        ),
      });
      // Sync with collection
      if (activeTab.savedToCollectionId && activeTab.savedRequestId) {
        setCollections((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== activeTab.savedToCollectionId) return c;
            return {
              ...c,
              requests: c.requests.map((r) => {
                if (r.id !== activeTab.savedRequestId || !r.payloads) return r;
                return {
                  ...r,
                  payloads: r.payloads.map((p) =>
                    p.id === id ? { ...p, name } : p,
                  ),
                };
              }),
            };
          });
          window.electronAPI.saveCollections(updated);
          return updated;
        });
      }
    },
    [activeTab, updateTab, setCollections],
  );

  // Capture helpers
  const addCapture = useCallback(() => {
    if (!activeTab) return;
    const newCapture: ResponseCapture = {
      id: generateId(),
      enabled: true,
      varName: "",
      source: "body",
      path: "",
    };
    updateTab(activeTab.id, {
      captures: [...activeTab.captures, newCapture],
    });
  }, [activeTab, updateTab]);

  const updateCapture = useCallback(
    (id: string, updates: Partial<ResponseCapture>) => {
      if (!activeTab) return;
      updateTab(activeTab.id, {
        captures: activeTab.captures.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      });
    },
    [activeTab, updateTab],
  );

  const removeCapture = useCallback(
    (id: string) => {
      if (!activeTab) return;
      updateTab(activeTab.id, {
        captures: activeTab.captures.filter((c) => c.id !== id),
      });
    },
    [activeTab, updateTab],
  );

  return {
    activePayload,
    body,
    updatePayloadBody,
    addPayload,
    removePayload,
    renamePayload,
    addCapture,
    updateCapture,
    removeCapture,
  } as const;
}

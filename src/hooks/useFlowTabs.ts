import { useCallback, useState } from "react";
import { Flow, FlowTab } from "../types/electron";
import { generateId } from "../utils/helpers";
import type { SidebarSection } from "../components/Sidebar";

interface UseFlowTabsDeps {
  onSidebarSectionChange: (section: SidebarSection) => void;
}

export function useFlowTabs({ onSidebarSectionChange }: UseFlowTabsDeps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowTabs, setFlowTabs] = useState<FlowTab[]>([]);
  const [activeFlowTabId, setActiveFlowTabId] = useState<string | null>(null);

  const handleFlowsChange = useCallback((updated: Flow[]) => {
    setFlows(updated);
    window.electronAPI.saveFlows(updated);
    const updatedIds = new Set(updated.map((f) => f.id));
    setFlowTabs((prev) => {
      const filtered = prev.filter((ft) => updatedIds.has(ft.flowId));
      if (filtered.length !== prev.length) {
        setActiveFlowTabId((id) =>
          filtered.some((ft) => ft.id === id) ? id : (filtered[0]?.id ?? null),
        );
      }
      return filtered;
    });
  }, []);

  const openFlowTab = useCallback(
    (flow: Flow, mode: "editor" | "runner" = "editor") => {
      setFlowTabs((prev) => {
        const existing = prev.find((ft) => ft.flowId === flow.id);
        if (existing) {
          setActiveFlowTabId(existing.id);
          if (existing.mode !== mode) {
            return prev.map((ft) =>
              ft.id === existing.id ? { ...ft, mode } : ft,
            );
          }
          return prev;
        }
        const newTab: FlowTab = {
          id: generateId(),
          flowId: flow.id,
          name: flow.name,
          mode,
          isDirty: false,
        };
        setActiveFlowTabId(newTab.id);
        return [...prev, newTab];
      });
      onSidebarSectionChange("flows");
    },
    [onSidebarSectionChange],
  );

  const closeFlowTab = useCallback((tabId: string) => {
    setFlowTabs((prev) => {
      const updated = prev.filter((ft) => ft.id !== tabId);
      if (updated.length === 0) {
        setActiveFlowTabId(null);
      } else {
        setActiveFlowTabId((currentId) => {
          if (currentId === tabId) {
            const idx = prev.findIndex((ft) => ft.id === tabId);
            return updated[Math.min(idx, updated.length - 1)]?.id ?? null;
          }
          return currentId;
        });
      }
      return updated;
    });
  }, []);

  const duplicateFlowTab = useCallback(
    (tabId: string) => {
      const source = flowTabs.find((ft) => ft.id === tabId);
      if (!source) return;
      const sourceFlow = flows.find((f) => f.id === source.flowId);
      if (!sourceFlow) return;
      const newFlow: Flow = {
        id: generateId(),
        name: sourceFlow.name + " (copy)",
        steps: sourceFlow.steps.map((s) => ({ ...s, id: generateId() })),
      };
      setFlows((prevFlows) => {
        const updated = [...prevFlows, newFlow];
        window.electronAPI.saveFlows(updated);
        return updated;
      });
      const newTab: FlowTab = {
        id: generateId(),
        flowId: newFlow.id,
        name: newFlow.name,
        mode: source.mode,
        isDirty: false,
      };
      setFlowTabs((prev) => {
        const idx = prev.findIndex((ft) => ft.id === tabId);
        const next = [...prev];
        next.splice(idx + 1, 0, newTab);
        return next;
      });
      setActiveFlowTabId(newTab.id);
    },
    [flowTabs, flows],
  );

  const closeAllFlowTabs = useCallback(() => {
    setFlowTabs([]);
    setActiveFlowTabId(null);
  }, []);

  const handleCreateFlow = useCallback(() => {
    const newFlow: Flow = {
      id: generateId(),
      name: "New Flow",
      steps: [],
    };
    setFlows((prev) => {
      const updated = [...prev, newFlow];
      window.electronAPI.saveFlows(updated);
      return updated;
    });
    openFlowTab(newFlow);
  }, [openFlowTab]);

  const handleSaveFlow = useCallback((flow: Flow) => {
    setFlows((prev) => {
      const exists = prev.find((f) => f.id === flow.id);
      const updated = exists
        ? prev.map((f) => (f.id === flow.id ? flow : f))
        : [...prev, flow];
      window.electronAPI.saveFlows(updated);
      return updated;
    });
    setFlowTabs((prev) =>
      prev.map((ft) =>
        ft.flowId === flow.id ? { ...ft, name: flow.name, isDirty: false } : ft,
      ),
    );
  }, []);

  const handleEditFlow = useCallback(
    (flow: Flow) => {
      openFlowTab(flow);
    },
    [openFlowTab],
  );

  const handleFlowChange = useCallback((flow: Flow) => {
    setFlowTabs((prev) =>
      prev.map((ft) =>
        ft.flowId === flow.id ? { ...ft, name: flow.name, isDirty: true } : ft,
      ),
    );
  }, []);

  const handleRenameFlow = useCallback((flowId: string, name: string) => {
    setFlows((prev) => {
      const updated = prev.map((f) => (f.id === flowId ? { ...f, name } : f));
      window.electronAPI.saveFlows(updated);
      return updated;
    });
    setFlowTabs((prev) =>
      prev.map((ft) => (ft.flowId === flowId ? { ...ft, name } : ft)),
    );
  }, []);

  return {
    flows,
    setFlows,
    flowTabs,
    setFlowTabs,
    activeFlowTabId,
    setActiveFlowTabId,
    handleFlowsChange,
    openFlowTab,
    closeFlowTab,
    duplicateFlowTab,
    closeAllFlowTabs,
    handleCreateFlow,
    handleSaveFlow,
    handleEditFlow,
    handleFlowChange,
    handleRenameFlow,
  };
}

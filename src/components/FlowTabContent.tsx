import React from "react";
import { Flow, FlowRunState, FlowTab, Collection } from "../types/electron";
import FlowEditor from "./FlowEditor";
import FlowRunner from "./FlowRunner";

interface FlowTabContentProps {
  flowTabs: FlowTab[];
  activeFlowTabId: string | null;
  flows: Flow[];
  collections: Collection[];
  flowRunState: FlowRunState | null;
  flowRunHistory: Record<string, FlowRunState>;
  flowAbortRef: React.MutableRefObject<boolean>;
  setFlowTabs: React.Dispatch<React.SetStateAction<FlowTab[]>>;
  setFlowRunState: React.Dispatch<React.SetStateAction<FlowRunState | null>>;
  handleSaveFlow: (flow: Flow) => void;
  closeFlowTab: (tabId: string) => void;
  runFlow: (flow: Flow) => void;
  handleFlowChange: (flow: Flow) => void;
}

const FlowTabContent: React.FC<FlowTabContentProps> = ({
  flowTabs,
  activeFlowTabId,
  flows,
  collections,
  flowRunState,
  flowRunHistory,
  flowAbortRef,
  setFlowTabs,
  setFlowRunState,
  handleSaveFlow,
  closeFlowTab,
  runFlow,
  handleFlowChange,
}) => {
  const activeFlowTab = flowTabs.find((ft) => ft.id === activeFlowTabId);
  if (!activeFlowTab) {
    return (
      <div className="flow-empty-state">
        Open or create a flow to get started
      </div>
    );
  }
  const flow = flows.find((f) => f.id === activeFlowTab.flowId);
  if (!flow) {
    return (
      <div className="flow-empty-state">
        Flow not found — it may have been deleted
      </div>
    );
  }
  if (activeFlowTab.mode === "runner" && flowRunState) {
    return (
      <FlowRunner
        runState={flowRunState}
        onClose={() => {
          setFlowTabs((prev) =>
            prev.map((ft) =>
              ft.id === activeFlowTab.id ? { ...ft, mode: "editor" } : ft,
            ),
          );
          setFlowRunState(null);
        }}
        onAbort={() => {
          flowAbortRef.current = true;
        }}
      />
    );
  }
  return (
    <FlowEditor
      key={activeFlowTab.id}
      flow={flow}
      collections={collections}
      onSave={handleSaveFlow}
      onCancel={() => closeFlowTab(activeFlowTab.id)}
      onRun={runFlow}
      onChange={handleFlowChange}
      lastRunState={flowRunHistory[flow.id] ?? null}
    />
  );
};

export default FlowTabContent;

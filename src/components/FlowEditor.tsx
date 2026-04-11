import React, { useState, useEffect, useRef } from "react";
import {
  Flow,
  FlowStep,
  FlowRunState,
  Collection,
  ResponseCapture,
} from "../types/electron";
import { generateId } from "../utils/helpers";
import LastRunSection from "./LastRunSection";
import FlowStepRow from "./FlowStepRow";
import RequestPickerModal from "./RequestPickerModal";

interface FlowEditorProps {
  flow: Flow;
  collections: Collection[];
  onSave: (flow: Flow) => void;
  onCancel: () => void;
  onRun: (flow: Flow) => void;
  onChange?: (flow: Flow) => void;
  lastRunState?: FlowRunState | null;
}

const FlowEditor: React.FC<FlowEditorProps> = ({
  flow,
  collections,
  onSave,
  onCancel,
  onRun,
  onChange,
  lastRunState,
}) => {
  const [name, setName] = useState(flow.name);
  const [steps, setSteps] = useState<FlowStep[]>(flow.steps);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [showRequestPicker, setShowRequestPicker] = useState(false);
  const isLocalChange = useRef(false);

  // Sync name from props when changed externally (e.g., sidebar rename)
  useEffect(() => {
    if (!isLocalChange.current) {
      setName(flow.name);
    }
    isLocalChange.current = false;
  }, [flow.name]);

  // Notify parent of changes for dirty tracking
  const notifyChange = (updatedName: string, updatedSteps: FlowStep[]) => {
    onChange?.({ ...flow, name: updatedName, steps: updatedSteps });
  };

  const handleNameChange = (newName: string) => {
    isLocalChange.current = true;
    setName(newName);
    notifyChange(newName, steps);
  };

  const updateSteps = (updater: (prev: FlowStep[]) => FlowStep[]) => {
    setSteps((prev) => {
      const updated = updater(prev);
      notifyChange(name, updated);
      return updated;
    });
  };

  const resolveRequest = (step: FlowStep) => {
    const col = collections.find((c) => c.id === step.collectionId);
    if (!col) return null;
    return col.requests.find((r) => r.id === step.requestId) || null;
  };

  const addStep = (collectionId: string, requestId: string) => {
    const newStep: FlowStep = {
      id: generateId(),
      collectionId,
      requestId,
      captures: [],
      continueOnError: false,
    };
    updateSteps((prev) => [...prev, newStep]);
    setShowRequestPicker(false);
  };

  const removeStep = (id: string) => {
    updateSteps((prev) => prev.filter((s) => s.id !== id));
    if (expandedStepId === id) setExpandedStepId(null);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updateSteps(() => updated);
  };

  const toggleContinueOnError = (id: string) => {
    updateSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, continueOnError: !s.continueOnError } : s,
      ),
    );
  };

  const addStepCapture = (stepId: string) => {
    const newCapture: ResponseCapture = {
      id: generateId(),
      enabled: true,
      varName: "",
      source: "body",
      path: "",
    };
    updateSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, captures: [...s.captures, newCapture] } : s,
      ),
    );
  };

  const updateStepCapture = (
    stepId: string,
    captureId: string,
    updates: Partial<ResponseCapture>,
  ) => {
    updateSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              captures: s.captures.map((c) =>
                c.id === captureId ? { ...c, ...updates } : c,
              ),
            }
          : s,
      ),
    );
  };

  const removeStepCapture = (stepId: string, captureId: string) => {
    updateSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, captures: s.captures.filter((c) => c.id !== captureId) }
          : s,
      ),
    );
  };

  const changeStepPayload = (stepId: string, payloadId: string | null) => {
    updateSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, payloadId } : s)),
    );
  };

  const handleSave = () => {
    onSave({ ...flow, name: name.trim() || "Untitled Flow", steps });
  };

  const handleRun = () => {
    const updated = { ...flow, name: name.trim() || "Untitled Flow", steps };
    onSave(updated);
    onRun(updated);
  };

  return (
    <div className="flow-editor">
      <div className="flow-editor-header">
        <input
          className="flow-editor-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Flow name..."
        />
        <div className="flow-editor-actions">
          <button className="flow-editor-btn secondary" onClick={onCancel}>
            Back
          </button>
          <button className="flow-editor-btn secondary" onClick={handleSave}>
            Save
          </button>
          <button
            className="flow-editor-btn primary"
            onClick={handleRun}
            disabled={steps.length === 0}
          >
            ▶ Run Flow
          </button>
        </div>
      </div>

      <div className="flow-steps">
        {steps.length === 0 && (
          <div className="flow-steps-empty">
            No steps yet. Add requests from your collections.
          </div>
        )}
        {steps.map((step, index) => {
          const req = resolveRequest(step);
          const col = collections.find((c) => c.id === step.collectionId);

          return (
            <FlowStepRow
              key={step.id}
              step={step}
              index={index}
              totalSteps={steps.length}
              isExpanded={expandedStepId === step.id}
              reqMethod={req?.method}
              reqName={req?.name}
              reqUrl={req?.url}
              payloads={req?.payloads}
              collectionFound={!!col}
              onToggleExpand={() =>
                setExpandedStepId(expandedStepId === step.id ? null : step.id)
              }
              onMoveStep={(dir) => moveStep(index, dir)}
              onRemove={() => removeStep(step.id)}
              onToggleContinueOnError={() => toggleContinueOnError(step.id)}
              onChangePayload={(payloadId) =>
                changeStepPayload(step.id, payloadId)
              }
              onAddCapture={() => addStepCapture(step.id)}
              onUpdateCapture={(captureId, updates) =>
                updateStepCapture(step.id, captureId, updates)
              }
              onRemoveCapture={(captureId) =>
                removeStepCapture(step.id, captureId)
              }
            />
          );
        })}
      </div>

      <button
        className="flow-add-step-btn"
        onClick={() => setShowRequestPicker(true)}
      >
        + Add Step
      </button>

      {showRequestPicker && (
        <RequestPickerModal
          collections={collections}
          onAddStep={addStep}
          onClose={() => setShowRequestPicker(false)}
        />
      )}

      {/* Last Run Results */}
      {lastRunState && lastRunState.status !== "running" && (
        <LastRunSection runState={lastRunState} />
      )}
    </div>
  );
};

export default FlowEditor;

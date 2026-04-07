import React, { useState, useEffect, useRef } from "react";
import {
  Flow,
  FlowStep,
  FlowRunState,
  Collection,
  ResponseCapture,
} from "../types/electron";
import { generateId } from "../utils/helpers";
import { METHOD_COLORS } from "../utils/http";
import LastRunSection from "./LastRunSection";

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
          const isExpanded = expandedStepId === step.id;

          return (
            <div className="flow-step" key={step.id}>
              <div
                className="flow-step-header"
                onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
              >
                <span className="flow-step-index">{index + 1}</span>
                {req ? (
                  <>
                    <span
                      className="flow-step-method"
                      style={{
                        color:
                          METHOD_COLORS[req.method] || "var(--text-secondary)",
                      }}
                    >
                      {req.method}
                    </span>
                    <span className="flow-step-name">{req.name}</span>
                    <span className="flow-step-url">{req.url}</span>
                  </>
                ) : (
                  <span className="flow-step-missing">
                    Missing request
                    {col ? "" : " (collection deleted)"}
                  </span>
                )}
                <div className="flow-step-controls">
                  <button
                    className="flow-step-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, -1);
                    }}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="flow-step-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, 1);
                    }}
                    disabled={index === steps.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="flow-step-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(step.id);
                    }}
                    title="Remove step"
                  >
                    ×
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="flow-step-detail">
                  <label className="flow-step-checkbox">
                    <input
                      type="checkbox"
                      checked={step.continueOnError}
                      onChange={() => toggleContinueOnError(step.id)}
                    />
                    Continue on error
                  </label>

                  <div className="flow-step-captures">
                    <div className="flow-step-captures-header">
                      <span>Step Captures</span>
                      <button
                        className="flow-step-captures-add"
                        onClick={() => addStepCapture(step.id)}
                      >
                        + Capture
                      </button>
                    </div>
                    {step.captures.length === 0 && (
                      <div className="flow-step-captures-empty">
                        No step-level captures. The request's own captures will
                        still apply.
                      </div>
                    )}
                    {step.captures.map((cap) => (
                      <div className="flow-step-capture-row" key={cap.id}>
                        <input
                          className="flow-step-capture-input"
                          placeholder="Variable name"
                          value={cap.varName}
                          onChange={(e) =>
                            updateStepCapture(step.id, cap.id, {
                              varName: e.target.value,
                            })
                          }
                        />
                        <select
                          className="flow-step-capture-select"
                          value={cap.source}
                          onChange={(e) =>
                            updateStepCapture(step.id, cap.id, {
                              source: e.target.value as
                                | "body"
                                | "header"
                                | "status",
                            })
                          }
                        >
                          <option value="body">Body</option>
                          <option value="header">Header</option>
                          <option value="status">Status</option>
                        </select>
                        <input
                          className="flow-step-capture-input"
                          placeholder={
                            cap.source === "body"
                              ? "JSON path (e.g. data.token)"
                              : cap.source === "header"
                                ? "Header name"
                                : ""
                          }
                          value={cap.path}
                          onChange={(e) =>
                            updateStepCapture(step.id, cap.id, {
                              path: e.target.value,
                            })
                          }
                          disabled={cap.source === "status"}
                        />
                        <button
                          className="flow-step-capture-remove"
                          onClick={() => removeStepCapture(step.id, cap.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {index < steps.length - 1 && (
                <div className="flow-step-connector">↓</div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="flow-add-step-btn"
        onClick={() => setShowRequestPicker(true)}
      >
        + Add Step
      </button>

      {/* Request Picker Modal */}
      {showRequestPicker && (
        <div
          className="modal-overlay"
          onClick={() => setShowRequestPicker(false)}
        >
          <div
            className="flow-request-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flow-request-picker-header">
              <span>Add Request from Collection</span>
              <button onClick={() => setShowRequestPicker(false)}>×</button>
            </div>
            <div className="flow-request-picker-body">
              {collections.length === 0 ? (
                <div className="flow-request-picker-empty">
                  No collections yet. Save some requests first.
                </div>
              ) : (
                collections.map((col) => (
                  <div className="flow-request-picker-collection" key={col.id}>
                    <div className="flow-request-picker-collection-name">
                      {col.name}
                    </div>
                    {col.requests.length === 0 ? (
                      <div className="flow-request-picker-empty">
                        No requests in this collection.
                      </div>
                    ) : (
                      col.requests.map((req) => (
                        <button
                          className="flow-request-picker-item"
                          key={req.id}
                          onClick={() => addStep(col.id, req.id)}
                        >
                          <span
                            className="flow-request-picker-method"
                            style={{
                              color:
                                METHOD_COLORS[req.method] ||
                                "var(--text-secondary)",
                            }}
                          >
                            {req.method}
                          </span>
                          <span className="flow-request-picker-name">
                            {req.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Run Results */}
      {lastRunState && lastRunState.status !== "running" && (
        <LastRunSection runState={lastRunState} />
      )}
    </div>
  );
};

export default FlowEditor;

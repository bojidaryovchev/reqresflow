import React, { useState } from "react";
import { FlowRunState } from "../types/electron";
import FlowStepResultItem from "./FlowStepResultItem";
import StepDetail from "./StepDetail";

const LastRunSection: React.FC<{ runState: FlowRunState }> = ({ runState }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );

  const passedCount = runState.stepResults.filter(
    (r) => r.status === "success",
  ).length;
  const failedCount = runState.stepResults.filter(
    (r) => r.status === "error",
  ).length;
  const skippedCount = runState.stepResults.filter(
    (r) => r.status === "skipped",
  ).length;

  const timestamp = runState.completedAt
    ? new Date(runState.completedAt).toLocaleTimeString()
    : "";

  const selectedResult =
    selectedStepIndex !== null
      ? runState.stepResults[selectedStepIndex] || null
      : null;

  return (
    <div className="flow-editor-last-run">
      <div
        className="flow-editor-last-run-header"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="flow-editor-last-run-toggle">
          {collapsed ? "▶" : "▼"}
        </span>
        <span className="flow-editor-last-run-title">Last Run</span>
        <span className="flow-editor-last-run-summary">
          <span className="flow-runner-stat success">{passedCount} passed</span>
          {failedCount > 0 && (
            <span className="flow-runner-stat error">{failedCount} failed</span>
          )}
          {skippedCount > 0 && (
            <span className="flow-runner-stat skipped">
              {skippedCount} skipped
            </span>
          )}
          <span className="flow-runner-stat">{runState.totalTime}ms</span>
        </span>
        {timestamp && (
          <span className="flow-editor-last-run-time">{timestamp}</span>
        )}
      </div>
      {!collapsed && (
        <div className="flow-editor-last-run-body">
          <div className="flow-editor-last-run-steps">
            {runState.stepResults.map((result, index) => (
              <FlowStepResultItem
                key={result.stepId}
                result={result}
                index={index}
                isSelected={selectedStepIndex === index}
                onClick={() =>
                  setSelectedStepIndex(
                    selectedStepIndex === index ? null : index,
                  )
                }
                classPrefix="flow-editor-last-run"
              />
            ))}
          </div>
          <div className="flow-editor-last-run-detail">
            {selectedResult ? (
              <StepDetail result={selectedResult} />
            ) : (
              <div className="flow-runner-detail-empty">
                Click a step to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LastRunSection;

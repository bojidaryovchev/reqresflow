import React from "react";
import { FlowRunStepResult } from "../types/electron";
import { getStatusClass } from "../utils/helpers";
import { METHOD_COLORS } from "../utils/http";

interface FlowStepResultItemProps {
  result: FlowRunStepResult;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  classPrefix: string;
}

const FlowStepResultItem: React.FC<FlowStepResultItemProps> = ({
  result,
  index,
  isSelected,
  onClick,
  classPrefix,
}) => (
  <div
    className={`${classPrefix}-step ${result.status}${isSelected ? " selected" : ""}`}
    onClick={onClick}
  >
    <span className={`${classPrefix}-step-icon`}>
      {result.status === "success"
        ? "✓"
        : result.status === "error"
          ? "✗"
          : result.status === "skipped"
            ? "⏭"
            : "⋯"}
    </span>
    <span className={`${classPrefix}-step-index`}>{index + 1}.</span>
    <span
      className={`${classPrefix}-step-method`}
      style={{
        color:
          METHOD_COLORS[result.requestMethod] || "var(--text-secondary)",
      }}
    >
      {result.requestMethod}
    </span>
    <span className={`${classPrefix}-step-name`}>
      {result.requestName}
    </span>
    {result.execution?.response && (
      <span
        className={`${classPrefix}-step-status status-${getStatusClass(result.execution.response.status)}`}
      >
        {result.execution.response.status}
      </span>
    )}
    <span className={`${classPrefix}-step-time`}>
      {result.durationMs}ms
    </span>
  </div>
);

export default FlowStepResultItem;

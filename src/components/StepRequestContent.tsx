import React from "react";
import { FlowRunStepResult } from "../types/electron";
import { tryPrettyJson } from "../utils/helpers";
import { METHOD_COLORS } from "../utils/http";
import CodeEditor from "./CodeEditor";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const StepRequestContent: React.FC<{ execution: FlowRunStepResult["execution"] }> = ({
  execution,
}) => {
  if (!execution) return null;
  const exec = execution;

  return (
    <div className="flow-runner-detail-content">
      <div className="flow-runner-request-line">
        <span
          style={{
            color:
              METHOD_COLORS[exec.resolvedMethod] || "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          {exec.resolvedMethod}
        </span>{" "}
        <span className="flow-runner-request-url">{exec.resolvedUrl}</span>
      </div>
      <div className="flow-runner-response-headers">
        <strong>Headers Sent</strong>
        <div className="flow-runner-headers-grid">
          {Object.entries(exec.resolvedHeaders).map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="flow-runner-header-key">{k}</span>
              <span className="flow-runner-header-value">{v}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
      {exec.resolvedBody && (
        <div className="flow-runner-response-body">
          <strong>Body Sent</strong>
          <CodeEditor
            value={tryPrettyJson(exec.resolvedBody)}
            onChange={noop}
            language="json"
            readOnly={true}
          />
        </div>
      )}
    </div>
  );
};

export default StepRequestContent;

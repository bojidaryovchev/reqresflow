import React from "react";
import { FlowRunStepResult } from "../types/electron";
import { formatSize, getStatusClass, tryPrettyJson } from "../utils/helpers";
import { detectResponseLanguage } from "../utils/http";
import CodeEditor from "./CodeEditor";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const StepResponseContent: React.FC<{
  execution: FlowRunStepResult["execution"];
}> = ({ execution }) => {
  if (!execution) return null;
  const exec = execution;
  const responseBody = exec.response?.body || "";
  const responseLang = exec.response
    ? detectResponseLanguage(exec.response)
    : "text";

  return (
    <div className="flow-runner-detail-content">
      {exec.error && <div className="flow-runner-error-box">{exec.error}</div>}
      {exec.response && (
        <>
          <div className="flow-runner-response-meta">
            <span
              className={`flow-runner-status status-${getStatusClass(exec.response.status)}`}
            >
              {exec.response.status} {exec.response.statusText}
            </span>
            <span className="flow-runner-meta-item">
              {exec.response.time}ms
            </span>
            <span className="flow-runner-meta-item">
              {formatSize(exec.response.size)}
            </span>
          </div>
          <div className="flow-runner-response-headers">
            <strong>Headers</strong>
            <div className="flow-runner-headers-grid">
              {Object.entries(exec.response.headers).map(([k, v]) => (
                <React.Fragment key={k}>
                  <span className="flow-runner-header-key">{k}</span>
                  <span className="flow-runner-header-value">{v}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flow-runner-response-body">
            <strong>Body</strong>
            <CodeEditor
              value={
                responseLang === "json"
                  ? tryPrettyJson(responseBody)
                  : responseBody
              }
              onChange={noop}
              language={responseLang}
              readOnly={true}
            />
          </div>
        </>
      )}
      {!exec.response && !exec.error && (
        <div className="flow-runner-detail-empty">No response.</div>
      )}
    </div>
  );
};

export default StepResponseContent;

import React, { useState } from "react";
import { HistoryEntry } from "../types/electron";
import { formatSize, getStatusClass } from "../utils/helpers";
import { METHOD_COLORS } from "../utils/http";
import StepCapturesContent from "./StepCapturesContent";
import StepRequestContent from "./StepRequestContent";
import StepResponseContent from "./StepResponseContent";

type DetailTab = "response" | "request" | "captures";

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

interface HistoryDetailPanelProps {
  entry: HistoryEntry;
  onReplayExact: () => void;
  onReplayAsNew: () => void;
  onClose: () => void;
}

const HistoryDetailPanel: React.FC<HistoryDetailPanelProps> = ({
  entry,
  onReplayExact,
  onReplayAsNew,
  onClose,
}) => {
  const [detailTab, setDetailTab] = useState<DetailTab>("response");
  const exec = entry.execution ?? null;

  const captureCount = exec?.capturedValues?.length ?? 0;

  return (
    <div className="history-detail-panel">
      <div className="history-detail-header">
        <div className="history-detail-title-row">
          <span
            className="history-detail-method"
            style={{
              color: METHOD_COLORS[entry.method] || "var(--text-secondary)",
            }}
          >
            {entry.method}
          </span>
          <span className="history-detail-url">{entry.url}</span>
          <button
            className="history-detail-close"
            onClick={onClose}
            title="Close detail"
          >
            ×
          </button>
        </div>

        <div className="history-detail-meta">
          {entry.status > 0 && (
            <span
              className={`history-detail-status status-${getStatusClass(entry.status)}`}
            >
              {entry.status} {entry.statusText}
            </span>
          )}
          {entry.status === 0 && (
            <span className="history-detail-status status-error">Error</span>
          )}
          {entry.time > 0 && (
            <span className="history-detail-meta-item">{entry.time}ms</span>
          )}
          {exec?.response && (
            <span className="history-detail-meta-item">
              {formatSize(exec.response.size)}
            </span>
          )}
          <span className="history-detail-meta-item">
            {formatTimestamp(entry.timestamp)}
          </span>
          {entry.flowName && (
            <span className="history-flow-badge">{entry.flowName}</span>
          )}
        </div>
      </div>

      {exec ? (
        <>
          <div className="history-detail-tabs">
            <button
              className={`history-detail-tab ${detailTab === "response" ? "active" : ""}`}
              onClick={() => setDetailTab("response")}
            >
              Response
            </button>
            <button
              className={`history-detail-tab ${detailTab === "request" ? "active" : ""}`}
              onClick={() => setDetailTab("request")}
            >
              Request
            </button>
            <button
              className={`history-detail-tab ${detailTab === "captures" ? "active" : ""}`}
              onClick={() => setDetailTab("captures")}
            >
              Captures
              {captureCount > 0 && (
                <span className="history-detail-badge">{captureCount}</span>
              )}
            </button>
          </div>

          <div className="history-detail-body">
            {detailTab === "response" && (
              <StepResponseContent execution={exec} />
            )}
            {detailTab === "request" && <StepRequestContent execution={exec} />}
            {detailTab === "captures" && (
              <StepCapturesContent execution={exec} />
            )}
          </div>
        </>
      ) : (
        <div className="history-detail-body">
          <div className="history-detail-unavailable">
            Detailed request/response data is not available for this history
            entry. It was recorded before detail tracking was added.
          </div>
        </div>
      )}

      <div className="history-detail-actions">
        <button
          className="history-detail-action-btn primary"
          onClick={onReplayExact}
          title="Open in a new tab with the exact same payload and send immediately"
        >
          ▶ Replay Exact
        </button>
        <button
          className="history-detail-action-btn secondary"
          onClick={onReplayAsNew}
          title="Open in a new tab as a template — variables and generators will re-resolve on send"
        >
          ↗ Open as New Request
        </button>
      </div>
    </div>
  );
};

export default HistoryDetailPanel;

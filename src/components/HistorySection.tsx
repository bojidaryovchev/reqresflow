import React from "react";
import { HistoryEntry } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";

interface HistorySectionProps {
  history: HistoryEntry[];
  onLoadHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
};

const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onLoadHistory,
  onClearHistory,
}) => (
  <>
    <div className="sidebar-header">
      <span className="sidebar-header-title">History</span>
      {history.length > 0 && (
        <button
          className="sidebar-add-btn"
          onClick={onClearHistory}
          title="Clear History"
        >
          ×
        </button>
      )}
    </div>
    <div className="sidebar-content">
      {history.length === 0 && (
        <div className="sidebar-empty">
          No request history yet.
          <br />
          Send a request to see it here.
        </div>
      )}
      {history.map((entry) => (
        <div
          className="history-item"
          key={entry.id}
          onClick={() => onLoadHistory(entry)}
        >
          <div className="history-item-top">
            <span
              className="request-method-badge"
              style={{
                color:
                  METHOD_COLORS[entry.method] || "var(--text-secondary)",
              }}
            >
              {entry.method}
            </span>
            <span
              className={`history-status ${entry.status >= 200 && entry.status < 300 ? "success" : entry.status >= 400 ? "error" : ""}`}
            >
              {entry.status}
            </span>
            <span className="history-time">{entry.time}ms</span>
          </div>
          <div className="history-item-url">{entry.url}</div>
          <div className="history-item-timestamp">
            {entry.flowName && (
              <span className="history-flow-badge">{entry.flowName}</span>
            )}
            {formatTimestamp(entry.timestamp)}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default HistorySection;

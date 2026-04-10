import React from "react";
import { HistoryEntry } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";

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

interface HistoryItemProps {
  entry: HistoryEntry;
  isSelected: boolean;
  onClick: () => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({
  entry,
  isSelected,
  onClick,
}) => (
  <div
    className={`history-item${isSelected ? " selected" : ""}`}
    onClick={onClick}
  >
    <div className="history-item-top">
      <span
        className="request-method-badge"
        style={{
          color: METHOD_COLORS[entry.method] || "var(--text-secondary)",
        }}
      >
        {entry.method}
      </span>
      <span
        className={`history-status ${entry.status >= 200 && entry.status < 300 ? "success" : entry.status >= 400 || entry.status === 0 ? "error" : ""}`}
      >
        {entry.status === 0 ? "ERR" : entry.status}
      </span>
      <span className="history-time">
        {entry.time > 0 ? `${entry.time}ms` : "—"}
      </span>
    </div>
    <div className="history-item-url">{entry.url}</div>
    <div className="history-item-timestamp">
      {entry.flowName && (
        <span className="history-flow-badge">{entry.flowName}</span>
      )}
      {formatTimestamp(entry.timestamp)}
    </div>
  </div>
);

export default HistoryItem;

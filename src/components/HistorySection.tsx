import React from "react";
import HistoryItem from "./HistoryItem";
import { HistoryEntry } from "../types/electron";

interface HistorySectionProps {
  history: HistoryEntry[];
  onLoadHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  selectedHistoryId: string | null;
}

const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onLoadHistory,
  onClearHistory,
  selectedHistoryId,
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
        <HistoryItem
          key={entry.id}
          entry={entry}
          isSelected={entry.id === selectedHistoryId}
          onClick={() => onLoadHistory(entry)}
        />
      ))}
    </div>
  </>
);

export default HistorySection;

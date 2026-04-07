import React from "react";
import { Payload } from "../types/electron";

interface PayloadTabsBarProps {
  payloads: Payload[];
  activePayloadId: string | null;
  activePayloadName?: string;
  onSelectPayload: (id: string) => void;
  onAddPayload: () => void;
  onRemovePayload: (id: string) => void;
  onRenamePayload: (id: string, name: string) => void;
}

const PayloadTabsBar: React.FC<PayloadTabsBarProps> = ({
  payloads,
  activePayloadId,
  activePayloadName,
  onSelectPayload,
  onAddPayload,
  onRemovePayload,
  onRenamePayload,
}) => (
  <div className="payload-bar">
    <div className="payload-tabs">
      {payloads.map((p) => (
        <div
          key={p.id}
          className={`payload-tab ${p.id === activePayloadId ? "active" : ""}`}
          onClick={() => onSelectPayload(p.id)}
        >
          <span className="payload-tab-name">{p.name}</span>
          {payloads.length > 1 && (
            <button
              className="payload-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onRemovePayload(p.id);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        className="payload-add-btn"
        onClick={onAddPayload}
        title="Add payload variant"
      >
        +
      </button>
    </div>
    {activePayloadId && activePayloadName !== undefined && (
      <input
        className="payload-rename-input"
        value={activePayloadName}
        onChange={(e) => onRenamePayload(activePayloadId, e.target.value)}
        title="Rename payload"
      />
    )}
  </div>
);

export default PayloadTabsBar;

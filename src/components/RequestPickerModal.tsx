import React from "react";
import { Collection } from "../types/electron";
import { METHOD_COLORS } from "../utils/http";

interface RequestPickerModalProps {
  collections: Collection[];
  onAddStep: (collectionId: string, requestId: string) => void;
  onClose: () => void;
}

const RequestPickerModal: React.FC<RequestPickerModalProps> = ({
  collections,
  onAddStep,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flow-request-picker" onClick={(e) => e.stopPropagation()}>
        <div className="flow-request-picker-header">
          <span>Add Request from Collection</span>
          <button onClick={onClose}>×</button>
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
                      onClick={() => onAddStep(col.id, req.id)}
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
  );
};

export default RequestPickerModal;

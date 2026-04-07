import React from "react";
import { Collection } from "../types/electron";

interface SavePickerModalProps {
  collections: Collection[];
  onSave: (collectionId: string) => void;
  onClose: () => void;
}

const SavePickerModal: React.FC<SavePickerModalProps> = ({
  collections,
  onSave,
  onClose,
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="save-picker-modal" onClick={(e) => e.stopPropagation()}>
      <div className="save-picker-header">
        <span className="save-picker-title">Save to Collection</span>
        <button className="save-picker-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="save-picker-body">
        {collections.length === 0 ? (
          <div className="save-picker-empty">
            No collections yet. Create one from the sidebar first.
          </div>
        ) : (
          <div className="save-picker-list">
            {collections.map((c) => (
              <button
                key={c.id}
                className="save-picker-item"
                onClick={() => onSave(c.id)}
              >
                <span className="save-picker-collection-name">{c.name}</span>
                <span className="save-picker-collection-count">
                  {c.requests.length} request
                  {c.requests.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default SavePickerModal;

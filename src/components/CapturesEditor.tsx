import React from "react";
import CaptureRow from "./CaptureRow";
import { ResponseCapture } from "../types/electron";

interface CapturesEditorProps {
  captures: ResponseCapture[];
  activeEnvId: string | null;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ResponseCapture>) => void;
  onRemove: (id: string) => void;
}

const CapturesEditor: React.FC<CapturesEditorProps> = ({
  captures,
  activeEnvId,
  onAdd,
  onUpdate,
  onRemove,
}) => (
  <div className="captures-editor">
    <div className="captures-info">
      Extract values from responses and save them as environment variables.
      {!activeEnvId && (
        <span className="captures-warning"> Select an environment first.</span>
      )}
    </div>
    {captures.length === 0 && (
      <div className="captures-empty">
        No captures yet. Add one to extract response values into env variables.
      </div>
    )}
    {captures.map((cap) => (
      <CaptureRow
        key={cap.id}
        capture={cap}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    ))}
    <button className="capture-add-btn" onClick={onAdd}>
      + Add Capture
    </button>
  </div>
);

export default CapturesEditor;

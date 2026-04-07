import React from "react";
import { Environment } from "../types/electron";

interface EnvironmentBarProps {
  requestName: string;
  environments: Environment[];
  activeEnvId: string | null;
  onRename: (name: string) => void;
  onEnvChange: (envId: string | null) => void;
  onManageEnvs: () => void;
}

const EnvironmentBar: React.FC<EnvironmentBarProps> = ({
  requestName,
  environments,
  activeEnvId,
  onRename,
  onEnvChange,
  onManageEnvs,
}) => (
  <div className="env-bar">
    <input
      className="request-name-input"
      type="text"
      value={requestName === "Untitled" ? "" : requestName}
      placeholder="Request name..."
      onChange={(e) => onRename(e.target.value || "Untitled")}
    />
    <div className="env-bar-separator" />
    <select
      className="env-select"
      value={activeEnvId || ""}
      onChange={(e) => onEnvChange(e.target.value || null)}
    >
      <option value="">No Environment</option>
      {environments.map((env) => (
        <option key={env.id} value={env.id}>
          {env.name}
        </option>
      ))}
    </select>
    <button className="env-manage-btn" onClick={onManageEnvs}>
      Manage
    </button>
  </div>
);

export default EnvironmentBar;

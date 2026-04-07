import React from "react";
import { Environment } from "../types/electron";

interface EnvListPanelProps {
  environments: Environment[];
  selectedEnvId: string | null;
  onSelectEnv: (id: string) => void;
  onAddEnvironment: () => void;
  onDeleteEnvironment: (id: string) => void;
}

const EnvListPanel: React.FC<EnvListPanelProps> = ({
  environments,
  selectedEnvId,
  onSelectEnv,
  onAddEnvironment,
  onDeleteEnvironment,
}) => (
  <div className="env-list">
    <div className="env-list-header">
      <span>Environments</span>
      <button
        className="sidebar-icon-btn"
        onClick={onAddEnvironment}
        title="Add environment"
      >
        +
      </button>
    </div>
    {environments.map((env) => (
      <div
        key={env.id}
        className={`env-list-item ${env.id === selectedEnvId ? "active" : ""}`}
        onClick={() => onSelectEnv(env.id)}
      >
        <span>{env.name}</span>
        <button
          className="sidebar-icon-btn danger"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteEnvironment(env.id);
          }}
          title="Delete"
        >
          ×
        </button>
      </div>
    ))}
  </div>
);

export default EnvListPanel;

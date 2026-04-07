import React, { useState } from "react";
import { Environment } from "../types/electron";
import { generateId } from "../utils/helpers";
import EnvListPanel from "./EnvListPanel";
import EnvDetailPanel from "./EnvDetailPanel";

interface EnvManagerProps {
  environments: Environment[];
  onEnvironmentsChange: (environments: Environment[]) => void;
  onClose: () => void;
}

const EnvManager: React.FC<EnvManagerProps> = ({
  environments,
  onEnvironmentsChange,
  onClose,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    environments.length > 0 ? environments[0].id : null,
  );

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) || null;

  const addEnvironment = () => {
    const newEnv: Environment = {
      id: generateId(),
      name: "New Environment",
      variables: [{ key: "", value: "" }],
    };
    const updated = [...environments, newEnv];
    onEnvironmentsChange(updated);
    setSelectedEnvId(newEnv.id);
  };

  const deleteEnvironment = (id: string) => {
    const updated = environments.filter((e) => e.id !== id);
    onEnvironmentsChange(updated);
    if (selectedEnvId === id) {
      setSelectedEnvId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const updateEnvName = (id: string, name: string) => {
    onEnvironmentsChange(
      environments.map((e) => (e.id === id ? { ...e, name } : e)),
    );
  };

  const updateVariables = (
    envId: string,
    variables: { key: string; value: string }[],
  ) => {
    onEnvironmentsChange(
      environments.map((e) => (e.id === envId ? { ...e, variables } : e)),
    );
  };

  const addVariable = () => {
    if (!selectedEnv) return;
    updateVariables(selectedEnv.id, [
      ...selectedEnv.variables,
      { key: "", value: "" },
    ]);
  };

  const removeVariable = (index: number) => {
    if (!selectedEnv) return;
    updateVariables(
      selectedEnv.id,
      selectedEnv.variables.filter((_, i) => i !== index),
    );
  };

  const updateVariable = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    if (!selectedEnv) return;
    updateVariables(
      selectedEnv.id,
      selectedEnv.variables.map((v, i) =>
        i === index ? { ...v, [field]: val } : v,
      ),
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Environments</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="env-manager-body">
          <EnvListPanel
            environments={environments}
            selectedEnvId={selectedEnvId}
            onSelectEnv={setSelectedEnvId}
            onAddEnvironment={addEnvironment}
            onDeleteEnvironment={deleteEnvironment}
          />
          <EnvDetailPanel
            selectedEnv={selectedEnv}
            onUpdateName={updateEnvName}
            onUpdateVariable={updateVariable}
            onRemoveVariable={removeVariable}
            onAddVariable={addVariable}
          />
        </div>
      </div>
    </div>
  );
};

export default EnvManager;

import React, { useState } from 'react';
import { Environment } from '../types/electron';

interface EnvManagerProps {
  environments: Environment[];
  onEnvironmentsChange: (environments: Environment[]) => void;
  onClose: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const EnvManager: React.FC<EnvManagerProps> = ({ environments, onEnvironmentsChange, onClose }) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    environments.length > 0 ? environments[0].id : null
  );

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) || null;

  const addEnvironment = () => {
    const newEnv: Environment = {
      id: generateId(),
      name: 'New Environment',
      variables: [{ key: '', value: '' }],
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
    onEnvironmentsChange(environments.map((e) => (e.id === id ? { ...e, name } : e)));
  };

  const updateVariables = (envId: string, variables: { key: string; value: string }[]) => {
    onEnvironmentsChange(environments.map((e) => (e.id === envId ? { ...e, variables } : e)));
  };

  const addVariable = () => {
    if (!selectedEnv) return;
    updateVariables(selectedEnv.id, [...selectedEnv.variables, { key: '', value: '' }]);
  };

  const removeVariable = (index: number) => {
    if (!selectedEnv) return;
    updateVariables(selectedEnv.id, selectedEnv.variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: 'key' | 'value', val: string) => {
    if (!selectedEnv) return;
    updateVariables(
      selectedEnv.id,
      selectedEnv.variables.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Environments</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="env-manager-body">
          <div className="env-list">
            <div className="env-list-header">
              <span>Environments</span>
              <button className="sidebar-icon-btn" onClick={addEnvironment} title="Add environment">+</button>
            </div>
            {environments.map((env) => (
              <div
                key={env.id}
                className={`env-list-item ${env.id === selectedEnvId ? 'active' : ''}`}
                onClick={() => setSelectedEnvId(env.id)}
              >
                <span>{env.name}</span>
                <button
                  className="sidebar-icon-btn danger"
                  onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="env-detail">
            {selectedEnv ? (
              <>
                <div className="env-name-row">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={selectedEnv.name}
                    onChange={(e) => updateEnvName(selectedEnv.id, e.target.value)}
                    className="env-name-input"
                  />
                </div>
                <div className="env-vars-header">
                  <span>Variable</span>
                  <span>Value</span>
                  <span></span>
                </div>
                <div className="env-vars-list">
                  {selectedEnv.variables.map((v, i) => (
                    <div className="env-var-row" key={i}>
                      <input
                        type="text"
                        placeholder="VARIABLE_NAME"
                        value={v.key}
                        onChange={(e) => updateVariable(i, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="value"
                        value={v.value}
                        onChange={(e) => updateVariable(i, 'value', e.target.value)}
                      />
                      <button className="kv-remove-btn" onClick={() => removeVariable(i)}>×</button>
                    </div>
                  ))}
                </div>
                <button className="kv-add-btn" onClick={addVariable}>+ Add Variable</button>
              </>
            ) : (
              <div className="env-detail-empty">Select or create an environment</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvManager;

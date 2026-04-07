import { useCallback, useState } from "react";
import { Environment } from "../types/electron";

export function useEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [showEnvManager, setShowEnvManager] = useState(false);

  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;

  const handleEnvironmentsChange = useCallback(
    (updated: Environment[]) => {
      setEnvironments(updated);
      window.electronAPI.saveEnvironments(updated);
      if (activeEnvId && !updated.find((e) => e.id === activeEnvId)) {
        setActiveEnvId(updated.length > 0 ? updated[0].id : null);
      }
    },
    [activeEnvId],
  );

  return {
    environments,
    setEnvironments,
    activeEnvId,
    setActiveEnvId,
    activeEnv,
    showEnvManager,
    setShowEnvManager,
    handleEnvironmentsChange,
  };
}

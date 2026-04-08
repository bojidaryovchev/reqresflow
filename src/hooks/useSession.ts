import { useEffect, useState } from "react";
import {
  BodyType,
  Collection,
  Environment,
  Flow,
  GeneratorConfig,
  HistoryEntry,
  RawLanguage,
  RequestTab,
  SessionState,
} from "../types/electron";

interface UseSessionDeps {
  setTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
  setActiveEnvId: React.Dispatch<React.SetStateAction<string | null>>;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  setFlows: React.Dispatch<React.SetStateAction<Flow[]>>;
  setGeneratorConfig: React.Dispatch<
    React.SetStateAction<GeneratorConfig | null>
  >;
  tabs: RequestTab[];
  activeTabId: string;
  activeEnvId: string | null;
}

export function useSession({
  setTabs,
  setActiveTabId,
  setCollections,
  setEnvironments,
  setActiveEnvId,
  setHistory,
  setFlows,
  setGeneratorConfig,
  tabs,
  activeTabId,
  activeEnvId,
}: UseSessionDeps) {
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Load collections, environments, history & session on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.loadCollections(),
      window.electronAPI.loadEnvironments(),
      window.electronAPI.loadHistory(),
      window.electronAPI.loadSession(),
      window.electronAPI.loadFlows(),
      window.electronAPI.loadGeneratorConfig(),
    ]).then(([cols, envs, hist, session, loadedFlows, genConfig]) => {
      setCollections(cols);
      setEnvironments(envs);
      setHistory(hist);
      setFlows(loadedFlows);
      if (genConfig) setGeneratorConfig(genConfig);

      if (session && session.tabs && session.tabs.length > 0) {
        // Migrate old session tabs that may be missing new fields
        const migratedTabs = session.tabs.map((t: RequestTab) => ({
          ...t,
          bodyType: t.bodyType || ("none" as BodyType),
          rawLanguage: t.rawLanguage || ("json" as RawLanguage),
          captures: t.captures || [],
          auth: t.auth || { type: "none" as const },
          savedToCollectionId: t.savedToCollectionId ?? null,
          savedRequestId: t.savedRequestId ?? null,
          sourceHistoryId: (t as RequestTab).sourceHistoryId ?? null,
          isDirty: t.isDirty ?? false,
          payloads: (t.payloads || []).map((p) => ({
            ...p,
            bodyType: p.bodyType || ("none" as BodyType),
            rawLanguage: p.rawLanguage || ("json" as RawLanguage),
            formData: p.formData || [
              { enabled: true, key: "", value: "", type: "text" as const },
            ],
            graphql: p.graphql || { query: "", variables: "" },
            binaryFilePath: p.binaryFilePath || "",
          })),
        }));
        setTabs(migratedTabs);
        setActiveTabId(session.activeTabId);
        setActiveEnvId(session.activeEnvId);
      } else {
        if (envs.length > 0) setActiveEnvId(envs[0].id);
      }
      setSessionLoaded(true);
    });
  }, []);

  // Auto-save session when tabs or active selections change
  useEffect(() => {
    if (!sessionLoaded) return;
    const session: SessionState = { tabs, activeTabId, activeEnvId };
    window.electronAPI.saveSession(session);
  }, [tabs, activeTabId, activeEnvId, sessionLoaded]);

  return { sessionLoaded };
}

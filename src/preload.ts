import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendRequest: (config: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    bodyType?: string;
  }) => ipcRenderer.invoke("send-request", config),

  // Collections
  loadCollections: () => ipcRenderer.invoke("collections:load"),
  saveCollections: (collections: unknown) =>
    ipcRenderer.invoke("collections:save", collections),

  // Environments
  loadEnvironments: () => ipcRenderer.invoke("environments:load"),
  saveEnvironments: (environments: unknown) =>
    ipcRenderer.invoke("environments:save", environments),

  // History
  loadHistory: () => ipcRenderer.invoke("history:load"),
  saveHistory: (history: unknown) =>
    ipcRenderer.invoke("history:save", history),

  // Session
  loadSession: () => ipcRenderer.invoke("session:load"),
  saveSession: (session: unknown) =>
    ipcRenderer.invoke("session:save", session),

  // Flows
  loadFlows: () => ipcRenderer.invoke("flows:load"),
  saveFlows: (flows: unknown) => ipcRenderer.invoke("flows:save", flows),

  // Generators
  loadGeneratorConfig: () => ipcRenderer.invoke("generators:load-config"),
  saveGeneratorConfig: (config: unknown) =>
    ipcRenderer.invoke("generators:save-config", config),
  removeGeneratorConfig: () => ipcRenderer.invoke("generators:remove-config"),
  generatorsBuild: (projectDir: string) =>
    ipcRenderer.invoke("generators:build", projectDir),
  generatorsStart: (config: unknown) =>
    ipcRenderer.invoke("generators:start", config),
  generatorsStop: (containerName: string) =>
    ipcRenderer.invoke("generators:stop", containerName),
  generatorsLogs: (containerName: string) =>
    ipcRenderer.invoke("generators:logs", containerName),
  generatorsHealth: (port: number) =>
    ipcRenderer.invoke("generators:health", port),
  generatorsList: (port: number) => ipcRenderer.invoke("generators:list", port),
  generatorsInvoke: (port: number, name: string) =>
    ipcRenderer.invoke("generators:invoke", port, name),
  selectDirectory: () => ipcRenderer.invoke("dialog:select-directory"),
});

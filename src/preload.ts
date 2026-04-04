import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (config: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }) => ipcRenderer.invoke('send-request', config),

  // Collections
  loadCollections: () => ipcRenderer.invoke('collections:load'),
  saveCollections: (collections: unknown) => ipcRenderer.invoke('collections:save', collections),

  // Environments
  loadEnvironments: () => ipcRenderer.invoke('environments:load'),
  saveEnvironments: (environments: unknown) => ipcRenderer.invoke('environments:save', environments),

  // History
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (history: unknown) => ipcRenderer.invoke('history:save', history),
});

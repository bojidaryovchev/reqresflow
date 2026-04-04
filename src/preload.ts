import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (config: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }) => ipcRenderer.invoke('send-request', config),
});

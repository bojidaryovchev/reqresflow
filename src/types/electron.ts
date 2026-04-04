export interface RequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface Payload {
  id: string;
  name: string;
  body: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  body: string;
  payloads?: Payload[];
  activePayloadId?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  requests: SavedRequest[];
}

export interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string }[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  statusText: string;
  time: number;
  request: SavedRequest;
}

export interface RequestTab {
  id: string;
  name: string;
  method: string;
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  payloads: Payload[];
  activePayloadId: string;
  response: ResponseData | null;
  error: string | null;
}

declare global {
  interface Window {
    electronAPI: {
      sendRequest: (config: RequestConfig) => Promise<ResponseData>;
      loadCollections: () => Promise<Collection[]>;
      saveCollections: (collections: Collection[]) => Promise<void>;
      loadEnvironments: () => Promise<Environment[]>;
      saveEnvironments: (environments: Environment[]) => Promise<void>;
      loadHistory: () => Promise<HistoryEntry[]>;
      saveHistory: (history: HistoryEntry[]) => Promise<void>;
    };
  }
}

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

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  body: string;
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

declare global {
  interface Window {
    electronAPI: {
      sendRequest: (config: RequestConfig) => Promise<ResponseData>;
      loadCollections: () => Promise<Collection[]>;
      saveCollections: (collections: Collection[]) => Promise<void>;
      loadEnvironments: () => Promise<Environment[]>;
      saveEnvironments: (environments: Environment[]) => Promise<void>;
    };
  }
}

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

declare global {
  interface Window {
    electronAPI: {
      sendRequest: (config: RequestConfig) => Promise<ResponseData>;
    };
  }
}

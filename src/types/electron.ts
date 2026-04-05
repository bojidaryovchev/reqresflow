export type BodyType =
  | "none"
  | "form-data"
  | "x-www-form-urlencoded"
  | "raw"
  | "binary"
  | "graphql";

export type RawLanguage = "json" | "text" | "xml" | "html" | "javascript";

export interface RequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyType?: BodyType;
  formData?: {
    enabled: boolean;
    key: string;
    value: string;
    type: "text" | "file";
  }[];
  rawLanguage?: RawLanguage;
  graphql?: { query: string; variables: string };
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
  bodyType: BodyType;
  rawLanguage: RawLanguage;
  formData: {
    enabled: boolean;
    key: string;
    value: string;
    type: "text" | "file";
  }[];
  graphql: { query: string; variables: string };
  binaryFilePath: string;
}

export interface ResponseCapture {
  id: string;
  enabled: boolean;
  varName: string;
  source: "body" | "header" | "status";
  path: string; // JSONPath-like dot notation for body, header name for header, empty for status
}

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string };

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  body: string;
  bodyType?: BodyType;
  rawLanguage?: RawLanguage;
  formData?: {
    enabled: boolean;
    key: string;
    value: string;
    type: "text" | "file";
  }[];
  graphql?: { query: string; variables: string };
  binaryFilePath?: string;
  payloads?: Payload[];
  activePayloadId?: string | null;
  captures?: ResponseCapture[];
  auth?: AuthConfig;
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
  flowName?: string;
}

export interface FlowStep {
  id: string;
  collectionId: string;
  requestId: string;
  captures: ResponseCapture[];
  continueOnError: boolean;
}

export interface Flow {
  id: string;
  name: string;
  steps: FlowStep[];
}

export interface FlowStepExecutionDetail {
  resolvedUrl: string;
  resolvedMethod: string;
  resolvedHeaders: Record<string, string>;
  resolvedBody: string | undefined;
  response: ResponseData | null;
  error: string | null;
  capturedValues: {
    varName: string;
    value: string;
    source: string;
    path: string;
  }[];
}

export interface FlowRunStepResult {
  stepId: string;
  stepIndex: number;
  requestName: string;
  requestMethod: string;
  status: "success" | "error" | "skipped";
  execution: FlowStepExecutionDetail | null;
  durationMs: number;
}

export interface FlowRunState {
  flowId: string;
  status: "idle" | "running" | "completed" | "aborted";
  currentStepIndex: number;
  stepResults: FlowRunStepResult[];
  startedAt: number;
  completedAt: number | null;
  totalTime: number;
}

export interface FlowTab {
  id: string;
  flowId: string;
  name: string;
  mode: "editor" | "runner";
  isDirty: boolean;
}

export interface SessionState {
  tabs: RequestTab[];
  activeTabId: string;
  activeEnvId: string | null;
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
  bodyType: BodyType;
  rawLanguage: RawLanguage;
  response: ResponseData | null;
  error: string | null;
  captures: ResponseCapture[];
  auth: AuthConfig;
  savedToCollectionId: string | null;
  savedRequestId: string | null;
  sourceHistoryId: string | null;
  isDirty: boolean;
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
      loadSession: () => Promise<SessionState | null>;
      saveSession: (session: SessionState) => Promise<void>;
      loadFlows: () => Promise<Flow[]>;
      saveFlows: (flows: Flow[]) => Promise<void>;
    };
  }
}

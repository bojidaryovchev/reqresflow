import React, { useState, useCallback, useEffect } from 'react';
import KeyValueEditor, { KeyValuePair } from './components/KeyValueEditor';
import Sidebar from './components/Sidebar';
import EnvManager from './components/EnvManager';
import { Collection, Environment, SavedRequest, Payload } from './types/electron';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestTab = 'params' | 'headers' | 'body';
type ResponseTab = 'body' | 'headers';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  PATCH: 'var(--method-patch)',
  DELETE: 'var(--method-delete)',
};

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  return 'server-error';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryPrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// Replace {{variable}} placeholders with environment values
function substituteVars(text: string, variables: { key: string; value: string }[]): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const found = variables.find((v) => v.key === name);
    return found ? found.value : match;
  });
}

const App: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<KeyValuePair[]>([{ enabled: true, key: '', value: '' }]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([{ enabled: true, key: '', value: '' }]);
  const [payloads, setPayloads] = useState<Payload[]>([{ id: generateId(), name: 'Default', body: '' }]);
  const [activePayloadId, setActivePayloadId] = useState<string>(payloads[0].id);
  const [requestTab, setRequestTab] = useState<RequestTab>('params');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collections
  const [collections, setCollections] = useState<Collection[]>([]);

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [showEnvManager, setShowEnvManager] = useState(false);

  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;

  // Load collections & environments on mount
  useEffect(() => {
    window.electronAPI.loadCollections().then(setCollections);
    window.electronAPI.loadEnvironments().then((envs) => {
      setEnvironments(envs);
      if (envs.length > 0) setActiveEnvId(envs[0].id);
    });
  }, []);

  // Persist collections when they change
  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

  // Persist environments when they change
  const handleEnvironmentsChange = useCallback((updated: Environment[]) => {
    setEnvironments(updated);
    window.electronAPI.saveEnvironments(updated);
    // If active env was deleted, reset
    if (activeEnvId && !updated.find((e) => e.id === activeEnvId)) {
      setActiveEnvId(updated.length > 0 ? updated[0].id : null);
    }
  }, [activeEnvId]);

  // Active payload helpers
  const activePayload = payloads.find((p) => p.id === activePayloadId) || payloads[0];
  const body = activePayload?.body || '';

  const updatePayloadBody = (value: string) => {
    setPayloads((prev) => prev.map((p) => (p.id === activePayloadId ? { ...p, body: value } : p)));
  };

  const addPayload = () => {
    const newPayload: Payload = { id: generateId(), name: `Payload ${payloads.length + 1}`, body: '' };
    setPayloads((prev) => [...prev, newPayload]);
    setActivePayloadId(newPayload.id);
  };

  const removePayload = (id: string) => {
    if (payloads.length <= 1) return;
    const updated = payloads.filter((p) => p.id !== id);
    setPayloads(updated);
    if (activePayloadId === id) setActivePayloadId(updated[0].id);
  };

  const renamePayload = (id: string, name: string) => {
    setPayloads((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  // Get current request state as a SavedRequest
  const getCurrentRequest = useCallback((): SavedRequest => {
    return {
      id: '',
      name: url.trim() ? new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`).pathname || url.trim() : 'Untitled Request',
      method,
      url,
      params,
      headers,
      body,
      payloads,
      activePayloadId,
    };
  }, [method, url, params, headers, body, payloads, activePayloadId]);

  // Load a saved request into the editor
  const loadRequest = useCallback((req: SavedRequest) => {
    setMethod(req.method as HttpMethod);
    setUrl(req.url);
    setParams(req.params.length > 0 ? req.params : [{ enabled: true, key: '', value: '' }]);
    setHeaders(req.headers.length > 0 ? req.headers : [{ enabled: true, key: '', value: '' }]);
    if (req.payloads && req.payloads.length > 0) {
      setPayloads(req.payloads);
      setActivePayloadId(req.activePayloadId || req.payloads[0].id);
    } else {
      const defaultPayload: Payload = { id: generateId(), name: 'Default', body: req.body };
      setPayloads([defaultPayload]);
      setActivePayloadId(defaultPayload.id);
    }
    setResponse(null);
    setError(null);
  }, []);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const vars = activeEnv?.variables || [];

    // Build query string from enabled params (with var substitution)
    let fullUrl = substituteVars(url.trim(), vars);
    const enabledParams = params.filter((p) => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      const qs = enabledParams
        .map((p) => `${encodeURIComponent(substituteVars(p.key, vars))}=${encodeURIComponent(substituteVars(p.value, vars))}`)
        .join('&');
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }

    // Build headers from enabled pairs (with var substitution)
    const headerObj: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      headerObj[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
    });

    const resolvedBody = ['POST', 'PUT', 'PATCH'].includes(method) ? substituteVars(body, vars) : undefined;

    try {
      const result = await window.electronAPI.sendRequest({
        method,
        url: fullUrl,
        headers: headerObj,
        body: resolvedBody,
      });
      setResponse(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [method, url, params, headers, body, activeEnv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendRequest();
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        onLoadRequest={loadRequest}
        onSaveRequest={getCurrentRequest}
      />

      {/* Main Panel */}
      <div className="main-panel">
        {/* Environment Bar */}
        <div className="env-bar">
          <select
            className="env-select"
            value={activeEnvId || ''}
            onChange={(e) => setActiveEnvId(e.target.value || null)}
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button className="env-manage-btn" onClick={() => setShowEnvManager(true)}>
            Manage
          </button>
        </div>

        {/* URL Bar */}
        <div className="url-bar">
          <select
            className="method-select"
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            style={{ color: METHOD_COLORS[method] }}
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="url-input"
            type="text"
            placeholder="Enter request URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={sendRequest} disabled={loading || !url.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        <div className="request-response">
          {/* Request Section */}
          <div className="request-section">
            <div className="tabs">
              {(['params', 'headers', 'body'] as RequestTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${requestTab === tab ? 'active' : ''}`}
                  onClick={() => setRequestTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {requestTab === 'params' && (
              <KeyValueEditor pairs={params} onChange={setParams} />
            )}
            {requestTab === 'headers' && (
              <KeyValueEditor pairs={headers} onChange={setHeaders} />
            )}
            {requestTab === 'body' && (
              <div className="body-editor">
                <div className="payload-bar">
                  <div className="payload-tabs">
                    {payloads.map((p) => (
                      <div
                        key={p.id}
                        className={`payload-tab ${p.id === activePayloadId ? 'active' : ''}`}
                        onClick={() => setActivePayloadId(p.id)}
                      >
                        <span className="payload-tab-name">{p.name}</span>
                        {payloads.length > 1 && (
                          <button
                            className="payload-tab-close"
                            onClick={(e) => { e.stopPropagation(); removePayload(p.id); }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="payload-add-btn" onClick={addPayload} title="Add payload variant">+</button>
                  </div>
                  {activePayload && (
                    <input
                      className="payload-rename-input"
                      value={activePayload.name}
                      onChange={(e) => renamePayload(activePayload.id, e.target.value)}
                      title="Rename payload"
                    />
                  )}
                </div>
                <textarea
                  className="body-textarea"
                  placeholder='{"key": "value"}'
                  value={body}
                  onChange={(e) => updatePayloadBody(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Response Section */}
          <div className="response-section">
            <div className="tabs">
              {(['body', 'headers'] as ResponseTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${responseTab === tab ? 'active' : ''}`}
                  onClick={() => setResponseTab(tab)}
                >
                  {tab === 'body' ? 'Response Body' : 'Response Headers'}
                </button>
              ))}
            </div>

            {error && <div className="response-error">{error}</div>}

            {!response && !error && (
              <div className="response-empty">
                Send a request to see the response
              </div>
            )}

            {response && (
              <>
                <div className="response-meta">
                  <span className={`response-status ${getStatusClass(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="response-time">{response.time} ms</span>
                  <span className="response-size">{formatSize(response.size)}</span>
                </div>

                {responseTab === 'body' && (
                  <div className="response-body">
                    <pre>{tryPrettyJson(response.body)}</pre>
                  </div>
                )}

                {responseTab === 'headers' && (
                  <div className="response-headers-list">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div className="response-header-row" key={key}>
                        <span className="response-header-key">{key}</span>
                        <span className="response-header-value">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Environment Manager Modal */}
      {showEnvManager && (
        <EnvManager
          environments={environments}
          onEnvironmentsChange={handleEnvironmentsChange}
          onClose={() => setShowEnvManager(false)}
        />
      )}
    </div>
  );
};

export default App;

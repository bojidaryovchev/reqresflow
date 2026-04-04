import React, { useState, useCallback, useEffect } from 'react';
import KeyValueEditor, { KeyValuePair } from './components/KeyValueEditor';
import Sidebar from './components/Sidebar';
import EnvManager from './components/EnvManager';
import { Collection, Environment, SavedRequest, Payload, HistoryEntry, RequestTab as RequestTabType, SessionState } from './types/electron';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestPanel = 'params' | 'headers' | 'body';
type ResponsePanel = 'body' | 'headers';

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

function createEmptyTab(): RequestTabType {
  const payloadId = generateId();
  return {
    id: generateId(),
    name: 'Untitled',
    method: 'GET',
    url: '',
    params: [{ enabled: true, key: '', value: '' }],
    headers: [{ enabled: true, key: '', value: '' }],
    payloads: [{ id: payloadId, name: 'Default', body: '' }],
    activePayloadId: payloadId,
    response: null,
    error: null,
  };
}

const App: React.FC = () => {
  // Tabs
  const [tabs, setTabs] = useState<RequestTabType[]>(() => [createEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [requestPanel, setRequestPanel] = useState<RequestPanel>('params');
  const [responsePanel, setResponsePanel] = useState<ResponsePanel>('body');
  const [loading, setLoading] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Collections
  const [collections, setCollections] = useState<Collection[]>([]);

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [showEnvManager, setShowEnvManager] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const activeEnv = environments.find((e) => e.id === activeEnvId) || null;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Helper to update the active tab
  const updateTab = useCallback((id: string, updates: Partial<RequestTabType>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  // Tab management
  const addTab = useCallback(() => {
    const newTab = createEmptyTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) {
        // Can't close last tab — reset it instead
        const fresh = createEmptyTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      const idx = prev.findIndex((t) => t.id === id);
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const newIdx = Math.min(idx, remaining.length - 1);
        setActiveTabId(remaining[newIdx].id);
      }
      return remaining;
    });
  }, [activeTabId]);

  // Load collections, environments, history & session on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.loadCollections(),
      window.electronAPI.loadEnvironments(),
      window.electronAPI.loadHistory(),
      window.electronAPI.loadSession(),
    ]).then(([cols, envs, hist, session]) => {
      setCollections(cols);
      setEnvironments(envs);
      setHistory(hist);

      if (session && session.tabs && session.tabs.length > 0) {
        setTabs(session.tabs);
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

  // Persist collections when they change
  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

  // Persist environments when they change
  const handleEnvironmentsChange = useCallback((updated: Environment[]) => {
    setEnvironments(updated);
    window.electronAPI.saveEnvironments(updated);
    if (activeEnvId && !updated.find((e) => e.id === activeEnvId)) {
      setActiveEnvId(updated.length > 0 ? updated[0].id : null);
    }
  }, [activeEnvId]);

  // Active payload helpers (operate on activeTab)
  const activePayload = activeTab.payloads.find((p) => p.id === activeTab.activePayloadId) || activeTab.payloads[0];
  const body = activePayload?.body || '';

  const updatePayloadBody = (value: string) => {
    updateTab(activeTab.id, {
      payloads: activeTab.payloads.map((p) => (p.id === activeTab.activePayloadId ? { ...p, body: value } : p)),
    });
  };

  const addPayload = () => {
    const newPayload: Payload = { id: generateId(), name: `Payload ${activeTab.payloads.length + 1}`, body: '' };
    updateTab(activeTab.id, {
      payloads: [...activeTab.payloads, newPayload],
      activePayloadId: newPayload.id,
    });
  };

  const removePayload = (id: string) => {
    if (activeTab.payloads.length <= 1) return;
    const updated = activeTab.payloads.filter((p) => p.id !== id);
    updateTab(activeTab.id, {
      payloads: updated,
      activePayloadId: activeTab.activePayloadId === id ? updated[0].id : activeTab.activePayloadId,
    });
  };

  const renamePayload = (id: string, name: string) => {
    updateTab(activeTab.id, {
      payloads: activeTab.payloads.map((p) => (p.id === id ? { ...p, name } : p)),
    });
  };

  // Get current request state as a SavedRequest
  const getCurrentRequest = useCallback((): SavedRequest => {
    return {
      id: '',
      name: activeTab.url.trim()
        ? (() => { try { return new URL(activeTab.url.trim().startsWith('http') ? activeTab.url.trim() : `https://${activeTab.url.trim()}`).pathname || activeTab.url.trim(); } catch { return activeTab.url.trim(); } })()
        : 'Untitled Request',
      method: activeTab.method,
      url: activeTab.url,
      params: activeTab.params,
      headers: activeTab.headers,
      body,
      payloads: activeTab.payloads,
      activePayloadId: activeTab.activePayloadId,
    };
  }, [activeTab, body]);

  // Load a saved request into a new tab
  const loadRequest = useCallback((req: SavedRequest) => {
    const payloads = req.payloads && req.payloads.length > 0
      ? req.payloads
      : [{ id: generateId(), name: 'Default', body: req.body }];
    const newTab: RequestTabType = {
      id: generateId(),
      name: req.name,
      method: req.method,
      url: req.url,
      params: req.params.length > 0 ? req.params : [{ enabled: true, key: '', value: '' }],
      headers: req.headers.length > 0 ? req.headers : [{ enabled: true, key: '', value: '' }],
      payloads,
      activePayloadId: req.activePayloadId || payloads[0].id,
      response: null,
      error: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  // Load a history entry into a new tab
  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    loadRequest(entry.request);
  }, [loadRequest]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    window.electronAPI.saveHistory([]);
  }, []);

  const sendRequest = useCallback(async () => {
    if (!activeTab.url.trim()) return;

    setLoading(true);
    updateTab(activeTab.id, { error: null, response: null });

    const vars = activeEnv?.variables || [];

    // Build query string from enabled params
    let fullUrl = substituteVars(activeTab.url.trim(), vars);
    const enabledParams = activeTab.params.filter((p) => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      const qs = enabledParams
        .map((p) => `${encodeURIComponent(substituteVars(p.key, vars))}=${encodeURIComponent(substituteVars(p.value, vars))}`)
        .join('&');
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }

    // Build headers
    const headerObj: Record<string, string> = {};
    activeTab.headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      headerObj[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
    });

    const resolvedBody = ['POST', 'PUT', 'PATCH'].includes(activeTab.method) ? substituteVars(body, vars) : undefined;

    try {
      const result = await window.electronAPI.sendRequest({
        method: activeTab.method,
        url: fullUrl,
        headers: headerObj,
        body: resolvedBody,
      });
      updateTab(activeTab.id, { response: result, error: null });

      // Add to history
      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: Date.now(),
        method: activeTab.method,
        url: activeTab.url.trim(),
        status: result.status,
        statusText: result.statusText,
        time: result.time,
        request: getCurrentRequest(),
      };
      const updatedHistory = [entry, ...history].slice(0, 100); // keep max 100
      setHistory(updatedHistory);
      window.electronAPI.saveHistory(updatedHistory);
    } catch (err: unknown) {
      updateTab(activeTab.id, { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [activeTab, body, activeEnv, history, getCurrentRequest, updateTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendRequest();
  };

  // Derive tab display name
  const getTabName = (tab: RequestTabType) => {
    if (tab.url.trim()) {
      try {
        const u = new URL(tab.url.trim().startsWith('http') ? tab.url.trim() : `https://${tab.url.trim()}`);
        return u.pathname || tab.url.trim();
      } catch {
        return tab.url.trim();
      }
    }
    return tab.name || 'Untitled';
  };

  const response = activeTab.response;
  const error = activeTab.error;

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        onLoadRequest={loadRequest}
        onSaveRequest={getCurrentRequest}
        history={history}
        onLoadHistory={loadHistoryEntry}
        onClearHistory={clearHistory}
      />

      {/* Main Panel */}
      <div className="main-panel">
        {/* Request Tabs Bar */}
        <div className="request-tabs-bar">
          <div className="request-tabs-list">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`request-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span
                  className="request-tab-method"
                  style={{ color: METHOD_COLORS[tab.method as HttpMethod] || 'var(--text-secondary)' }}
                >
                  {tab.method}
                </span>
                <span className="request-tab-name">{getTabName(tab)}</span>
                <button
                  className="request-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="request-tab-add" onClick={addTab} title="New Tab">+</button>
        </div>

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
            value={activeTab.method}
            onChange={(e) => updateTab(activeTab.id, { method: e.target.value })}
            style={{ color: METHOD_COLORS[activeTab.method as HttpMethod] }}
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="url-input"
            type="text"
            placeholder="Enter request URL..."
            value={activeTab.url}
            onChange={(e) => updateTab(activeTab.id, { url: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={sendRequest} disabled={loading || !activeTab.url.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        <div className="request-response">
          {/* Request Section */}
          <div className="request-section">
            <div className="tabs">
              {(['params', 'headers', 'body'] as RequestPanel[]).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${requestPanel === tab ? 'active' : ''}`}
                  onClick={() => setRequestPanel(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {requestPanel === 'params' && (
              <KeyValueEditor
                pairs={activeTab.params}
                onChange={(p) => updateTab(activeTab.id, { params: p })}
              />
            )}
            {requestPanel === 'headers' && (
              <KeyValueEditor
                pairs={activeTab.headers}
                onChange={(h) => updateTab(activeTab.id, { headers: h })}
              />
            )}
            {requestPanel === 'body' && (
              <div className="body-editor">
                <div className="payload-bar">
                  <div className="payload-tabs">
                    {activeTab.payloads.map((p) => (
                      <div
                        key={p.id}
                        className={`payload-tab ${p.id === activeTab.activePayloadId ? 'active' : ''}`}
                        onClick={() => updateTab(activeTab.id, { activePayloadId: p.id })}
                      >
                        <span className="payload-tab-name">{p.name}</span>
                        {activeTab.payloads.length > 1 && (
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
              {(['body', 'headers'] as ResponsePanel[]).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${responsePanel === tab ? 'active' : ''}`}
                  onClick={() => setResponsePanel(tab)}
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

                {responsePanel === 'body' && (
                  <div className="response-body">
                    <pre>{tryPrettyJson(response.body)}</pre>
                  </div>
                )}

                {responsePanel === 'headers' && (
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

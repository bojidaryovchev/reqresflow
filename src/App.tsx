import React, { useState, useCallback } from 'react';
import KeyValueEditor, { KeyValuePair } from './components/KeyValueEditor';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestTab = 'params' | 'headers' | 'body';
type ResponseTab = 'body' | 'headers';

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

const App: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<KeyValuePair[]>([{ enabled: true, key: '', value: '' }]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([{ enabled: true, key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [requestTab, setRequestTab] = useState<RequestTab>('params');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    // Build query string from enabled params
    let fullUrl = url.trim();
    const enabledParams = params.filter((p) => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      const qs = enabledParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }

    // Build headers from enabled pairs
    const headerObj: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      headerObj[h.key] = h.value;
    });

    try {
      const result = await window.electronAPI.sendRequest({
        method,
        url: fullUrl,
        headers: headerObj,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
      });
      setResponse(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [method, url, params, headers, body]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendRequest();
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>ReqResFlow</h1>
        </div>
        <div className="sidebar-content">
          <div className="sidebar-empty">
            No saved requests yet.<br />Send a request to get started.
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-panel">
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
                <textarea
                  className="body-textarea"
                  placeholder='{"key": "value"}'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
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
    </div>
  );
};

export default App;

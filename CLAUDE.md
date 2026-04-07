# ReqResFlow — AI Development Guide

ReqResFlow is a desktop REST API client built with Electron, React, and TypeScript. It focuses on request building, environment variable management, response captures, and multi-step flow automation. Think Postman but lightweight, with a VS Code dark theme.

## Quick Start

```bash
npm start          # Dev mode (Electron + Vite HMR)
npm run make       # Build installers
npm run lint       # ESLint
npm run test:e2e   # Playwright E2E tests (app must be built first)
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Electron | 41.1.1 |
| UI framework | React | 19 |
| Language | TypeScript | ~4.5 |
| Bundler | Vite (via Electron Forge) | 5.4 |
| Animation | Motion (Framer Motion) | 12 |
| Code editor | CodeMirror 6 (@uiw/react-codemirror) | 4.25 |
| Styling | Single CSS file (CSS variables, dark theme) | — |
| Testing | Playwright (Electron mode) | 1.59 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process (src/main.ts)                    │
│  • IPC handlers for persistence (JSON files)            │
│  • HTTP request proxy (Node fetch)                      │
│  • Binary file reading for uploads                      │
│  • Data dir: {userData}/reqresflow-data/                 │
└────────────────────┬────────────────────────────────────┘
                     │ IPC (contextBridge)
┌────────────────────┴────────────────────────────────────┐
│  Preload (src/preload.ts)                               │
│  • Exposes window.electronAPI                           │
│  • 10 methods: sendRequest, load/save × 5 entities      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│  Renderer (src/App.tsx + hooks + components)            │
│  • All UI state lives in custom hooks                   │
│  • App.tsx orchestrates hooks and renders layout         │
│  • ~46 React components                                 │
│  • 12 custom hooks                                      │
│  • 9 utility modules                                    │
└─────────────────────────────────────────────────────────┘
```

### Process Boundaries

**Main process** (`src/main.ts`): Handles all filesystem I/O and HTTP. The renderer never touches `fs` or `fetch` directly. All communication goes through IPC channels.

**Preload** (`src/preload.ts`): Thin bridge — every method is a one-liner that calls `ipcRenderer.invoke(channel, data)`.

**Renderer**: Pure React. State management via custom hooks (no Redux, no Zustand). Single CSS file for all styles.

---

## Data Model

All types live in `src/types/electron.ts`. This is the **single source of truth** for the data model.

### Core Entities

```
Environment ←──────────── captures write values back
  │                              │
  │ {{varName}} substitution     │
  ↓                              │
RequestTab ──→ sendRequest() ──→ ResponseCapture extracts values
  │
  │ saved to
  ↓
Collection.requests[] (SavedRequest)
  │
  │ referenced by
  ↓
Flow.steps[] (FlowStep) ──→ sequential execution ──→ captures accumulate
```

### Type Definitions (abbreviated)

```typescript
// Body type selector options
type BodyType = "none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "graphql";
type RawLanguage = "json" | "text" | "xml" | "html" | "javascript";

// The active tab's full state
interface RequestTab {
  id: string;
  name: string;
  method: string;                                          // GET, POST, PUT, PATCH, DELETE
  url: string;
  params: { enabled: boolean; key: string; value: string }[];
  headers: { enabled: boolean; key: string; value: string }[];
  payloads: Payload[];                                     // Body variants
  activePayloadId: string;
  bodyType: BodyType;
  rawLanguage: RawLanguage;
  response: ResponseData | null;
  error: string | null;
  captures: ResponseCapture[];                             // Extract values from response
  auth: AuthConfig;                                        // none | bearer | basic
  savedToCollectionId: string | null;                      // Link to collection
  savedRequestId: string | null;                           // Link to saved request
  sourceHistoryId: string | null;
  isDirty: boolean;
}

// Stored in collections.json
interface Collection { id: string; name: string; requests: SavedRequest[]; }

// SavedRequest is like RequestTab but without response/error/isDirty
interface SavedRequest {
  id, name, method, url, params, headers, body, bodyType?, rawLanguage?,
  formData?, graphql?, binaryFilePath?, payloads?, activePayloadId?, captures?, auth?
}

// Stored in environments.json
interface Environment { id: string; name: string; variables: { key: string; value: string }[]; }

// Stored in history.json (max 100 entries)
interface HistoryEntry { id, timestamp, method, url, status, statusText, time, request: SavedRequest, flowName? }

// Stored in flows.json
interface Flow { id: string; name: string; steps: FlowStep[]; }
interface FlowStep { id, collectionId, requestId, captures: ResponseCapture[], continueOnError: boolean }

// Extracts values from response → writes to environment variables
interface ResponseCapture { id, enabled: boolean, varName, source: "body"|"header"|"status", path: string }

// Body variant (alternate bodies for same request)
interface Payload { id, name, body, bodyType, rawLanguage, formData, graphql, binaryFilePath }

// Auth options
type AuthConfig = { type: "none" } | { type: "bearer"; token: string } | { type: "basic"; username: string; password: string };

// HTTP response from main process
interface ResponseData { status, statusText, headers: Record<string,string>, body: string, time: number, size: number }

// Flow execution (ephemeral, not persisted)
interface FlowRunState { flowId, status: "idle"|"running"|"completed"|"aborted", currentStepIndex, stepResults[], startedAt, completedAt, totalTime }
interface FlowRunStepResult { stepId, stepIndex, requestName, requestMethod, status: "success"|"error"|"skipped", execution: FlowStepExecutionDetail | null, durationMs }
interface FlowStepExecutionDetail { resolvedUrl, resolvedMethod, resolvedHeaders, resolvedBody, response, error, capturedValues[] }

// Tab types for flows
interface FlowTab { id, flowId, name, mode: "editor"|"runner", isDirty }

// Session state (auto-saved, restored on launch)
interface SessionState { tabs: RequestTab[], activeTabId: string, activeEnvId: string | null }
```

### Persistence Layer

| Entity | File | IPC Channels | Max Items |
|--------|------|-------------|-----------|
| Collections | `collections.json` | `collections:load/save` | Unlimited |
| Environments | `environments.json` | `environments:load/save` | Unlimited |
| History | `history.json` | `history:load/save` | 100 |
| Flows | `flows.json` | `flows:load/save` | Unlimited |
| Session | `session.json` | `session:load/save` | 1 (auto-save) |

Data directory: `{userData}/reqresflow-data/` (created on first access). Tests use a temp directory via `ELECTRON_USER_DATA` env var.

---

## File Map

### Entry Points

| File | Purpose |
|------|---------|
| `src/main.ts` | Electron main process — IPC handlers, HTTP proxy, window creation |
| `src/preload.ts` | Context bridge — exposes `window.electronAPI` to renderer |
| `src/renderer.tsx` | React bootstrap — renders `<App />` into `#root` |
| `src/App.tsx` | Root component — orchestrates all hooks and renders layout |

### Custom Hooks (`src/hooks/`)

| Hook | Purpose | Key State |
|------|---------|-----------|
| `useTabs` | Request tab CRUD, active tab tracking | `tabs[]`, `activeTabId` |
| `useCollections` | Collection persistence | `collections[]` |
| `useEnvironments` | Environment CRUD, active env selection | `environments[]`, `activeEnvId` |
| `useHistory` | Request history tracking | `history[]` |
| `useFlowTabs` | Flow tab CRUD, flow lifecycle | `flows[]`, `flowTabs[]`, `activeFlowTabId` |
| `useFlowExecution` | Sequential flow step execution | `flowRunState`, `flowRunHistory` |
| `useSendRequest` | HTTP request sending, capture extraction | Ref-based pending state |
| `usePayloads` | Body variant and capture management | Derived from `activeTab` |
| `useSaveToCollection` | Save dialog, Ctrl+S handling | `showSavePicker` |
| `useSession` | Load/save all state on startup/change | `sessionLoaded` |
| `useSidebarResize` | Draggable sidebar width | `sidebarWidth` (160–600px) |
| `useContextMenu` | Right-click tab menus | `menu: {x, y, tabId}` |

### Utility Modules (`src/utils/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `request-builder.ts` | Build HTTP request from tab state | `buildRequestConfig()`, `REQUEST_FIELDS` |
| `request-execution.ts` | Execute single request (for flows) | `executeRequest()` |
| `request.ts` | Empty tab factory, path resolution | `createEmptyTab()`, `resolvePath()`, `getTabDisplayName()` |
| `captures.ts` | Extract response values into env vars | `extractCaptures()` |
| `http.ts` | Variable substitution, response detection | `substituteVars()`, `detectResponseLanguage()`, `METHOD_COLORS` |
| `url.ts` | URL parsing and query string building | `parseQueryParams()`, `getBaseUrl()`, `buildQueryString()` |
| `helpers.ts` | ID generation, formatting | `generateId()`, `formatSize()`, `getStatusClass()`, `tryPrettyJson()` |
| `http-headers.ts` | HTTP header autocomplete data | `HTTP_HEADER_NAMES`, `HEADER_VALUE_SUGGESTIONS` |
| `codemirror-extensions.ts` | CodeMirror env var highlighting/completion | `envVarHighlightPlugin`, `envVarCompletion`, `envVarHoverTooltip`, `formatCode()` |

### Components (`src/components/`) — 46 files

**Layout & Navigation:**
- `Sidebar.tsx` — Main sidebar with section tabs (Collections, History, Flows)
- `EnvironmentBar.tsx` — Request name + env selector above URL bar
- `UrlBar.tsx` — Method dropdown + URL input + Send/Save buttons
- `TabItems.tsx` — Draggable `TabItem` (request) and `FlowTabItem` with Framer Motion Reorder
- `TabContextMenu.tsx` — Right-click menu: Duplicate, Close, Close All

**Request Building:**
- `RequestPanelSection.tsx` — Tab router: Params, Headers, Body, Auth, Captures
- `KeyValueEditor.tsx` + `KeyValueRow.tsx` — Generic key-value editor (params, headers)
- `BodyEditor.tsx` — Routes to correct editor by body type
- `BodyTypeSelector.tsx` — Radio buttons for body type selection
- `FormDataEditor.tsx` + `FormDataRow.tsx` — Form data / URL-encoded body editor
- `GraphQLEditor.tsx` — Query + Variables dual CodeMirror editor
- `CodeEditor.tsx` — CodeMirror 6 wrapper with env var highlighting and formatting
- `AuthEditor.tsx` — Bearer token / Basic auth inputs
- `CapturesEditor.tsx` + `CaptureRow.tsx` — Response capture config (varName, source, path)
- `PayloadTabsBar.tsx` — Tabs for body payload variants
- `AutoGeneratedHeaders.tsx` — Shows auto-added headers (Content-Type, User-Agent, etc.)

**Autocomplete System:**
- `AutoSuggestInput.tsx` — Dual-mode input: `{{varName}}` insertion + plain suggestions
- `SuggestionDropdown.tsx` — Portal-rendered dropdown (positioned at cursor)
- `VariableHighlightOverlay.tsx` — Invisible overlay highlighting `{{var}}` in inputs
- `VariableValueTooltip.tsx` — Portal tooltip showing variable value on hover

**Response Viewing:**
- `ResponsePanel.tsx` — Response body (CodeMirror, read-only) + headers + metadata

**Collections & Sidebar:**
- `CollectionsSection.tsx` — Expandable collection groups with request items
- `CollectionRequestItem.tsx` — Single request with method badge, rename, variant children
- `HistorySection.tsx` + `HistoryItem.tsx` — Recent request list with timestamps
- `FlowsSection.tsx` + `FlowItem.tsx` — Flow list in sidebar

**Flow Editor & Runner:**
- `FlowEditor.tsx` — Edit flow name, add/remove/reorder steps, configure captures
- `FlowStepRow.tsx` — Single step: request reference, captures, continue-on-error
- `FlowRunner.tsx` — Live execution view with step-by-step results
- `FlowStepResultItem.tsx` — Step result row (✓ success, ✗ error, ⏭ skipped)
- `FlowTabContent.tsx` — Routes between FlowEditor and FlowRunner modes
- `LastRunSection.tsx` — Collapsible last-run results in editor view
- `StepDetail.tsx` — Tab-based detail: Response, Request, Captures
- `StepRequestContent.tsx` + `StepResponseContent.tsx` + `StepCapturesContent.tsx`
- `StepCaptureRow.tsx` — Step-level capture row (different from request-level)

**Modals:**
- `EnvManager.tsx` — Full environment management modal
- `EnvListPanel.tsx` + `EnvDetailPanel.tsx` — Env list + variable editor
- `SavePickerModal.tsx` — Pick collection to save request
- `RequestPickerModal.tsx` — Pick request for flow step

---

## Key Patterns

### 1. State Architecture

All state lives in custom hooks called from `App.tsx`. There is **no state library** — just `useState`, `useCallback`, `useRef`, and `useEffect`. The hooks are:

```
App.tsx calls:
  useTabs()              → tabs[], activeTab, updateTab(), addTab(), closeTab()
  useCollections()       → collections[], handleCollectionsChange()
  useEnvironments()      → environments[], activeEnvId, activeEnv
  useHistory()           → history[]
  useFlowTabs()          → flows[], flowTabs[], activeFlowTabId
  useFlowExecution(deps) → flowRunState, runFlow()
  useSendRequest(deps)   → sendRequest(), loadRequest(), loadHistoryEntry()
  usePayloads(deps)      → activePayload, body, addCapture(), updateCapture()
  useSaveToCollection()  → showSavePicker, saveRequestToCollection()
  useSession(deps)       → sessionLoaded
  useSidebarResize()     → sidebarWidth
  useContextMenu() ×2    → tab and flow tab context menus
```

App.tsx has only 4 direct useState calls:
- `requestPanel`: which request section tab is shown
- `responsePanel`: which response section tab is shown
- `loading`: request in flight
- `sidebarSection`: which sidebar section is active

### 2. Props-Down, Callbacks-Up

Components are **presentational**. Almost none have internal state. Data flows down via props; mutations flow up via callbacks. Example chain:

```
App.tsx
  → passes `updateTab(tabId, updates)` down
    → RequestPanelSection receives `onUpdateTab`
      → KeyValueEditor receives `onChange`
        → KeyValueRow receives `onUpdate`
          → user types → calls onUpdate(index, field, value)
            → bubbles all the way up to updateTab()
```

### 3. Environment Variable Substitution

Variables use `{{varName}}` syntax. Substitution happens at **send time** (never at edit time).

```typescript
// src/utils/http.ts
function substituteVars(text: string, vars: {key: string; value: string}[]): string
```

Substituted in: URL, query params, headers, body, auth token/credentials. The `buildRequestConfig()` function in `request-builder.ts` handles all substitution.

### 4. Response Captures

Captures extract values from responses and write them into environment variables:

```typescript
// src/utils/captures.ts
function extractCaptures(response, captures, currentVars) → { capturedValues, updatedVars }
```

Sources: `"body"` (dot-notation JSON path like `data.token`), `"header"` (header name), `"status"` (HTTP status code).

### 5. Flow Execution

Flows execute steps sequentially. Each step:
1. Looks up the referenced `SavedRequest` via `(collectionId, requestId)`
2. Merges request-level captures with step-level captures
3. Substitutes current environment variables
4. Sends the request
5. Extracts captures → updates environment variables
6. Next step uses updated variables

The `continueOnError` flag per step controls whether execution stops or continues on failure.

### 6. Dirty Tracking

Tabs track dirty state via `isDirty: boolean`. The `REQUEST_FIELDS` set in `request-builder.ts` defines which field changes mark a tab dirty. Saving to a collection clears dirty state.

### 7. Tab Duality

The app has two independent tab systems that toggle based on `sidebarSection`:
- **Request tabs** (default) — shown when sidebar is on Collections, History, or Environments
- **Flow tabs** — shown when sidebar is on Flows

Both use Framer Motion `Reorder.Group` for drag-to-reorder.

### 8. CodeMirror Integration

All code editing (request body, GraphQL, response viewer) uses `CodeEditor.tsx` which wraps `@uiw/react-codemirror`. Custom extensions in `codemirror-extensions.ts` provide:
- `{{varName}}` syntax highlighting
- Variable autocomplete
- Hover tooltips for variable values
- Code formatting (Prettier for JSON)

### 9. Portal Components

Dropdowns and tooltips render via `createPortal(el, document.body)` to escape overflow:hidden containers:
- `SuggestionDropdown` — autocomplete list
- `VariableValueTooltip` — variable hover preview

---

## CSS Architecture

Single file: `src/index.css`. Dark theme using CSS custom properties.

### Key Variables

```css
--bg-primary: #1e1e1e;     --bg-secondary: #252526;    --bg-tertiary: #2d2d2d;
--bg-input: #3c3c3c;        --bg-hover: #383838;        --bg-active: #094771;
--border: #404040;           --accent: #0078d4;          --accent-hover: #1a8ae8;
--text-primary: #cccccc;     --text-secondary: #999999;  --text-muted: #666666;
--success: #4ec9b0;          --warning: #dcdcaa;         --error: #f44747;
--method-get: #61affe;       --method-post: #49cc90;     --method-put: #fca130;
--method-patch: #c490e4;     --method-delete: #f93e3e;
--font-mono: "Cascadia Code", "Fira Code", Consolas, monospace;
--radius: 4px;
```

### Layout Classes

```
.app               → flex row (sidebar + main)
.sidebar            → fixed width, flex column
.main-panel         → flex: 1, flex column
.request-tabs-bar   → horizontal scrolling tab bar
.url-bar            → method + url + buttons
.request-response   → flex: 1 split between request and response panels
.response-section   → flex column with meta bar + body/headers
```

### Naming Conventions

- Component root class matches component name: `.sidebar`, `.url-bar`, `.flow-editor`
- BEM-like children: `.kv-row`, `.kv-row-input`, `.kv-remove-btn`
- State classes: `.active`, `.dirty`, `.disabled`, `.expanded`
- Method-colored elements: `.method-badge.get`, `.method-badge.post`

---

## IPC Channel Reference

```typescript
// window.electronAPI (declared in src/types/electron.ts)
sendRequest(config: RequestConfig): Promise<ResponseData>
loadCollections(): Promise<Collection[]>
saveCollections(collections: Collection[]): Promise<void>
loadEnvironments(): Promise<Environment[]>
saveEnvironments(environments: Environment[]): Promise<void>
loadHistory(): Promise<HistoryEntry[]>
saveHistory(history: HistoryEntry[]): Promise<void>
loadSession(): Promise<SessionState | null>
saveSession(session: SessionState): Promise<void>
loadFlows(): Promise<Flow[]>
saveFlows(flows: Flow[]): Promise<void>
```

---

## How to Extend

### Adding a New IPC Channel

1. **Main process** (`src/main.ts`): Add `ipcMain.handle("channel:name", handler)`
2. **Preload** (`src/preload.ts`): Add method to `contextBridge.exposeInMainWorld` object
3. **Types** (`src/types/electron.ts`): Add method to `Window.electronAPI` interface
4. All three must stay in sync.

### Adding a New Data Entity

1. Define the type in `src/types/electron.ts`
2. Add load/save IPC handlers in `src/main.ts` (follow existing pattern: `getXxxPath()` + `ipcMain.handle`)
3. Add bridge methods in `src/preload.ts`
4. Add type declaration in the `Window.electronAPI` interface
5. Create a custom hook in `src/hooks/useXxx.ts` (follow `useCollections.ts` pattern)
6. Wire the hook into `App.tsx`
7. Add load/save calls in `useSession.ts`

### Adding a New Component

1. Create `src/components/MyComponent.tsx`
2. Define a props interface with all data + callbacks
3. Keep state in the parent (or a hook) — components should be presentational
4. Add CSS classes to `src/index.css` using existing variable names
5. For animations, use `motion` (Framer Motion) — see `TabItems.tsx` for patterns
6. For autocomplete inputs, use `AutoSuggestInput` with `variables` and `suggestions` props

### Adding a New Request Panel Tab

1. Add the tab name to the `requestPanel` state type in `App.tsx`
2. Add a tab button in `RequestPanelSection.tsx` (follow existing tab pattern)
3. Create the panel content component
4. Add the conditional render in `RequestPanelSection.tsx`

### Adding a New Body Type

1. Add to `BodyType` union in `src/types/electron.ts`
2. Add radio button in `BodyTypeSelector.tsx`
3. Add editor component render case in `BodyEditor.tsx`
4. Handle serialization in `buildRequestConfig()` in `request-builder.ts`
5. Handle Content-Type in `AutoGeneratedHeaders.tsx`

### Adding a New Hook

Follow existing patterns:
```typescript
import { useState, useCallback } from "react";

export function useMyFeature(deps: { /* dependencies */ }) {
  const [state, setState] = useState(initialValue);

  const handler = useCallback(() => {
    // logic
    setState(newValue);
    // persist via window.electronAPI.saveXxx() if needed
  }, [deps]);

  return { state, handler };
}
```

Wire into `App.tsx` and pass returned values as props to child components.

### Adding E2E Tests

1. Create `e2e/tests/NN-feature-name.spec.ts`
2. Use helpers from `e2e/helpers/`:
   - `launchApp()` / `closeApp()` for lifecycle
   - `typeUrl()`, `selectMethod()`, `sendRequest()` from `data.ts`
   - Selectors from `selectors.ts` (object `S`)
3. Add selectors for new UI to `e2e/helpers/selectors.ts`
4. Tests run sequentially (`workers: 1`, `fullyParallel: false`)
5. Each `describe` block gets its own `launchApp()`/`closeApp()` pair in `beforeAll`/`afterAll`

---

## Critical Invariants

1. **Last tab rule**: The last request tab cannot be closed — it resets to an empty tab instead.
2. **Opening saved request**: Always creates a new tab (never reuses existing tabs).
3. **Flow immutability**: Flows reference requests by `(collectionId, requestId)` — they never copy or modify the original. If the request is deleted, the step fails at runtime.
4. **Captures merge**: When running a flow step, request-level captures and step-level captures are merged. Step captures can override request captures.
5. **Session auto-save**: Session state (tabs, activeTabId, activeEnvId) saves on every change. There is no explicit "save session" button.
6. **History cap**: History is capped at 100 entries. Oldest entries are dropped.
7. **Variable substitution timing**: `{{var}}` substitution happens at request send time, not at edit time. The raw `{{var}}` text is stored, not the resolved value.
8. **Preload sync requirement**: Any new `electronAPI` method must be added in both `preload.ts` AND the `Window.electronAPI` interface in `electron.ts`.

---

## Common Tasks & Patterns

### "I want to add a new field to SavedRequest"

1. Add the field to `SavedRequest` in `electron.ts`
2. If it's also on active tabs, add to `RequestTab` in `electron.ts`
3. Add the field to `REQUEST_FIELDS` in `request-builder.ts` (if it should trigger dirty state)
4. Initialize the field in `createEmptyTab()` in `request.ts`
5. Add UI for the field in the appropriate panel component
6. Handle the field in `buildRequestConfig()` if it affects the HTTP request
7. Handle the field in `loadRequest()` / `loadHistoryEntry()` in `useSendRequest.ts`

### "I want to add a new capture source"

1. Add to the `source` union in `ResponseCapture` type (`electron.ts`)
2. Add extraction logic in `extractCaptures()` in `captures.ts`
3. Add UI option in `CaptureRow.tsx` and `StepCaptureRow.tsx`
4. Handle the path input behavior (some sources need path, some don't)

### "I want to add keyboard shortcuts"

Look at `useSaveToCollection.ts` for the Ctrl+S pattern:
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      // action
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [deps]);
```

### "I want to add a new sidebar section"

1. Add to `sidebarSection` type in App.tsx
2. Add tab button in `Sidebar.tsx` sidebar tabs area
3. Create section component (follow `CollectionsSection.tsx` or `HistorySection.tsx`)
4. Add conditional render in `Sidebar.tsx`
5. Decide if request tabs or flow tabs are shown (controlled by `sidebarSection === "flows"` check in App.tsx)

---

## Component Hierarchy (Condensed)

```
App.tsx
├── Sidebar
│   ├── CollectionsSection → CollectionRequestItem[]
│   ├── HistorySection → HistoryItem[]
│   └── FlowsSection → FlowItem[]
├── [Request Tabs Mode]
│   ├── TabItem[] (Reorder.Group)
│   ├── EnvironmentBar
│   ├── UrlBar (AutoSuggestInput)
│   ├── RequestPanelSection
│   │   ├── KeyValueEditor → KeyValueRow[] (AutoSuggestInput)
│   │   ├── BodyEditor
│   │   │   ├── CodeEditor (CodeMirror)
│   │   │   ├── FormDataEditor → FormDataRow[]
│   │   │   └── GraphQLEditor → CodeEditor ×2
│   │   ├── AuthEditor (AutoSuggestInput)
│   │   └── CapturesEditor → CaptureRow[]
│   └── ResponsePanel (CodeEditor, read-only)
├── [Flow Tabs Mode]
│   ├── FlowTabItem[] (Reorder.Group)
│   └── FlowTabContent
│       ├── FlowEditor → FlowStepRow[] → StepCaptureRow[]
│       └── FlowRunner → FlowStepResultItem[] → StepDetail
├── EnvManager (modal) → EnvListPanel + EnvDetailPanel
├── SavePickerModal (modal)
└── RequestPickerModal (modal)
```

---

## E2E Test Infrastructure

- **Config**: `e2e/playwright.config.ts` — sequential (`workers: 1`), 30s timeout
- **App helper**: `e2e/helpers/app.ts` — `launchApp()` creates temp data dir, `closeApp()` deletes it, `restartApp()` preserves data for persistence tests
- **Selectors**: `e2e/helpers/selectors.ts` — all CSS selectors in one `S` object
- **Test data**: `e2e/helpers/data.ts` — factory functions (`makeCollection()`, `makeRequest()`, etc.) and UI helper functions (`typeUrl()`, `selectMethod()`, `sendRequest()`)
- **Test URLs**: httpbin.org and jsonplaceholder.typicode.com for real HTTP
- **Pattern**: `test.beforeAll → launchApp()`, `test.afterAll → closeApp()`, tests are sequential within describe blocks

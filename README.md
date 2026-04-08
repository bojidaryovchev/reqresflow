# ReqResFlow

A lightweight desktop REST API client built with Electron, React, and TypeScript. Build requests, manage environments, capture response values, and automate multi-step flows — all in a fast, VS Code-inspired dark interface.

![Electron](https://img.shields.io/badge/Electron-41.1.1-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-4.5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Guide](#user-guide)
  - [Request Building](#request-building)
  - [Sending Requests & Viewing Responses](#sending-requests--viewing-responses)
  - [Tabs](#tabs)
  - [Collections](#collections)
  - [Environments & Variables](#environments--variables)
  - [Response Captures](#response-captures)
  - [Payload Variants](#payload-variants)
  - [Flows (Multi-Step Sequences)](#flows-multi-step-sequences)
  - [History](#history)
  - [Sidebar](#sidebar)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Data Persistence](#data-persistence)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

- **Request Building** — GET, POST, PUT, PATCH, DELETE with params, headers, body (raw/JSON/XML/form-data/URL-encoded/binary/GraphQL), and auth (Bearer / Basic).
- **Environment Variables** — Store reusable values (`{{baseUrl}}`, `{{token}}`, etc.) and swap environments instantly. Variable suggestions appear as you type `{{`.
- **Response Captures** — Extract values from response body (JSON path), headers, or status code and save them as environment variables for chaining requests.
- **Payload Variants** — Save multiple body versions for the same request (e.g., valid vs. invalid input) and switch between them.
- **Flows** — Chain saved requests into ordered sequences. Captures propagate between steps. Supports continue-on-error per step.
- **Collections** — Organize saved requests into named groups with full CRUD and rename support.
- **History** — Automatically records the last 100 sent requests with full snapshots.
- **Tabbed Interface** — Multiple request and flow tabs with drag-to-reorder (Framer Motion), dirty indicators, duplicate, and context menus.
- **Session Restore** — Tabs, active environment, and open state are auto-saved and restored on every launch.
- **Auto-Suggest** — Inline `{{variable}}` suggestions with value preview, plus HTTP header name autocompletion.
- **CodeMirror Editor** — Syntax highlighting, variable highlighting, hover tooltips, and code formatting (Shift+Alt+F).
- **Dark Theme** — VS Code-inspired dark UI with CSS custom properties throughout.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (Electron + Vite HMR)
npm start

# Build distributable installers
npm run make

# Run linter
npm run lint

# Run E2E tests (requires a built app)
npm run test:e2e
```

---

## Tech Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Desktop shell | Electron 41.1.1                         |
| UI framework  | React 19                                |
| Language      | TypeScript ~4.5                         |
| Bundler       | Vite 5.4 (via Electron Forge)           |
| Animation     | Motion (Framer Motion) 12               |
| Code editor   | CodeMirror 6 (@uiw/react-codemirror)    |
| Styling       | Single CSS file with CSS custom properties |
| Testing       | Playwright 1.59 (Electron mode)         |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Electron Main Process (src/main.ts)                     │
│  • IPC handlers for persistence (JSON files)             │
│  • HTTP request proxy (Node fetch)                       │
│  • Binary file reading for uploads                       │
│  • Data dir: {userData}/reqresflow-data/                  │
└────────────────────┬─────────────────────────────────────┘
                     │ IPC (contextBridge)
┌────────────────────┴─────────────────────────────────────┐
│  Preload (src/preload.ts)                                │
│  • Exposes window.electronAPI                            │
│  • 10 methods: sendRequest, load/save × 5 entities       │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────┐
│  Renderer (src/App.tsx + hooks + components)              │
│  • All UI state in custom hooks (no Redux/Zustand)       │
│  • ~46 React components                                  │
│  • 12 custom hooks                                       │
│  • 9 utility modules                                     │
└──────────────────────────────────────────────────────────┘
```

The renderer never accesses the filesystem or network directly — all I/O goes through IPC channels to the main process.

---

## User Guide

### Request Building

1. **Method** — Pick GET, POST, PUT, PATCH, or DELETE from the dropdown in the URL bar.
2. **URL** — Enter the target URL. Use `{{variableName}}` for dynamic values.
3. **Params** — Key-value pairs that sync with the URL query string. Toggle individual params on/off.
4. **Headers** — Key-value pairs with auto-suggest for common HTTP header names. Auto-generated headers (User-Agent, Accept, etc.) are shown below and can be overridden.
5. **Body** — Choose a body type:
   - **none** — no body (default for GET)
   - **raw** — freeform text with language selector (JSON, Text, XML, HTML, JavaScript) and a Format button
   - **form-data** — multipart fields, each can be Text or File
   - **x-www-form-urlencoded** — URL-encoded key-value pairs
   - **binary** — send a file by path
   - **graphql** — dual editor for query + variables
6. **Auth** — No Auth, Bearer Token, or Basic Auth. Supports `{{variables}}`.
7. **Captures** — Define rules to extract values from the response after sending.

### Sending Requests & Viewing Responses

- Click **Send** (or press **Enter** in the URL field).
- `{{variables}}` are resolved at send time from the active environment.
- The response panel shows:
  - **Status code** (color-coded: green for 2xx, yellow for 3xx, red for 4xx/5xx)
  - **Time** and **size**
  - **Body** tab with syntax-highlighted, auto-formatted content and a Copy button
  - **Headers** tab listing all response headers
- If captures are configured and an environment is active, extracted values are saved immediately.
- Every sent request is recorded in History.

### Tabs

- Click **+** to open a new empty request tab.
- Click a tab to switch to it. Drag tabs to reorder.
- Close with the **×** button or middle-click. Right-click for Duplicate / Close / Close All.
- A dot (**●**) on the tab indicates unsaved changes.
- Tab names show the request name, URL path, or "Untitled".

### Collections

- **Create** — Click **+** next to "Collections" in the sidebar.
- **Save a request** — Press **Ctrl+S** or click Save. If the request isn't saved yet, a picker lets you choose the target collection.
- **Open** — Click a request in the sidebar to open it in a tab.
- **Rename/Delete** — Use the pencil (✎) and × icons on collections and requests.
- Collections auto-expand to show the active request.

### Environments & Variables

- **Select** an environment from the dropdown above the URL bar.
- **Manage** — Click the Manage button to open the environment editor (create, rename, delete environments; add/edit/remove variables).
- **Use variables** — Type `{{variableName}}` in any input. A suggestion dropdown appears as you type `{{`, showing matching variable names and their current values.
- Variables are substituted at send time — the raw `{{varName}}` text is what gets stored.

### Response Captures

Captures extract values from a response and write them into environment variables.

| Source            | Path field             | Example                  |
| ----------------- | ---------------------- | ------------------------ |
| Body (JSON path)  | Dot-notation JSON path | `data.token`, `items.0.id` |
| Header            | Header name            | `x-request-id`           |
| Status code       | (not needed)           | Captures `"200"`, `"404"` |

**Chaining example:**
1. POST `/auth/login` → capture `data.token` into `{{token}}`
2. GET `/users/me` with `Authorization: Bearer {{token}}`

### Payload Variants

- Each request starts with a "Default" payload.
- Click **+** in the payload bar to add variants (e.g., "Valid Input", "Missing Email").
- Each variant stores its own body content, body type, and language independently.
- Switch between variants by clicking their tabs. Rename via the name field or sidebar.
- Run a specific variant from the sidebar by clicking ▶ on it.

### Flows (Multi-Step Sequences)

Flows chain saved requests into an ordered sequence and execute them one by one.

1. **Create** — Click **+** in the Flows sidebar section.
2. **Add steps** — Click "Add Step" and pick a saved request from your collections.
3. **Reorder** — Use the up/down arrows on each step.
4. **Step captures** — Add extra capture rules per step that merge with the request's own captures. Captured values propagate to subsequent steps.
5. **Continue on error** — Toggle per step. When off (default), a failed step stops the flow.
6. **Run** — Click Run or ▶. The runner shows real-time step progress with ✓ / ✗ / ○ icons.
7. **Abort** — Click Abort during execution. The current step finishes, remaining steps are skipped.
8. **Results** — Click a completed step to inspect its response, sent request, and captured values.
9. Each successful step is also added to History (tagged with the flow name).

### History

- Every sent request is automatically recorded (max 100 entries).
- Shows method, status code, response time, URL, and timestamp.
- Entries from flows display a badge with the flow name.
- Click an entry to reopen it in a new tab with all original settings.
- Clear all history with the × button.

### Sidebar

The left sidebar has three switchable sections:

| Section       | Shows                              | Tab bar context        |
| ------------- | ---------------------------------- | ---------------------- |
| Collections   | Saved request groups               | Request tabs           |
| History       | Recent requests (newest first)     | Request tabs           |
| Flows         | Multi-step sequences               | Flow tabs              |

- Resize the sidebar by dragging its right edge (clamped between 160–600px).
- Quick-run requests or specific payload variants directly from the sidebar with the ▶ button.

### Keyboard Shortcuts

| Shortcut       | Action                                   |
| -------------- | ---------------------------------------- |
| Ctrl+S         | Save request to collection               |
| Enter          | Send request (when URL field is focused) |
| Shift+Alt+F    | Format body content                      |
| Enter          | Confirm rename                           |
| Escape         | Cancel rename                            |

---

## Data Persistence

All data is stored as JSON files in `{userData}/reqresflow-data/`:

| File               | Contents                              | Max entries |
| ------------------ | ------------------------------------- | ----------- |
| `collections.json` | Saved collections and their requests  | Unlimited   |
| `environments.json`| Environments and their variables      | Unlimited   |
| `history.json`     | Sent request history                  | 100         |
| `flows.json`       | Multi-step flow definitions           | Unlimited   |
| `session.json`     | Open tabs, active tab, active env     | 1           |

- Saving is automatic and continuous — changes persist immediately.
- On crash or unexpected exit, the app restores to its last saved state.
- Corrupted files are handled gracefully (the app starts with empty data for that category).

---

## Development

### Prerequisites

- Node.js (LTS recommended)
- npm

### Running in Dev Mode

```bash
npm start
```

Launches Electron with Vite HMR — changes to renderer code hot-reload instantly.

### Building

```bash
npm run make
```

Produces platform-specific installers via Electron Forge.

### Linting

```bash
npm run lint
```

Runs ESLint across all `.ts` and `.tsx` files.

---

## Testing

End-to-end tests use Playwright in Electron mode.

```bash
# Build the app first
npm run make

# Run tests
npm run test:e2e
```

- Tests are in `e2e/tests/` (15 spec files covering all major features).
- They run sequentially (`workers: 1`) with 30-second timeouts.
- Each test suite launches a fresh app instance with an isolated temp data directory.
- Test helpers in `e2e/helpers/` provide app lifecycle management, UI selectors, and factory functions.

### Test Coverage

| Spec file                           | Area covered                     |
| ----------------------------------- | -------------------------------- |
| `01-app-launch-and-session`         | Startup, session restore         |
| `02-tab-management`                 | Tab CRUD, reorder, context menu  |
| `03-request-building`              | Method, URL, params, headers, body, auth |
| `04-send-request`                   | Sending, response display        |
| `05-collections`                    | Collection & request CRUD        |
| `06-environments`                   | Environment & variable management|
| `07-history`                        | History recording & replay       |
| `08-flows`                          | Flow editor & runner             |
| `09-sidebar`                        | Sidebar sections & resize        |
| `10-keyboard-shortcuts`             | Ctrl+S, Enter, Shift+Alt+F       |
| `11-data-persistence`               | Save/restore across restarts     |
| `12-captures-e2e`                   | End-to-end capture chaining      |
| `13-payload-variants`               | Variant CRUD & execution         |
| `14-auto-suggest`                   | Variable & header suggestions    |
| `15-flow-tab-management`            | Flow tab lifecycle               |

---

## Project Structure

```
src/
├── main.ts                 # Electron main process (IPC, HTTP proxy, file I/O)
├── preload.ts              # Context bridge (window.electronAPI)
├── renderer.tsx            # React entry point
├── App.tsx                 # Root component — orchestrates hooks, renders layout
├── index.css               # All styles (CSS variables, dark theme)
├── components/             # ~46 React components
│   ├── Sidebar.tsx              # Main sidebar with section tabs
│   ├── UrlBar.tsx               # Method + URL input + Send/Save
│   ├── TabItems.tsx             # Draggable request & flow tabs
│   ├── RequestPanelSection.tsx  # Params/Headers/Body/Auth/Captures tabs
│   ├── ResponsePanel.tsx        # Response body & headers viewer
│   ├── KeyValueEditor.tsx       # Generic key-value editor
│   ├── BodyEditor.tsx           # Body type router
│   ├── CodeEditor.tsx           # CodeMirror 6 wrapper
│   ├── AutoSuggestInput.tsx     # Input with {{variable}} suggestions
│   ├── FlowEditor.tsx           # Flow step editor
│   ├── FlowRunner.tsx           # Flow execution view
│   ├── EnvManager.tsx           # Environment management modal
│   ├── CollectionsSection.tsx   # Sidebar collections list
│   ├── HistorySection.tsx       # Sidebar history list
│   ├── FlowsSection.tsx         # Sidebar flows list
│   └── ...                      # 30+ more components
├── hooks/                  # 12 custom hooks (all state management)
│   ├── useTabs.ts               # Request tab CRUD & tracking
│   ├── useCollections.ts        # Collection persistence
│   ├── useEnvironments.ts       # Environment CRUD & active env
│   ├── useHistory.ts            # Request history
│   ├── useFlowTabs.ts           # Flow tab CRUD & lifecycle
│   ├── useFlowExecution.ts      # Sequential flow execution
│   ├── useSendRequest.ts        # HTTP sending & capture extraction
│   ├── usePayloads.ts           # Body variants & captures
│   ├── useSaveToCollection.ts   # Save dialog & Ctrl+S
│   ├── useSession.ts            # Session load/save on startup
│   ├── useSidebarResize.ts      # Draggable sidebar width
│   └── useContextMenu.ts        # Right-click tab menus
├── types/                  # TypeScript type definitions
│   └── electron.ts              # All data model types (single source of truth)
└── utils/                  # 9 utility modules
    ├── request-builder.ts       # Build HTTP config from tab state
    ├── request-execution.ts     # Execute single request (for flows)
    ├── request.ts               # Tab factory, path resolution
    ├── captures.ts              # Extract response values → env vars
    ├── http.ts                  # Variable substitution, response detection
    ├── url.ts                   # URL parsing & query string
    ├── helpers.ts               # ID generation, formatting
    ├── http-headers.ts          # Header autocomplete data
    └── codemirror-extensions.ts # CodeMirror env var plugins

e2e/
├── playwright.config.ts    # Playwright config (sequential, 30s timeout)
├── helpers/
│   ├── app.ts                   # App launch/close/restart helpers
│   ├── data.ts                  # Factory functions & UI helpers
│   └── selectors.ts             # All CSS selectors (S object)
└── tests/                  # 15 E2E spec files

docs/
└── user-flows/             # 15 user-facing workflow documents
```

---

## License

MIT

# ReqResFlow — Copilot Instructions

## What This App Is

ReqResFlow is a **Postman-like HTTP request testing desktop app** built with Electron + React + TypeScript. Users create, test, and organize API requests in a tabbed interface with collections, environments, history, and response captures.

## Tech Stack

- **Electron 41** (main + renderer + preload process model)
- **React 19** with functional components and hooks (no state library — useState/useCallback only)
- **TypeScript** (strict)
- **Vite** via `@electron-forge/plugin-vite` for bundling
- **Framer Motion** (`motion` package) for drag-and-drop tab reordering
- **No CSS framework** — single `src/index.css` with VS Code dark theme colors

## Commands

| Action           | Command                                 |
| ---------------- | --------------------------------------- |
| Run dev          | `npm start` (or `electron-forge start`) |
| Build installers | `npm run make`                          |
| Lint             | `npm run lint`                          |

## Architecture

```
src/
  main.ts          — Electron main process: IPC handlers, data persistence, HTTP via fetch()
  preload.ts       — Context bridge: exposes window.electronAPI to renderer
  renderer.tsx     — React entry point (renders <App /> into #root)
  App.tsx          — Main container (~1800 lines): ALL state, tabs, request execution, UI
  index.css        — All styles (dark theme, VS Code color scheme)
  components/
    Sidebar.tsx      — Collections + History panels (left sidebar)
    EnvManager.tsx   — Environment variables modal
    KeyValueEditor.tsx — Reusable params/headers/form-data editor with autosuggest
    AutoSuggestInput.tsx — Input with {{variable}} and header autocomplete
  types/
    electron.ts      — All type definitions (source of truth)
    electron.d.ts    — Legacy stubs (electron.ts is canonical)
```

## Key Patterns

### IPC Communication

All backend work goes through `window.electronAPI.*` (defined in `preload.ts`), which calls `ipcRenderer.invoke()` to the main process handlers in `main.ts`. Never use `require('electron')` in the renderer.

### Data Persistence

JSON files in `{userData}/reqresflow-data/`:

- `collections.json` — saved request collections
- `environments.json` — environment variable sets
- `history.json` — request history (max 100)
- `session.json` — active tabs, activeTabId, activeEnvId

IPC channels: `collections:load/save`, `environments:load/save`, `history:load/save`, `session:load/save`

### Tab System

- Each `RequestTab` holds: method, url, params, headers, payloads, auth, captures, response, isDirty
- Tabs use Framer Motion `<Reorder.Group>` for drag reorder
- Opening a saved request ALWAYS creates a new tab (never reuses)
- Last tab cannot be closed — it resets to a fresh empty tab instead
- Session auto-saves on every change

### Environment Variables

- Syntax: `{{variableName}}` — substituted at request time in URL, params, headers, auth fields, body
- Function: `substituteVars(text, variables)` in App.tsx
- `AutoSuggestInput` shows dropdown of matching vars when typing `{{`

### Request Execution Flow

1. Build URL with substituted `{{vars}}` + enabled query params
2. Merge default headers + user headers + auth headers
3. Build body based on bodyType (raw, form-data, x-www-form-urlencoded, graphql, binary)
4. Send via `window.electronAPI.sendRequest()` → main process `fetch()`
5. Store response in tab, apply response captures, add to history

### Body Types

`"none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "graphql"`

### Auth Types

`{ type: "none" } | { type: "bearer", token } | { type: "basic", username, password }`

### Response Captures

Extract values from responses into environment variables:

- Sources: `body` (JSON dot path like `data.token`), `header` (header name), `status`
- Applied automatically after each request

## Conventions

- **All state lives in App.tsx** — components receive props and callbacks, no local state management
- **No external state library** — React hooks only (useState, useCallback, useEffect, useRef)
- **Type definitions** go in `src/types/electron.ts` — this is the source of truth
- **Styles** go in `src/index.css` — no CSS modules, no styled-components
- **New components** go in `src/components/`
- **IPC handlers** go in `src/main.ts` with `ipcMain.handle(channel, handler)`
- **Preload bindings** go in `src/preload.ts` and must be added to both the implementation AND the `ElectronAPI` interface in `electron.d.ts`
- **App.tsx is large by design** — it's the orchestrator. Prefer extracting reusable UI into components, but keep request logic and state in App.tsx

## Common Tasks

### Adding a new IPC channel

1. Add handler in `src/main.ts`: `ipcMain.handle("channel-name", async (_, args) => { ... })`
2. Add binding in `src/preload.ts`: `channelName: (args) => ipcRenderer.invoke("channel-name", args)`
3. Add type in `src/types/electron.d.ts` `ElectronAPI` interface
4. Call via `window.electronAPI.channelName(args)` in renderer

### Adding a new request feature

1. Add field to `RequestTab` type in `src/types/electron.ts`
2. Update `createEmptyTab()` in `App.tsx` with default value
3. Add UI controls in the appropriate request panel section of `App.tsx`
4. Handle in `sendRequest()` if it affects HTTP behavior
5. Update session migration logic if needed (for backward compat with saved sessions)

### Adding a new component

1. Create in `src/components/NewComponent.tsx`
2. Import and use in `App.tsx`
3. Pass state/callbacks as props from App.tsx — don't create independent state

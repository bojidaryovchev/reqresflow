---
description: "Use when editing App.tsx, implementing new features, modifying request logic, updating tab behavior, adding UI panels, or working on the main container component."
applyTo: "src/App.tsx"
---
# App.tsx Patterns

App.tsx is the main orchestrator (~1800 lines). ALL app state lives here by design.

## State Pattern
- State: `useState` only, no external state library
- Callbacks: `useCallback` for all handlers passed to children
- Effects: `useEffect` for loading data and auto-saving session

## Tab State
```typescript
const [tabs, setTabs] = useState<RequestTab[]>([createEmptyTab()]);
const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
```
- `updateTab(id, partial)` merges fields into a tab
- `createEmptyTab()` returns a fresh RequestTab with defaults
- Last tab cannot be closed — resets to empty instead

## Adding a New Request Panel Tab
1. Add state field to `RequestTab` type in `src/types/electron.ts`
2. Set default in `createEmptyTab()`
3. Add panel button in the request-panels section
4. Add panel content in the conditional rendering block
5. Wire up `updateTab()` calls for changes

## Adding a New Body Type
1. Add to `BodyType` union in `src/types/electron.ts`
2. Add selector option in body type dropdown
3. Add rendering block for the new body editor
4. Handle in `sendRequest()` to build the correct request body/headers
5. Handle in `loadRequest()` for saved request compatibility

## Key Functions
- `sendRequest()` — builds and sends HTTP request via IPC
- `substituteVars(text, variables)` — replaces `{{var}}` with env values
- `loadRequest()` — opens saved/history request in new tab
- `saveRequest()` — saves current tab to collection
- `saveSession()` — persists all tabs to disk

## Dirty State
REQUEST_FIELDS array defines which fields mark a tab dirty when changed.
Dirty = modified since last save. Shows "●" on tab.

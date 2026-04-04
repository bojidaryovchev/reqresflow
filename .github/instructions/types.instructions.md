---
description: "Use when modifying type definitions, adding new fields to request tabs, collections, environments, or any data model changes."
applyTo: src/types/electron.ts, src/types/electron.d.ts
---

# Type Definitions

## Source of Truth

`src/types/electron.ts` is the canonical type file. `electron.d.ts` has legacy stubs and the `ElectronAPI` interface.

## Key Types

- `BodyType`: `"none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "graphql"`
- `RawLanguage`: `"json" | "text" | "xml" | "html" | "javascript"`
- `AuthConfig`: `{ type: "none" } | { type: "bearer"; token } | { type: "basic"; username; password }`
- `RequestTab`: Full tab state including response, UI state, dirty flag
- `Payload`: Body variant with all body-type-specific fields
- `ResponseCapture`: Extract response values → env vars
- `SavedRequest`: Serializable request template (subset of RequestTab)
- `Collection`: Named folder of SavedRequests
- `Environment`: Named set of `{ key, value }[]` variables
- `HistoryEntry`: Previous request record
- `SessionState`: `{ tabs, activeTabId, activeEnvId }`

## When Adding a New Field to RequestTab

1. Add to `RequestTab` interface in `electron.ts`
2. Add to `SavedRequest` if it should be persisted in collections
3. Update `createEmptyTab()` in App.tsx with a default value
4. Update `loadRequest()` in App.tsx to handle migration from old saved data
5. Update session migration logic if needed

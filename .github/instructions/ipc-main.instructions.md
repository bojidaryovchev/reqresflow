---
description: "Use when adding IPC channels, modifying Electron main process, changing data persistence, or working on HTTP request handling in the backend."
applyTo: src/main.ts, src/preload.ts
---
# IPC & Main Process Patterns

## Adding a New IPC Channel (3-step checklist)
1. **main.ts**: `ipcMain.handle("channel-name", async (_, args) => { ... })`
2. **preload.ts**: `channelName: (args) => ipcRenderer.invoke("channel-name", args)`
3. **electron.d.ts**: Add to `ElectronAPI` interface

All three must be updated or the channel won't work.

## Data Persistence
All JSON files go in `dataDir = path.join(app.getPath("userData"), "reqresflow-data")`.
Use `ensureDataDir()` before first read/write.
Pattern: `fs.readFileSync` / `fs.writeFileSync` with UTF-8, wrapped in try/catch returning defaults on failure.

## HTTP Request Handler (`send-request`)
- Uses Node.js native `fetch()`
- Measures timing with `performance.now()`
- Binary body type: reads file from disk with `fs.readFileSync()`
- Returns: `{ status, statusText, headers, body, time, size }`
- Always returns result or error — never throws to renderer

## Security
- preload.ts uses `contextBridge.exposeInMainWorld` — never expose ipcRenderer directly
- Validate/sanitize file paths in binary body handler
- Never use `nodeIntegration: true`

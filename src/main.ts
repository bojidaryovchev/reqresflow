import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ── Data directory setup ──
function getDataDir(): string {
  const base = process.env.ELECTRON_USER_DATA || app.getPath("userData");
  const dir = path.join(base, "reqresflow-data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getCollectionsPath(): string {
  return path.join(getDataDir(), "collections.json");
}

function getEnvironmentsPath(): string {
  return path.join(getDataDir(), "environments.json");
}

function getHistoryPath(): string {
  return path.join(getDataDir(), "history.json");
}

function getSessionPath(): string {
  return path.join(getDataDir(), "session.json");
}

// ── IPC: Collections ──
ipcMain.handle("collections:load", () => {
  const filePath = getCollectionsPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Failed to load collections:", err);
    return [];
  }
});

ipcMain.handle("collections:save", (_event, collections: unknown) => {
  try {
    fs.writeFileSync(
      getCollectionsPath(),
      JSON.stringify(collections, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to save collections:", err);
  }
});

// ── IPC: Environments ──
ipcMain.handle("environments:load", () => {
  const filePath = getEnvironmentsPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Failed to load environments:", err);
    return [];
  }
});

ipcMain.handle("environments:save", (_event, environments: unknown) => {
  try {
    fs.writeFileSync(
      getEnvironmentsPath(),
      JSON.stringify(environments, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to save environments:", err);
  }
});

// ── IPC: History ──
ipcMain.handle("history:load", () => {
  const filePath = getHistoryPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Failed to load history:", err);
    return [];
  }
});

ipcMain.handle("history:save", (_event, history: unknown) => {
  try {
    fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save history:", err);
  }
});

// ── IPC: Session ──
ipcMain.handle("session:load", () => {
  const filePath = getSessionPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
});

ipcMain.handle("session:save", (_event, session: unknown) => {
  try {
    fs.writeFileSync(getSessionPath(), JSON.stringify(session), "utf-8");
  } catch (err) {
    console.error("Failed to save session:", err);
  }
});

// ── IPC: Flows ──
function getFlowsPath(): string {
  return path.join(getDataDir(), "flows.json");
}

ipcMain.handle("flows:load", () => {
  const filePath = getFlowsPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Failed to load flows:", err);
    return [];
  }
});

ipcMain.handle("flows:save", (_event, flows: unknown) => {
  try {
    fs.writeFileSync(getFlowsPath(), JSON.stringify(flows, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save flows:", err);
  }
});

// ── IPC: HTTP Request Handler ──
ipcMain.handle(
  "send-request",
  async (
    _event,
    config: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: string;
      bodyType?: string;
    },
  ) => {
    const start = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method: config.method,
        headers: { ...config.headers },
      };

      if (config.body && ["POST", "PUT", "PATCH", "DELETE"].includes(config.method)) {
        // For binary body type, read the file from disk
        if (config.bodyType === "binary" && config.body) {
          if (fs.existsSync(config.body)) {
            fetchOptions.body = fs.readFileSync(config.body);
          } else {
            throw new Error(`File not found: ${config.body}`);
          }
        } else {
          fetchOptions.body = config.body;
        }
      }

      const response = await fetch(config.url, fetchOptions);
      const bodyText = await response.text();
      const elapsed = Math.round(performance.now() - start);

      // Collect response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: bodyText,
        time: elapsed,
        size: new TextEncoder().encode(bodyText).length,
      };
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      throw new Error(
        `Request failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
);

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

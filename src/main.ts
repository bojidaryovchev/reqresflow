import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
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
    fs.writeFileSync(
      getHistoryPath(),
      JSON.stringify(history, null, 2),
      "utf-8",
    );
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

      if (
        config.body &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(config.method)
      ) {
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

// ── IPC: Generators ──
function getGeneratorConfigPath(): string {
  return path.join(getDataDir(), "generator-config.json");
}

ipcMain.handle("generators:load-config", () => {
  const filePath = getGeneratorConfigPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
});

ipcMain.handle("generators:save-config", (_event, config: unknown) => {
  try {
    fs.writeFileSync(
      getGeneratorConfigPath(),
      JSON.stringify(config, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to save generator config:", err);
  }
});

ipcMain.handle("generators:remove-config", () => {
  const filePath = getGeneratorConfigPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

function dockerExec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("docker", args, { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

ipcMain.handle("generators:build", async (_event, projectDir: string) => {
  try {
    // Validate the directory exists and has a Dockerfile
    if (!fs.existsSync(path.join(projectDir, "Dockerfile"))) {
      return {
        success: false,
        error: "No Dockerfile found in project directory",
        logs: "",
      };
    }
    return new Promise<{ success: boolean; error?: string; logs: string }>(
      (resolve) => {
        execFile(
          "docker",
          ["build", "-t", "reqresflow-generators", projectDir],
          { timeout: 120_000, maxBuffer: 1024 * 1024 },
          (err, stdout, stderr) => {
            const logs = (stdout + stderr).trim();
            if (err) {
              resolve({ success: false, error: err.message, logs });
            } else {
              resolve({ success: true, logs });
            }
          },
        );
      },
    );
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      logs: "",
    };
  }
});

ipcMain.handle(
  "generators:start",
  async (
    _event,
    config: { projectDir: string; containerName: string; port: number },
  ) => {
    try {
      // Stop existing container if running
      try {
        await dockerExec(["rm", "-f", config.containerName]);
      } catch {
        // Ignore — container may not exist
      }

      const generatorsDir = path.join(config.projectDir, "generators");
      const mountArgs = fs.existsSync(generatorsDir)
        ? ["-v", `${generatorsDir}:/app/generators:ro`]
        : [];

      const output = await dockerExec([
        "run",
        "-d",
        "--name",
        config.containerName,
        "-p",
        `${config.port}:7890`,
        ...mountArgs,
        "reqresflow-generators",
      ]);
      return { success: true, logs: output };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        logs: "",
      };
    }
  },
);

ipcMain.handle("generators:stop", async (_event, containerName: string) => {
  try {
    await dockerExec(["rm", "-f", containerName]);
  } catch {
    // Ignore errors if container doesn't exist
  }
});

ipcMain.handle("generators:logs", async (_event, containerName: string) => {
  return new Promise<string>((resolve) => {
    execFile(
      "docker",
      ["logs", "--tail", "200", containerName],
      { timeout: 10_000 },
      (_err, stdout, stderr) => {
        // docker logs sends container stdout to stdout and container stderr to stderr
        resolve((stdout + stderr).trim());
      },
    );
  });
});

ipcMain.handle("generators:health", async (_event, port: number) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
});

ipcMain.handle("generators:list", async (_event, port: number) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/list`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
});

ipcMain.handle(
  "generators:invoke",
  async (_event, port: number, name: string) => {
    const response = await fetch(`http://127.0.0.1:${port}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Generator "${name}" failed: ${text}`);
    }
    const data = await response.json();
    return String(data.value);
  },
);

ipcMain.handle("dialog:select-directory", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

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

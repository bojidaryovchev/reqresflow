import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ── IPC: HTTP Request Handler ──
ipcMain.handle('send-request', async (_event, config: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}) => {
  const start = performance.now();

  try {
    const fetchOptions: RequestInit = {
      method: config.method,
      headers: config.headers,
    };

    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      fetchOptions.body = config.body;
      // Auto-set Content-Type if not provided
      if (!Object.keys(config.headers).some((k) => k.toLowerCase() === 'content-type')) {
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
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
      `Request failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const API_BASE = process.env.SAM_LOCAL_API_URL || "http://127.0.0.1:8000";
const ALLOWED_PATHS = new Set([
  "/api/chat", "/api/system", "/api/memory", "/api/research",
  "/api/files", "/api/files/read", "/api/files/write", "/api/commands/execute"
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 760, minHeight: 600,
    backgroundColor: "#0b1020", title: "SAM Private Assistant",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

ipcMain.handle("sam:request", async (_event, request) => {
  if (!request || typeof request.path !== "string" || !ALLOWED_PATHS.has(request.path)) {
    throw new Error("This SAM API route is not allowed from the desktop UI.");
  }
  const method = request.method === "GET" ? "GET" : "POST";
  const token = process.env.SAM_LOCAL_API_TOKEN || "";
  if (token.length < 32) throw new Error("Set SAM_LOCAL_API_TOKEN before starting the desktop app.");
  const url = new URL(request.path, API_BASE);
  if (url.origin !== new URL(API_BASE).origin) throw new Error("Invalid local API origin.");
  if (method === "GET" && request.query && typeof request.query === "object") {
    for (const [key, value] of Object.entries(request.query)) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(request.body || {}) : undefined,
    signal: AbortSignal.timeout(90000)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: "Local backend returned invalid JSON." }; }
  if (!response.ok) throw new Error(data.detail || data.error || ("SAM backend returned " + response.status));
  return data;
});

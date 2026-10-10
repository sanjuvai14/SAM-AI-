const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("samDesktop", Object.freeze({
  request: (request) => ipcRenderer.invoke("sam:request", request)
}));

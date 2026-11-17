// Small, explicit bridge between the overlay page and the Electron main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayBridge", {
  setInteractive: (interactive) => ipcRenderer.send("set-interactive", interactive),
  onState: (callback) => ipcRenderer.on("state", (_event, state) => callback(state)),
});

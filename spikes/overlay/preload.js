// Small, explicit bridge between the overlay page and the Electron main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayBridge", {
  setInteractive: (interactive) => ipcRenderer.send("set-interactive", interactive),
  resize: (width, height) => ipcRenderer.send("resize", { width, height }),
  moveBy: (dx, dy) => ipcRenderer.send("move-by", { dx, dy }),
  dragEnd: () => ipcRenderer.send("drag-end"),
  hide: () => ipcRenderer.send("hide"),
  onState: (callback) => ipcRenderer.on("state", (_event, state) => callback(state)),
});

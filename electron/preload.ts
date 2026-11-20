// Small, explicit bridge between the overlay page and the main process.
// Runs sandboxed: only what the page needs, nothing else.
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type OverlayBridge, type OverlayState } from '../src/lib/overlay/bridge';
import type { AppStatus } from '../src/lib/status';

const bridge: OverlayBridge = {
	setInteractive: (interactive) => ipcRenderer.send(IPC.setInteractive, interactive),
	resize: (width, height) => ipcRenderer.send(IPC.resize, { width, height }),
	moveBy: (dx, dy) => ipcRenderer.send(IPC.moveBy, { dx, dy }),
	dragEnd: () => ipcRenderer.send(IPC.dragEnd),
	hide: () => ipcRenderer.send(IPC.hide),
	onState: (callback) =>
		ipcRenderer.on(IPC.state, (_event, state: OverlayState) => callback(state)),
	getStatus: () => ipcRenderer.invoke(IPC.getStatus),
	onStatus: (callback) =>
		ipcRenderer.on(IPC.status, (_event, status: AppStatus) => callback(status)),
	choosePath: (kind) => ipcRenderer.invoke(IPC.choosePath, kind),
	resetPath: (kind) => ipcRenderer.invoke(IPC.resetPath, kind)
};

contextBridge.exposeInMainWorld('overlayBridge', bridge);

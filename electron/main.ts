// Electron main process: a small, transparent, always-on-top overlay above Victoria 3.
// Lessons from spike S3 (docs/spikes/s3-overlay.md) are built in: whole-pixel coordinates,
// a single instance, a remembered position and no focus stealing.
import { app, BrowserWindow, globalShortcut, ipcMain, net, protocol, screen } from 'electron';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { IPC, type OverlayState } from '../src/lib/overlay/bridge';
import { clampToArea, defaultPosition, sanitizeSize } from './window-math';

const START_WIDTH = 338;
const START_HEIGHT = 64;
const devServer = process.argv.find((a) => a.startsWith('--dev-server='))?.split('=')[1];

let win: BrowserWindow | null = null;
let fullyClickThrough = false;

const positionFile = () => path.join(app.getPath('userData'), 'overlay-position.json');

function loadPosition(): { x: number; y: number } | null {
	try {
		const p = JSON.parse(readFileSync(positionFile(), 'utf8'));
		return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
	} catch {
		return null;
	}
}

function savePosition() {
	if (!win) return;
	const [x, y] = win.getPosition();
	writeFile(positionFile(), JSON.stringify({ x, y })).catch(() => {});
}

function workAreaAt(x: number, y: number) {
	return screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
}

function setInteractive(interactive: boolean) {
	if (!win) return;
	// forward: keep mousemove events coming, so the page notices when the cursor comes back.
	if (interactive && !fullyClickThrough) win.setIgnoreMouseEvents(false);
	else win.setIgnoreMouseEvents(true, { forward: true });
}

function sendState(extra: Partial<OverlayState> = {}) {
	win?.webContents.send(IPC.state, { fullyClickThrough, ...extra } satisfies OverlayState);
}

function createWindow() {
	const primary = screen.getPrimaryDisplay().workArea;
	const saved = loadPosition();
	const start = clampToArea(
		saved ?? defaultPosition(primary, START_WIDTH),
		{ width: START_WIDTH, height: START_HEIGHT },
		saved ? workAreaAt(saved.x, saved.y) : primary
	);

	win = new BrowserWindow({
		...start,
		width: START_WIDTH,
		height: START_HEIGHT,
		transparent: true,
		frame: false,
		resizable: false,
		skipTaskbar: true,
		hasShadow: false,
		alwaysOnTop: true,
		show: false,
		title: 'Victoria 3 Companion',
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});
	// "screen-saver" is the highest level: stays above a borderless game.
	win.setAlwaysOnTop(true, 'screen-saver');
	setInteractive(false);

	win.loadURL(devServer ?? `${APP_SCHEME}://bundle/index.html`);

	// showInactive: never steal focus from the game.
	win.once('ready-to-show', () => win?.showInactive());
	win.on('closed', () => (win = null));

	if (capturePath) captureAndQuit(capturePath);
}

/**
 * Development aid: `electron . --capture=out.png [--expanded]` saves an image of the window
 * and quits. Useful to check the rendering without a screen recording.
 */
const capturePath = process.argv.find((a) => a.startsWith('--capture='))?.split('=')[1];
function captureAndQuit(file: string) {
	win?.webContents.once('did-finish-load', () =>
		setTimeout(async () => {
			if (!win) return;
			if (process.argv.includes('--expanded')) {
				await win.webContents.executeJavaScript(
					"document.querySelector('[role=button][title^=Klik]')?.click()"
				);
				await new Promise((r) => setTimeout(r, 800));
			}
			const image = await win.capturePage();
			await writeFile(file, image.toPNG());
			console.log('capture:', file, image.getSize());
			app.quit();
		}, 1500)
	);
}

function registerIpc() {
	ipcMain.on(IPC.setInteractive, (_e, interactive: unknown) =>
		setInteractive(interactive === true)
	);

	ipcMain.on(IPC.resize, (_e, requested: { width: number; height: number }) => {
		if (!win) return;
		const [x, y] = win.getPosition();
		const area = workAreaAt(x, y);
		const size = sanitizeSize(requested ?? {}, area);
		if (!size) return;
		const [w, h] = win.getSize();
		if (w === size.width && h === size.height) return; // unchanged: avoid needless redraws
		win.setBounds({ ...clampToArea({ x, y }, size, area), ...size });
	});

	ipcMain.on(IPC.moveBy, (_e, delta: { dx: number; dy: number }) => {
		if (!win || !Number.isFinite(delta?.dx) || !Number.isFinite(delta?.dy)) return;
		const [x, y] = win.getPosition();
		const [width, height] = win.getSize();
		const target = { x: x + delta.dx, y: y + delta.dy };
		const pos = clampToArea(target, { width, height }, workAreaAt(target.x, target.y));
		win.setPosition(pos.x, pos.y);
	});

	ipcMain.on(IPC.dragEnd, savePosition);

	ipcMain.on(IPC.hide, () => {
		win?.hide();
		setInteractive(false);
	});
}

function registerShortcuts() {
	const shortcuts: Record<string, () => void> = {
		// Show / hide the overlay
		'Alt+V': () => {
			if (!win) return;
			if (win.isVisible()) win.hide();
			else {
				win.showInactive();
				sendState({ shown: true });
			}
		},
		// Toggle full click-through (also through the overlay itself)
		'Alt+C': () => {
			fullyClickThrough = !fullyClickThrough;
			setInteractive(false);
			sendState();
		}
	};
	for (const [accelerator, handler] of Object.entries(shortcuts)) {
		if (!globalShortcut.register(accelerator, handler)) {
			console.warn(`Sneltoets ${accelerator} kon niet worden geregistreerd (al in gebruik?)`);
		}
	}
}

/**
 * Serve the built page from `app://bundle/…` instead of file://. SvelteKit's fallback page uses
 * absolute paths (`/_app/…`), which on file:// would point to the root of the drive.
 */
const APP_SCHEME = 'app';
const BUILD_DIR = path.join(__dirname, '..', 'build');
protocol.registerSchemesAsPrivileged([
	{ scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function registerAppProtocol() {
	protocol.handle(APP_SCHEME, (request) => {
		const { pathname } = new URL(request.url);
		const file = path.normalize(path.join(BUILD_DIR, decodeURIComponent(pathname)));
		// Never serve anything outside the build folder.
		if (!file.startsWith(BUILD_DIR + path.sep)) return new Response('Not found', { status: 404 });
		return net.fetch(pathToFileURL(file).toString());
	});
}

// Only one overlay at a time: a second start just quits.
if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.whenReady().then(() => {
		if (!devServer) registerAppProtocol();
		registerIpc();
		createWindow();
		registerShortcuts();
	});
	app.on('will-quit', () => globalShortcut.unregisterAll());
	app.on('window-all-closed', () => app.quit());
}

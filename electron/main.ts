// Electron main process: a small, transparent, always-on-top overlay above Victoria 3.
// Lessons from spike S3 (docs/spikes/s3-overlay.md) are built in: whole-pixel coordinates,
// a single instance, a remembered position and no focus stealing.
import {
	app,
	BrowserWindow,
	dialog,
	globalShortcut,
	ipcMain,
	net,
	protocol,
	screen
} from 'electron';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { IPC, type OverlayState } from '../src/lib/overlay/bridge';
import type { PathKind } from '../src/lib/status';
import type { ChatMessage } from '../src/lib/advisor/prompt';
import { askAdvisor, DEFAULT_MODEL, readSetting } from './advisor';
import { Companion } from './companion';
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
 * Development aid: `electron . --capture=out.png [--expanded] [--settings] [--capture-wait=ms]
 * [--capture-lang=en] [--capture-click=sel1|sel2]` saves an image of the window and quits. Useful to check the rendering
 * without a screen recording. `--capture-lang` clicks that language button (and so remembers
 * the choice); `--settings` opens the settings view.
 */
const captureLang = process.argv.find((a) => a.startsWith('--capture-lang='))?.split('=')[1];
const capturePath = process.argv.find((a) => a.startsWith('--capture='))?.split('=')[1];
const captureClicks = (
	process.argv.find((a) => a.startsWith('--capture-click='))?.slice('--capture-click='.length) ?? ''
)
	.split('|')
	.filter(Boolean);
const captureAfter = Number(
	process.argv.find((a) => a.startsWith('--capture-after='))?.split('=')[1] ?? 0
);
const captureWait = Number(
	process.argv.find((a) => a.startsWith('--capture-wait='))?.split('=')[1]
);
function captureAndQuit(file: string) {
	win?.webContents.once('did-finish-load', () =>
		setTimeout(async () => {
			if (!win) return;
			if (process.argv.includes('--expanded')) {
				await win.webContents.executeJavaScript("document.querySelector('[data-tip]')?.click()");
				await new Promise((r) => setTimeout(r, 800));
			}
			const toggleSettings = async () => {
				await win?.webContents.executeJavaScript(
					"document.querySelector('[data-settings-toggle]')?.click()"
				);
				await new Promise((r) => setTimeout(r, 500));
			};
			// The language buttons live in the settings view
			if (captureLang && /^[a-z]{2}$/.test(captureLang)) {
				await toggleSettings();
				await win.webContents.executeJavaScript(
					`[...document.querySelectorAll('.lang-btn')].find((b) => b.textContent.trim() === '${captureLang.toUpperCase()}')?.click()`
				);
				await new Promise((r) => setTimeout(r, 500));
				if (!process.argv.includes('--settings')) await toggleSettings();
			} else if (process.argv.includes('--settings')) {
				await toggleSettings();
			}
			// --capture-click=sel1|sel2: scroll each element into view and click it, in order
			for (const selector of captureClicks) {
				await win.webContents.executeJavaScript(
					`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el?.scrollIntoView({ block: 'center' }); el?.click(); })()`
				);
				await new Promise((r) => setTimeout(r, 400));
			}
			// --capture-after=ms: wait after the clicks (e.g. for a streamed AI answer)
			if (captureAfter > 0) await new Promise((r) => setTimeout(r, captureAfter));
			const image = await win.capturePage();
			await writeFile(file, image.toPNG());
			console.log('capture:', file, image.getSize());
			app.quit();
		}, captureWait || 1500)
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

	ipcMain.handle(IPC.getStatus, () => companion?.getStatus());
	ipcMain.handle(IPC.getKnowledge, () => companion?.getKnowledge() ?? null);

	// AI advisor: the key stays here (from .env next to the app or in the app's data folder)
	const running = new Map<string, AbortController>();
	ipcMain.on(IPC.askAdvisor, (_e, req: { id?: unknown; messages?: unknown }) => {
		const id = typeof req?.id === 'string' ? req.id.slice(0, 64) : null;
		if (!id || !isChat(req.messages)) return;
		const envFiles = [
			path.join(app.getAppPath(), '.env'),
			path.join(app.getPath('userData'), '.env')
		];
		const controller = new AbortController();
		running.set(id, controller);
		const send = (event: unknown) => win?.webContents.send(IPC.advisor, event);
		askAdvisor({
			apiKey: readSetting('GEMINI_API_KEY', envFiles),
			model: readSetting('GEMINI_MODEL', envFiles) ?? DEFAULT_MODEL,
			messages: req.messages,
			signal: controller.signal,
			onText: (text) => send({ id, type: 'text', text })
		}).then((error) => {
			running.delete(id);
			send(error ? { id, type: 'error', code: error } : { id, type: 'done' });
		});
	});
	ipcMain.on(IPC.cancelAdvisor, (_e, id: unknown) => {
		if (typeof id === 'string') running.get(id)?.abort();
	});
	ipcMain.on(IPC.releaseFocus, () => win?.blur());

	ipcMain.handle(IPC.choosePath, async (_e, kind: PathKind) => {
		if (!win || !companion || !isPathKind(kind)) return companion?.getStatus();
		const result = await dialog.showOpenDialog(win, {
			title:
				kind === 'rakaly'
					? 'Kies rakaly.exe'
					: kind === 'game'
						? 'Kies de map "Victoria 3" van de spelinstallatie'
						: 'Kies de map "Documents\\Paradox Interactive\\Victoria 3"',
			properties: kind === 'rakaly' ? ['openFile'] : ['openDirectory'],
			filters: kind === 'rakaly' ? [{ name: 'Rakaly', extensions: ['exe'] }] : undefined
		});
		if (!result.canceled && result.filePaths[0]) await companion.setPath(kind, result.filePaths[0]);
		return companion.getStatus();
	});

	ipcMain.handle(IPC.resetPath, async (_e, kind: PathKind) => {
		if (companion && isPathKind(kind)) await companion.setPath(kind, null);
		return companion?.getStatus();
	});
}

/** Only a list of plain chat messages of sensible size goes out. */
const isChat = (m: unknown): m is ChatMessage[] =>
	Array.isArray(m) &&
	m.length > 0 &&
	m.length <= 40 &&
	m.every(
		(x) =>
			x &&
			typeof x === 'object' &&
			['system', 'user', 'assistant'].includes((x as ChatMessage).role) &&
			typeof (x as ChatMessage).content === 'string' &&
			(x as ChatMessage).content.length <= 60000
	);

const isPathKind = (k: unknown): k is PathKind =>
	k === 'userData' || k === 'game' || k === 'rakaly';

/** Steam folders to try: from the registry first, then the usual install locations. */
function steamCandidates(): string[] {
	const dirs: string[] = [];
	try {
		const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
			encoding: 'utf8',
			windowsHide: true
		});
		const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
		if (match) dirs.push(path.normalize(match[1].trim()));
	} catch {
		// no Steam in the registry
	}
	for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]) {
		if (base) dirs.push(path.join(base, 'Steam'));
	}
	return [...new Set(dirs)];
}

let companion: Companion | null = null;

function startCompanion() {
	const appDataDir = app.getPath('userData');
	companion = new Companion({
		appDataDir,
		documentsDir: app.getPath('documents'),
		steamDirs: steamCandidates(),
		rakalyCandidates: [
			path.join(appDataDir, 'tools', 'rakaly.exe'),
			// Next to the app, in its "tools" folder: also works when %APPDATA% was redirected for
			// the process that put the file there (packaged Windows apps do that)
			path.join(app.getAppPath(), 'tools', 'rakaly.exe'),
			path.join(process.resourcesPath ?? '', 'rakaly.exe')
		],
		workerScript: path.join(__dirname, 'save-reader-worker.cjs'),
		onStatus: (status) => win?.webContents.send(IPC.status, status)
	});
	companion.start();
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
		startCompanion();
	});
	app.on('will-quit', () => {
		globalShortcut.unregisterAll();
		companion?.stop();
	});
	app.on('window-all-closed', () => app.quit());
}

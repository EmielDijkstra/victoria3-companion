// Ties everything together: find folders, watch the save folder, copy a new save,
// read it in a worker thread and publish the status to the overlay.
import { existsSync, watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { GameKnowledge } from '../src/lib/knowledge';
import type { Snapshot } from '../src/lib/snapshot';
import type { AppStatus, PathKind, PathStatus, SaveSummary } from '../src/lib/status';
import { readGameNames, readGoods, type GameNames, type GoodDefinition } from './game-data';
import { readGameKnowledge } from './game-knowledge';
import {
	findGameDir,
	findUserDataDir,
	readInstalledVersion,
	readLastPlayed,
	saveGamesDir
} from './game-paths';
import { copyToWorkDir, listSaves, newestSave, waitUntilStable } from './save-files';
import { loadSettings, saveSettings, type Settings } from './settings';

export interface CompanionOptions {
	/** The app's own data folder (Electron userData) */
	appDataDir: string;
	/** Windows Documents folder (Electron, follows OneDrive) */
	documentsDir: string;
	/** Candidate Steam folders, most likely first */
	steamDirs: string[];
	/** Extra places to look for rakaly.exe (e.g. bundled with the app later) */
	rakalyCandidates: string[];
	/** Path of the compiled worker script */
	workerScript: string;
	onStatus: (status: AppStatus) => void;
}

export class Companion {
	private settings: Settings;
	private status: AppStatus;
	private watcher: FSWatcher | null = null;
	private debounce: NodeJS.Timeout | null = null;
	private reading = false;
	private pending = false;
	private lastRead: { name: string; mtimeMs: number } | null = null;
	private goods: GoodDefinition[] | null = null;
	private names: GameNames | null = null;
	private knowledge: GameKnowledge | null | undefined = undefined;

	constructor(private readonly opts: CompanionOptions) {
		this.settings = loadSettings(this.settingsFile);
		this.status = {
			paths: {
				userData: { path: null, source: 'none' },
				game: { path: null, source: 'none' },
				rakaly: { path: null, source: 'none' }
			},
			installedVersion: null,
			lastPlayed: null,
			save: { state: 'waiting', reason: 'starting' }
		};
	}

	private get settingsFile() {
		return path.join(this.opts.appDataDir, 'settings.json');
	}

	getStatus(): AppStatus {
		return this.status;
	}

	/** Read on first request (a few hundred ms), then kept until the game folder changes. */
	getKnowledge(): GameKnowledge | null {
		if (this.knowledge === undefined)
			this.knowledge = readGameKnowledge(this.status.paths.game.path, this.status.installedVersion);
		return this.knowledge;
	}

	/** Find folders and start watching. Safe to call again after a setting changed. */
	start() {
		this.stopWatching();
		this.lastRead = null;
		const paths = this.resolvePaths();
		this.goods = readGoods(paths.game.path);
		this.names = readGameNames(paths.game.path);
		this.knowledge = undefined;
		this.status = {
			...this.status,
			paths,
			installedVersion: paths.game.path ? readInstalledVersion(paths.game.path) : null,
			lastPlayed: paths.userData.path ? readLastPlayed(paths.userData.path) : null
		};

		const saveDir = paths.userData.path ? saveGamesDir(paths.userData.path) : null;
		if (!saveDir || !existsSync(saveDir)) {
			this.setSave({ state: 'waiting', reason: 'no-user-data' });
			return;
		}
		if (!paths.rakaly.path) {
			this.setSave({ state: 'error', code: 'rakaly-missing' });
			return;
		}

		this.watcher = watch(saveDir, (_event, name) => {
			if (name && !String(name).toLowerCase().endsWith('.v3')) return;
			// The game writes in bursts; wait a moment before looking.
			if (this.debounce) clearTimeout(this.debounce);
			this.debounce = setTimeout(() => this.readNewest(saveDir), 1000);
		});
		this.readNewest(saveDir);
	}

	stop() {
		this.stopWatching();
	}

	/** The player chose a folder or file in the settings. */
	async setPath(kind: PathKind, value: string | null) {
		const key = ({ userData: 'userDataDir', game: 'gameDir', rakaly: 'rakalyPath' } as const)[kind];
		this.settings = { ...this.settings, [key]: value };
		await saveSettings(this.settingsFile, this.settings);
		this.start();
	}

	private stopWatching() {
		this.watcher?.close();
		this.watcher = null;
		if (this.debounce) clearTimeout(this.debounce);
	}

	private resolvePaths(): Record<PathKind, PathStatus> {
		const pick = (
			manual: string | null,
			auto: () => string | null,
			exists: (p: string) => boolean = existsSync
		): PathStatus => {
			if (manual) {
				return exists(manual)
					? { path: manual, source: 'manual' }
					: { path: null, source: 'none', problem: { code: 'chosen-missing', path: manual } };
			}
			const found = auto();
			return found
				? { path: found, source: 'auto' }
				: { path: null, source: 'none', problem: { code: 'not-found' } };
		};
		return {
			userData: pick(this.settings.userDataDir, () => findUserDataDir(this.opts.documentsDir)),
			game: pick(this.settings.gameDir, () => findGameDir(this.opts.steamDirs)),
			rakaly: pick(
				this.settings.rakalyPath,
				() => this.opts.rakalyCandidates.find((p) => existsSync(p)) ?? null
			)
		};
	}

	private async readNewest(saveDir: string) {
		if (this.reading) {
			this.pending = true; // read again when the current read is done
			return;
		}
		this.reading = true;
		try {
			const newest = newestSave(await listSaves(saveDir));
			if (!newest) {
				this.setSave({ state: 'waiting', reason: 'no-saves' });
				return;
			}
			if (this.lastRead?.name === newest.name && this.lastRead.mtimeMs === newest.mtimeMs) return;

			this.setSave({ state: 'reading', fileName: newest.name });
			const original = path.join(saveDir, newest.name);
			if (!(await waitUntilStable(original))) {
				this.setSave({ state: 'error', code: 'unstable', fileName: newest.name });
				return;
			}
			const copy = await copyToWorkDir(original, path.join(this.opts.appDataDir, 'work'));
			const result = await this.readInWorker(copy, newest.name);
			this.lastRead = { name: newest.name, mtimeMs: newest.mtimeMs };
			if (result.ok)
				this.setSave({ state: 'ready', summary: result.summary, snapshot: result.snapshot });
			else
				this.setSave({
					state: 'error',
					code: 'read-failed',
					fileName: newest.name,
					detail: result.message,
					...this.lastGood()
				});
		} catch (error) {
			this.setSave({
				state: 'error',
				code: 'unexpected',
				detail: error instanceof Error ? error.message : String(error),
				...this.lastGood()
			});
		} finally {
			this.reading = false;
			if (this.pending) {
				this.pending = false;
				this.readNewest(saveDir);
			}
		}
	}

	private readInWorker(
		savePath: string,
		fileName: string
	): Promise<
		{ ok: true; summary: SaveSummary; snapshot: Snapshot } | { ok: false; message: string }
	> {
		return new Promise((resolve) => {
			const worker = new Worker(this.opts.workerScript, {
				workerData: {
					savePath,
					fileName,
					rakalyPath: this.status.paths.rakaly.path,
					goods: this.goods,
					names: this.names
				}
			});
			worker.once('message', resolve);
			worker.once('error', (e) => resolve({ ok: false, message: e.message }));
			worker.once('exit', (code) => {
				if (code !== 0) resolve({ ok: false, message: `worker exit code ${code}` });
			});
		});
	}

	/** Keep showing the last good result when a newer save fails. */
	private lastGood(): { summary?: SaveSummary; snapshot?: Snapshot } {
		const s = this.status.save;
		if (s.state === 'ready') return { summary: s.summary, snapshot: s.snapshot };
		if (s.state === 'error') return { summary: s.summary, snapshot: s.snapshot };
		return {};
	}

	private setSave(save: AppStatus['save']) {
		this.status = { ...this.status, save };
		this.opts.onStatus(this.status);
	}
}

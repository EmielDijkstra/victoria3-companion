// Which save to read, and when it is safe to read it.
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export interface SaveFileInfo {
	name: string;
	mtimeMs: number;
	size: number;
}

/** The most recently written .v3 file (autosave or manual save). */
export function newestSave(files: SaveFileInfo[]): SaveFileInfo | null {
	return (
		files
			.filter((f) => f.name.toLowerCase().endsWith('.v3') && f.size > 0)
			.sort((a, b) => b.mtimeMs - a.mtimeMs)[0] ?? null
	);
}

/**
 * The game writes a save in several steps. Only read it when the size and modification time
 * have not changed between two checks.
 */
export function isStable(
	a: { size: number; mtimeMs: number },
	b: { size: number; mtimeMs: number }
) {
	return a.size > 0 && a.size === b.size && a.mtimeMs === b.mtimeMs;
}

export async function listSaves(dir: string): Promise<SaveFileInfo[]> {
	const names = await readdir(dir);
	const infos = await Promise.all(
		names.map(async (name) => {
			try {
				const s = await stat(path.join(dir, name));
				return s.isFile() ? { name, mtimeMs: s.mtimeMs, size: s.size } : null;
			} catch {
				return null; // removed between readdir and stat
			}
		})
	);
	return infos.filter((i): i is SaveFileInfo => i !== null);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until the file stops changing (max ~30 s). */
export async function waitUntilStable(
	file: string,
	intervalMs = 750,
	maxTries = 40
): Promise<boolean> {
	let previous = await stat(file);
	for (let i = 0; i < maxTries; i++) {
		await sleep(intervalMs);
		const current = await stat(file);
		if (isStable(previous, current)) return true;
		previous = current;
	}
	return false;
}

/** Copy the save to the app's own work folder; the original is never opened for reading again. */
export async function copyToWorkDir(file: string, workDir: string): Promise<string> {
	await mkdir(workDir, { recursive: true });
	const target = path.join(workDir, 'current.v3');
	await copyFile(file, target);
	return target;
}

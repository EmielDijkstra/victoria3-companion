// Finding the Victoria 3 folders. Pure parsing functions are separate from file access so
// they can be unit-tested with small fixtures.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const VIC3_STEAM_APP_ID = '529340';

/**
 * Minimal parser for Valve's KeyValues text format (libraryfolders.vdf, appmanifest_*.acf):
 * quoted keys and values, nested with braces. Enough for Steam's config files.
 */
export function parseVdf(text: string): Record<string, unknown> {
	const tokens = [...text.matchAll(/"((?:[^"\\]|\\.)*)"|([{}])/g)].map((m) =>
		m[2] ? m[2] : m[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"')
	);
	let i = 0;
	function parseObject(): Record<string, unknown> {
		const obj: Record<string, unknown> = {};
		while (i < tokens.length) {
			const key = tokens[i++];
			if (key === '}') return obj;
			const next = tokens[i++];
			obj[key] = next === '{' ? parseObject() : next;
		}
		return obj;
	}
	return parseObject();
}

/** Steam library folders from libraryfolders.vdf, the one containing the app first. */
export function libraryPaths(vdfText: string, appId = VIC3_STEAM_APP_ID): string[] {
	const root = parseVdf(vdfText).libraryfolders as Record<string, Record<string, unknown>>;
	if (!root || typeof root !== 'object') return [];
	const libraries = Object.values(root).filter((l) => typeof l?.path === 'string');
	const hasApp = (l: Record<string, unknown>) =>
		typeof l.apps === 'object' && l.apps !== null && appId in (l.apps as object);
	return [...libraries.filter(hasApp), ...libraries.filter((l) => !hasApp(l))].map(
		(l) => l.path as string
	);
}

/** Install folder name from appmanifest_529340.acf, e.g. "Victoria 3". */
export function installDirFromManifest(acfText: string): string | null {
	const state = parseVdf(acfText).AppState as Record<string, unknown> | undefined;
	return typeof state?.installdir === 'string' ? state.installdir : null;
}

/** "1.15.1" from launcher-settings.json. */
export function versionFromLauncherSettings(jsonText: string): string | null {
	try {
		const raw = JSON.parse(jsonText).rawVersion;
		return typeof raw === 'string' ? raw : null;
	} catch {
		return null;
	}
}

/** continue_game.json: the last save the game made. */
export function parseContinueGame(
	jsonText: string
): { title: string; description: string; date: string } | null {
	try {
		const j = JSON.parse(jsonText);
		if (typeof j.title !== 'string') return null;
		return { title: j.title, description: String(j.desc ?? ''), date: String(j.date ?? '') };
	} catch {
		return null;
	}
}

// ---- File access (thin, not unit-tested) ----

const readText = (file: string) => {
	try {
		return readFileSync(file, 'utf8');
	} catch {
		return null;
	}
};

/** Documents\Paradox Interactive\Victoria 3. `documentsDir` comes from Electron (follows OneDrive). */
export function findUserDataDir(documentsDir: string): string | null {
	const dir = path.join(documentsDir, 'Paradox Interactive', 'Victoria 3');
	return existsSync(dir) ? dir : null;
}

/** Game folder (containing `game/` and `launcher/`) via Steam's library folders. */
export function findGameDir(steamDirs: string[]): string | null {
	for (const steam of steamDirs) {
		const vdf = readText(path.join(steam, 'steamapps', 'libraryfolders.vdf'));
		const libraries = vdf ? libraryPaths(vdf) : [steam];
		for (const library of libraries) {
			const manifest = readText(
				path.join(library, 'steamapps', `appmanifest_${VIC3_STEAM_APP_ID}.acf`)
			);
			const installDir = (manifest && installDirFromManifest(manifest)) ?? 'Victoria 3';
			const dir = path.join(library, 'steamapps', 'common', installDir);
			if (existsSync(path.join(dir, 'game'))) return dir;
		}
	}
	return null;
}

export function readInstalledVersion(gameDir: string): string | null {
	const text = readText(path.join(gameDir, 'launcher', 'launcher-settings.json'));
	return text ? versionFromLauncherSettings(text) : null;
}

export function readLastPlayed(userDataDir: string) {
	const text = readText(path.join(userDataDir, 'continue_game.json'));
	return text ? parseContinueGame(text) : null;
}

export const saveGamesDir = (userDataDir: string) => path.join(userDataDir, 'save games');

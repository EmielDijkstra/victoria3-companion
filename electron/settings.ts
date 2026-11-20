// Player settings, stored in the app's own data folder (never in the game folders).
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

export interface Settings {
	/** Manually chosen Documents\Paradox Interactive\Victoria 3; null = find automatically */
	userDataDir: string | null;
	/** Manually chosen game install folder; null = find via Steam */
	gameDir: string | null;
	/** Manually chosen rakaly.exe; null = look in the app's tools folder */
	rakalyPath: string | null;
}

export const DEFAULT_SETTINGS: Settings = { userDataDir: null, gameDir: null, rakalyPath: null };

/** Merge stored JSON with defaults, ignoring unknown or wrongly typed values. */
export function parseSettings(text: string | null): Settings {
	if (!text) return { ...DEFAULT_SETTINGS };
	try {
		// Strip a byte-order mark: Notepad and PowerShell 5 write one, and JSON.parse rejects it.
		const raw = JSON.parse(text.replace(/^\uFEFF/, ''));
		const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
		return {
			userDataDir: str(raw?.userDataDir),
			gameDir: str(raw?.gameDir),
			rakalyPath: str(raw?.rakalyPath)
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function loadSettings(file: string): Settings {
	try {
		return parseSettings(readFileSync(file, 'utf8'));
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export async function saveSettings(file: string, settings: Settings): Promise<void> {
	await writeFile(file, JSON.stringify(settings, null, 2));
}

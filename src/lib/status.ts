// Status that the main process sends to the overlay page. Shared by both sides.

export type PathKind = 'userData' | 'game' | 'rakaly';

export interface PathStatus {
	/** Absolute path, or null when not found */
	path: string | null;
	/** Found automatically or chosen by the player */
	source: 'auto' | 'manual' | 'none';
	/** Dutch message when something is wrong */
	problem?: string;
}

export interface SaveSummary {
	/** Country name as in the save, e.g. "Belgium" */
	country: string;
	/** In-game date as in the save, e.g. "1848.9.16.6" */
	gameDate: string;
	gameVersion: string;
	ironman: boolean;
	achievementsAllowed: boolean;
	/** e.g. "three_months"; null if not in the save */
	autosaveInterval: string | null;
	playthroughId: string | null;
	/** File name of the save that was read, e.g. "autosave.v3" */
	fileName: string;
	/** When the app read it (ISO timestamp) */
	readAt: string;
	/** How long converting and reading took */
	durationMs: number;
}

export type SaveState =
	| { state: 'waiting'; message: string }
	| { state: 'reading'; fileName: string }
	| { state: 'ready'; summary: SaveSummary }
	| { state: 'error'; message: string; summary?: SaveSummary };

export interface AppStatus {
	paths: Record<PathKind, PathStatus>;
	/** Game version from the installation (launcher-settings.json) */
	installedVersion: string | null;
	/** From continue_game.json: the last save the game itself made */
	lastPlayed: { title: string; description: string; date: string } | null;
	save: SaveState;
}

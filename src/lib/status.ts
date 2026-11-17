// Status that the main process sends to the overlay page. Shared by both sides.

export type PathKind = 'userData' | 'game' | 'rakaly';

export interface PathStatus {
	/** Absolute path, or null when not found */
	path: string | null;
	/** Found automatically or chosen by the player */
	source: 'auto' | 'manual' | 'none';
	/** What is wrong; the page turns this into text in the chosen language */
	problem?: { code: 'not-found' } | { code: 'chosen-missing'; path: string };
}

export interface SaveSummary {
	/** Country name as in the save, e.g. "Belgium" */
	country: string;
	/** In-game date as in the save, e.g. "1848.9.16.6" */
	gameDate: string;
	gameVersion: string;
	ironman: boolean;
	achievementsAllowed: boolean;
	/**
	 * `ironman.save_interval` from the save, e.g. "three_months". NOT the player's Autosave Interval
	 * setting: monthly autosaves still say "three_months" (checked 17-11-2026). Do not show it as such.
	 */
	autosaveInterval: string | null;
	playthroughId: string | null;
	/** File name of the save that was read, e.g. "autosave.v3" */
	fileName: string;
	/** When the app read it (ISO timestamp) */
	readAt: string;
	/** How long converting and reading took */
	durationMs: number;
}

/** Codes instead of sentences: the main process stays language-neutral, the page translates. */
export type WaitingReason = 'starting' | 'no-user-data' | 'no-saves';
export type SaveErrorCode = 'rakaly-missing' | 'unstable' | 'read-failed' | 'unexpected';

export type SaveState =
	| { state: 'waiting'; reason: WaitingReason }
	| { state: 'reading'; fileName: string }
	| { state: 'ready'; summary: SaveSummary }
	| {
			state: 'error';
			code: SaveErrorCode;
			fileName?: string;
			/** Technical detail (from Rakaly or the system), shown as-is */
			detail?: string;
			summary?: SaveSummary;
	  };

export interface AppStatus {
	paths: Record<PathKind, PathStatus>;
	/** Game version from the installation (launcher-settings.json) */
	installedVersion: string | null;
	/** From continue_game.json: the last save the game itself made */
	lastPlayed: { title: string; description: string; date: string } | null;
	save: SaveState;
}

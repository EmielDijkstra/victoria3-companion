// Compact, source-independent picture of the player's country, built from a save.
// The advice rules only look at this, never at the raw save. Field paths: docs/save-structuur.md.

/** Game versions the extractor was checked against. Newer versions still work, with a warning. */
export const TESTED_VERSIONS = ['1.13', '1.15'];

export interface PriceInfo {
	good: string;
	price: number;
	base: number;
	/** Price compared to the base price, in percent: +56 = 56% more expensive */
	vsBasePct: number;
}

export interface BuildingInfo {
	/** Building type without prefix, e.g. "paper_mill" */
	type: string;
	/** State key without prefix, e.g. "flanders" */
	state: string;
	levels: number;
	staffingPct: number;
	profitPerWeek: number;
	profitPerLevel: number;
	inputShortagePct: number;
}

export interface StateInfo {
	state: string;
	population: number;
	unemployed: number;
	infrastructure: number;
	infrastructureUsed: number;
	/**
	 * Tags of other countries that own part of the same state region ("split state"), e.g. ["NET"]
	 * for Belgium's part of Gelre. The game shows the same name for every part.
	 */
	sharedWith: string[];
}

/** An active journal entry of the player: what the game asks for right now. */
export interface JournalProgress {
	/** e.g. je_tutorial_grow_gdp */
	type: string;
	/** Progress towards the goal, when the entry has one (both 0 otherwise) */
	value: number;
	goal: number;
	/** Date the entry was added */
	since: string;
}

export interface Snapshot {
	date: string;
	gameVersion: string;
	/** false when the version is not one we tested: numbers may be off */
	versionTested: boolean;
	country: { name: string; tag: string };
	economy: {
		weeklyIncome: number;
		weeklyExpenses: number;
		weeklyBalance: number;
		treasury: number;
		debt: number;
		creditLimit: number;
		/** Debt as percent of the credit limit */
		debtPct: number;
		taxLevel: string;
		investmentPool: number;
		constructionCostPerWeek: number;
		/** Latest GDP sample (about every 4 weeks, may lag the live value) */
		gdp: number;
	};
	population: {
		total: number;
		standardOfLiving: number;
		literacyPct: number;
		radicals: number;
		loyalists: number;
		radicalsPct: number;
		unemployed: number;
		unemployedPct: number;
	};
	construction: {
		paused: boolean;
		sectorLevels: number;
		governmentQueue: { building: string; state: string }[];
		privateQueueCount: number;
	};
	states: StateInfo[];
	/**
	 * Names as the game shows them, per state key. A split state gets the country adjective,
	 * e.g. gelre → "Belgian Gelre". Falls back to a title-cased key without game files.
	 */
	stateNames: Record<string, string>;
	/** Prices in the player's market; null when the goods list from the game files was not available */
	prices: PriceInfo[] | null;
	buildings: BuildingInfo[];
	interestGroups: { group: string; approval: number; cloutPct: number; influence: string }[];
	activeLaws: string[];
	/** Active journal entries, oldest first */
	journal: JournalProgress[];
}

/** "1.15.1" → tested if "1.15" is in the list */
export function isTestedVersion(version: string): boolean {
	return TESTED_VERSIONS.some((v) => version === v || version.startsWith(`${v}.`));
}

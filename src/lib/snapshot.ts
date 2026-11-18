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

/** A production method the game just unlocked, and the player's buildings that could use it. */
export interface NewProductionMethod {
	/** e.g. pm_bessemer_process */
	pm: string;
	/** As the game shows it, e.g. "Bessemer Process" */
	name: string;
	buildings: { type: string; state: string; levels: number }[];
}

/** One good the player's states trade on the world market (spike S6). */
export interface TradedGood {
	good: string;
	/** Net volume over the player's states: + export, − import */
	net: number;
	localPrice: number;
	/** Newest world market price sample; 0 when unknown */
	worldPrice: number;
	/** Base price from the game files; 0 when unknown */
	base: number;
	/** Policy as in the save, e.g. "low_tariffs", "high_subventions"; "" = none set */
	importPolicy: string;
	exportPolicy: string;
	/** Output of the player's own buildings per week */
	produced: number;
}

export interface TradeInfo {
	/** Trade Capacity per state that has some (from Trade Centers) */
	states: { state: string; capacity: number; used: number }[];
	/** Largest imports first */
	goods: TradedGood[];
	/** Tags of countries with a trade privilege treaty */
	partners: string[];
	tradeCenters: {
		levels: number;
		revenue: number;
		tariffs: number;
		subventions: number;
		profit: number;
	};
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
		/** Where private construction spends the Investment Pool, per week, largest first */
		investmentByBuilding: { building: string; perWeek: number }[];
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
	/** Newly unlocked production methods the player's buildings could switch to */
	newProductionMethods: NewProductionMethod[];
	/** Trade on the world market; null without the goods list from the game files */
	trade: TradeInfo | null;
	/** Active journal entries, oldest first */
	journal: JournalProgress[];
}

/** "1.15.1" → tested if "1.15" is in the list */
export function isTestedVersion(version: string): boolean {
	return TESTED_VERSIONS.some((v) => version === v || version.startsWith(`${v}.`));
}

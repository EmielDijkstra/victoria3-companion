// Explanations from the player's own game installation: concepts and the official tutorial
// lessons that belong to journal entries. Read at runtime by the main process (never stored in
// this repository) and sent to the overlay once.

export interface ConceptText {
	/** e.g. concept_trade_capacity */
	key: string;
	/** As the game shows it: "Trade Capacity" */
	name: string;
	/** Plain text (markup resolved); paragraphs separated by a blank line */
	description: string;
}

export interface JournalText {
	/** e.g. je_tutorial_grow_gdp */
	type: string;
	name: string;
	/** Official "how" steps from the tutorial lesson, one page per item */
	how: string[];
	/** Official "why" pages */
	why: string[];
}

export interface GameKnowledge {
	/** Installed game version the texts come from, e.g. "1.15.1" */
	version: string | null;
	/** By display name, e.g. "Trade Capacity" */
	concepts: Record<string, ConceptText>;
	/** Short description per law, by key without prefix (e.g. free_trade) */
	laws: Record<string, string>;
	/** By journal entry type; only entries with a name or lesson */
	journal: Record<string, JournalText>;
}

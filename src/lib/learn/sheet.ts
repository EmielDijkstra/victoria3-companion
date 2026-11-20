// A knowledge sheet: how a topic works and what is smart, in our own words. Checked per game
// version, like the how-to steps: only the maintainer sets `checked`, after checking it in the game.
import type { Locale } from '../i18n/messages';

export interface KnowledgeSheet {
	/** Game version (major.minor) the sheet was written for */
	version: string;
	/** Version in which the maintainer checked it in the game; null = not yet */
	checked: string | null;
	sources: { source: string; license: string; source_url: string }[];
	/** Concept names from the game that belong to this topic (shown as clickable chips) */
	concepts: string[];
	points: Record<Locale, string[]>;
}

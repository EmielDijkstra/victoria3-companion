// Game terms that are highlighted in the overlay (they stay English in every language).
// Longer terms first, so "Construction Sectors" wins over "Construction".
export const GAME_TERMS = [
	'Autosave Interval',
	'Every month',
	'Construction Sectors',
	'Construction Sector',
	'Construction',
	'Investment Pool',
	'Credit Limit',
	'Default',
	'Tax Level',
	'Standard of Living',
	'Radicals',
	'Radical',
	'Interest Groups',
	'Approval',
	'Clout',
	'Production Methods',
	'Production Method',
	'Downsize',
	'Buildings',
	'Budget',
	'Market',
	'Rakaly'
].sort((a, b) => b.length - a.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A term followed by another capitalised word is part of a longer name ("Trade Center",
 * "Company Headquarter"), and so is a term after a hyphenated word ("Steel-Frame Buildings"):
 * those are not highlighted on their own.
 */
function buildPattern(terms: readonly string[]) {
	const sorted = [...new Set(terms)].sort((a, b) => b.length - a.length);
	return {
		set: new Set(sorted),
		re: new RegExp(`(?<!-[A-Z][a-z]+ )\\b(${sorted.map(escape).join('|')})\\b(?! [A-Z])`, 'g')
	};
}

const DEFAULT = buildPattern(GAME_TERMS);
let cached: { key: readonly string[]; pattern: ReturnType<typeof buildPattern> } | null = null;

/**
 * Concept names from the game that make good highlights: capitalised, at least 4 letters, no
 * odd characters ("Trade Capacity", "Investment Pool").
 */
export function usableConceptNames(names: readonly string[]): string[] {
	return names.filter((n) => /^[A-Z][A-Za-z' -]{3,40}$/.test(n) && !/ {2}/.test(n));
}

/**
 * Splits text into plain parts and game terms. `extra` adds terms, e.g. the concept names of the
 * installed game; the pattern is built once per list.
 */
export function splitGameTerms(
	text: string,
	extra?: readonly string[]
): { text: string; term: boolean }[] {
	let pattern = DEFAULT;
	if (extra && extra.length > 0) {
		if (cached?.key !== extra)
			cached = { key: extra, pattern: buildPattern([...GAME_TERMS, ...extra]) };
		pattern = cached.pattern;
	}
	return text
		.split(pattern.re)
		.filter((part) => part !== '')
		.map((part) => ({ text: part, term: pattern.set.has(part) }));
}

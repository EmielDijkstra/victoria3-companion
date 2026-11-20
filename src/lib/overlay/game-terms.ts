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
const PATTERN = new RegExp(`\\b(${GAME_TERMS.map(escape).join('|')})\\b`, 'g');

export function splitGameTerms(text: string): { text: string; term: boolean }[] {
	return text
		.split(PATTERN)
		.filter((part) => part !== '')
		.map((part) => ({ text: part, term: GAME_TERMS.includes(part) }));
}

import { describe, expect, it } from 'vitest';
import { splitGameTerms } from './game-terms';

describe('splitGameTerms', () => {
	it('marks game terms, longest match first', () => {
		expect(splitGameTerms('Je Construction Sectors kosten geld')).toEqual([
			{ text: 'Je ', term: false },
			{ text: 'Construction Sectors', term: true },
			{ text: ' kosten geld', term: false }
		]);
	});

	it('does not match inside other words', () => {
		expect(splitGameTerms('Budgetten en Marketing').every((p) => !p.term)).toBe(true);
	});

	it('returns plain text unchanged', () => {
		expect(splitGameTerms('niets bijzonders')).toEqual([{ text: 'niets bijzonders', term: false }]);
	});
});

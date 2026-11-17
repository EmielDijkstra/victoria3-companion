import { describe, expect, it } from 'vitest';
import { splitGameTerms, usableConceptNames } from './game-terms';

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

	it('adds concept names from the game, longest first', () => {
		const extra = ['Trade Capacity', 'Trade'];
		expect(splitGameTerms('More Trade Capacity means more Trade.', extra)).toEqual([
			{ text: 'More ', term: false },
			{ text: 'Trade Capacity', term: true },
			{ text: ' means more ', term: false },
			{ text: 'Trade', term: true },
			{ text: '.', term: false }
		]);
	});
});

describe('usableConceptNames', () => {
	it('keeps capitalised names of at least four letters', () => {
		expect(
			usableConceptNames(['Trade Capacity', 'GDP', 'Pop', 'odd name', 'Trade', 'x [y]'])
		).toEqual(['Trade Capacity', 'Trade']);
	});
});

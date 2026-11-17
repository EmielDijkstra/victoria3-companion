import { describe, expect, it } from 'vitest';
import { isLocale, localeFromLanguage, MESSAGES } from './messages';

describe('messages', () => {
	it('has the same keys in every language', () => {
		const keys = Object.keys(MESSAGES.nl).sort();
		expect(Object.keys(MESSAGES.en).sort()).toEqual(keys);
	});

	it('has no empty texts', () => {
		for (const table of Object.values(MESSAGES)) {
			for (const [key, value] of Object.entries(table)) {
				const text = typeof value === 'function' ? value('x' as never, 'y' as never) : value;
				expect(String(text).trim(), key).not.toBe('');
			}
		}
	});

	it('keeps game terms in English in both languages', () => {
		expect(MESSAGES.nl.autosaveTip).toContain('Autosave Interval');
		expect(MESSAGES.en.autosaveTip).toContain('Autosave Interval');
	});
});

describe('localeFromLanguage', () => {
	it('uses Dutch for Dutch systems and English otherwise', () => {
		expect(localeFromLanguage('nl-NL')).toBe('nl');
		expect(localeFromLanguage('nl-BE')).toBe('nl');
		expect(localeFromLanguage('en-GB')).toBe('en');
		expect(localeFromLanguage('de-DE')).toBe('en');
		expect(localeFromLanguage(undefined)).toBe('en');
	});

	it('recognises valid locales', () => {
		expect(isLocale('en')).toBe(true);
		expect(isLocale('fr')).toBe(false);
	});
});

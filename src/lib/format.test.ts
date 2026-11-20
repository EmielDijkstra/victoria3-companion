import { describe, expect, it } from 'vitest';
import { formatClock, formatGameDate, formatGameDateShort, formatSeconds } from './format';

describe('formatGameDate', () => {
	it('formats the save date in Dutch', () => {
		expect(formatGameDate('1848.9.16.6')).toBe('16 september 1848');
		expect(formatGameDate('1836.1.1', 'nl')).toBe('1 januari 1836');
	});

	it('formats the save date in English', () => {
		expect(formatGameDate('1848.9.16.6', 'en')).toBe('16 September 1848');
	});

	it('leaves unknown formats alone', () => {
		expect(formatGameDate('soon')).toBe('soon');
	});
});

describe('formatGameDateShort', () => {
	it('shortens the month', () => {
		expect(formatGameDateShort('1848.9.16.6')).toBe('16 sep 1848');
		expect(formatGameDateShort('1836.5.2')).toBe('2 mei 1836');
		expect(formatGameDateShort('1848.9.16.6', 'en')).toBe('16 Sep 1848');
	});
});

describe('formatSeconds', () => {
	it('uses the decimal separator of the language', () => {
		expect(formatSeconds(2600, 'nl')).toBe('2,6');
		expect(formatSeconds(2600, 'en')).toBe('2.6');
	});
});

describe('formatClock', () => {
	it('shows hours and minutes', () => {
		expect(formatClock(new Date(2026, 10, 17, 9, 5).toISOString())).toBe('09:05');
	});
});

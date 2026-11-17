import { describe, expect, it } from 'vitest';
import {
	formatClock,
	formatGameDate,
	formatGameDateShort,
	intervalLabel,
	suggestMonthlyAutosave
} from './format';

describe('formatGameDate', () => {
	it('formats the save date in Dutch', () => {
		expect(formatGameDate('1848.9.16.6')).toBe('16 september 1848');
		expect(formatGameDate('1836.1.1')).toBe('1 januari 1836');
	});

	it('leaves unknown formats alone', () => {
		expect(formatGameDate('soon')).toBe('soon');
	});
});

describe('formatGameDateShort', () => {
	it('shortens the month', () => {
		expect(formatGameDateShort('1848.9.16.6')).toBe('16 sep 1848');
		expect(formatGameDateShort('1836.5.2')).toBe('2 mei 1836');
	});
});

describe('formatClock', () => {
	it('shows hours and minutes', () => {
		expect(formatClock(new Date(2026, 10, 17, 9, 5).toISOString())).toBe('09:05');
	});
});

describe('autosave interval', () => {
	it('uses the label from the game menu', () => {
		expect(intervalLabel('three_months')).toBe('Every three months');
		expect(intervalLabel(null)).toBeNull();
	});

	it('suggests monthly only when the interval is known to be longer', () => {
		expect(suggestMonthlyAutosave('three_months')).toBe(true);
		expect(suggestMonthlyAutosave('monthly')).toBe(false);
		expect(suggestMonthlyAutosave('something_new')).toBe(false);
		expect(suggestMonthlyAutosave(null)).toBe(false);
	});
});

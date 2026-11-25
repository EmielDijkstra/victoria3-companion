import { describe, expect, it } from 'vitest';
import { addRecord, dateKey } from './budget-history';

const rec = (date: string, military: number) => ({ date, balance: 0, groups: { military } });

describe('budget history', () => {
	it('sorts by game date', () => {
		expect(dateKey('1838.12.4.6')).toBeGreaterThan(dateKey('1838.2.10'));
	});

	it('returns the latest record before this save and keeps later ones', () => {
		const history = [rec('1838.10.1', 5000), rec('1838.11.1', 6000), rec('1839.1.1', 7000)];
		const { history: next, previous } = addRecord(history, rec('1838.12.1', 6500));
		expect(previous?.date).toBe('1838.11.1');
		expect(next.map((r) => r.date)).toEqual(['1838.10.1', '1838.11.1', '1838.12.1', '1839.1.1']);
	});

	it('replaces a record of the same date', () => {
		const { history } = addRecord([rec('1838.12.1', 1)], rec('1838.12.1', 2));
		expect(history).toEqual([rec('1838.12.1', 2)]);
	});
});

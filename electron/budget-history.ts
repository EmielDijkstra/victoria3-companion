// A small budget history per campaign (#12, #53): one record per save, kept in the app's own data
// folder, so the advice can say what changed since the previous save. Local only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BudgetInfo, BudgetRecord } from '../src/lib/snapshot';

const KEEP = 36;

export function recordOf(date: string, budget: BudgetInfo): BudgetRecord {
	return {
		date,
		balance: budget.balance,
		groups: Object.fromEntries(budget.groups.map((g) => [g.key, g.perWeek]))
	};
}

/** "1838.12.4.6" → a number that sorts by game date. */
export function dateKey(date: string): number {
	const [y = 0, m = 0, d = 0, h = 0] = date.split('.').map(Number);
	return ((y * 100 + m) * 100 + d) * 100 + h;
}

/**
 * Adds the record (replacing one of the same date) and returns the history plus the latest record
 * before this date. An older save loaded again does not lose the later records.
 */
export function addRecord(
	history: BudgetRecord[],
	record: BudgetRecord
): { history: BudgetRecord[]; previous: BudgetRecord | undefined } {
	const others = history.filter((r) => r.date !== record.date);
	const previous = others
		.filter((r) => dateKey(r.date) < dateKey(record.date))
		.sort((a, b) => dateKey(b.date) - dateKey(a.date))[0];
	const next = [...others, record].sort((a, b) => dateKey(a.date) - dateKey(b.date)).slice(-KEEP);
	return { history: next, previous };
}

/** File per campaign; the id is a UUID from the save, cleaned to be safe as a file name. */
const fileFor = (dir: string, campaign: string) =>
	path.join(dir, 'history', `${campaign.replace(/[^A-Za-z0-9-]/g, '') || 'unknown'}.json`);

export function loadHistory(dir: string, campaign: string): BudgetRecord[] {
	try {
		const data = JSON.parse(readFileSync(fileFor(dir, campaign), 'utf8'));
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

export function saveHistory(dir: string, campaign: string, history: BudgetRecord[]) {
	try {
		mkdirSync(path.join(dir, 'history'), { recursive: true });
		writeFileSync(fileFor(dir, campaign), JSON.stringify(history));
	} catch {
		// a missing history only means no "what changed"
	}
}

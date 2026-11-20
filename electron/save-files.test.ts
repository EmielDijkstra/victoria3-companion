import { describe, expect, it } from 'vitest';
import { isStable, newestSave } from './save-files';
import { parseSettings } from './settings';
import { summarizeSave } from './save-summary';

describe('newestSave', () => {
	it('picks the most recent .v3 file and ignores others', () => {
		const files = [
			{ name: 'autosave.v3', mtimeMs: 100, size: 10 },
			{ name: 'autosave_exit.v3', mtimeMs: 300, size: 10 },
			{ name: 'notes.txt', mtimeMs: 900, size: 10 },
			{ name: 'empty.v3', mtimeMs: 800, size: 0 }
		];
		expect(newestSave(files)?.name).toBe('autosave_exit.v3');
	});

	it('returns null when there is no save', () => {
		expect(newestSave([])).toBeNull();
	});
});

describe('isStable', () => {
	it('is stable only when size and time are unchanged', () => {
		expect(isStable({ size: 5, mtimeMs: 1 }, { size: 5, mtimeMs: 1 })).toBe(true);
		expect(isStable({ size: 5, mtimeMs: 1 }, { size: 6, mtimeMs: 2 })).toBe(false);
		expect(isStable({ size: 0, mtimeMs: 1 }, { size: 0, mtimeMs: 1 })).toBe(false);
	});
});

describe('parseSettings', () => {
	it('keeps known string settings and drops the rest', () => {
		expect(parseSettings('{"gameDir":"D:\\\\Games\\\\Victoria 3","rakalyPath":5,"x":1}')).toEqual({
			userDataDir: null,
			gameDir: 'D:\\Games\\Victoria 3',
			rakalyPath: null
		});
	});

	it('falls back to defaults on broken JSON', () => {
		expect(parseSettings('{')).toEqual({ userDataDir: null, gameDir: null, rakalyPath: null });
	});

	it('reads a file saved with a byte-order mark (Notepad, PowerShell)', () => {
		expect(parseSettings('\uFEFF{"userDataDir":"C:\\\\Saves"}').userDataDir).toBe('C:\\Saves');
	});
});

describe('summarizeSave', () => {
	// Shape of a save converted with `rakaly json` (own minimal fixture).
	const save = {
		meta_data: {
			version: '1.15.1',
			game_date: '1836.1.1',
			name: 'Netherlands',
			game_rules: { settings: ['achievements_allowed', 'lenient_ai_behavior'] },
			ironman: true
		},
		ironman: { ironman: true, save_interval: 'three_months' },
		playthrough_id: 'abc-123',
		date: '1836.1.1'
	};
	const meta = {
		fileName: 'netherlands_ironman.v3',
		readAt: '2026-11-17T12:00:00Z',
		durationMs: 1200
	};

	it('extracts what the overlay shows', () => {
		expect(summarizeSave(save, meta)).toEqual({
			country: 'Netherlands',
			gameDate: '1836.1.1',
			gameVersion: '1.15.1',
			ironman: true,
			achievementsAllowed: true,
			autosaveInterval: 'three_months',
			playthroughId: 'abc-123',
			...meta
		});
	});

	it('copes with a save that misses fields', () => {
		const s = summarizeSave({}, meta);
		expect(s.country).toBe('');
		expect(s.ironman).toBe(false);
		expect(s.autosaveInterval).toBeNull();
	});
});

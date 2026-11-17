// Turn a save (converted to JSON by Rakaly) into the small summary the overlay shows.
// Paths into the save: see docs/save-structuur.md.
import type { SaveSummary } from '../src/lib/status';

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const yes = (v: unknown) => v === true || v === 'yes';

export function summarizeSave(
	save: unknown,
	meta: { fileName: string; readAt: string; durationMs: number }
): SaveSummary {
	const g = obj(save);
	const m = obj(g.meta_data);
	const ironmanBlock = obj(g.ironman);
	const rules = obj(obj(m.game_rules).settings);
	const ruleList = Array.isArray(obj(m.game_rules).settings)
		? (obj(m.game_rules).settings as unknown[])
		: Object.values(rules);

	return {
		country: str(m.name) ?? '',
		gameDate: str(g.date) ?? str(m.game_date) ?? '',
		gameVersion: str(m.version) ?? '',
		ironman: yes(m.ironman) || yes(ironmanBlock.ironman),
		achievementsAllowed: ruleList.includes('achievements_allowed'),
		autosaveInterval: str(ironmanBlock.save_interval),
		playthroughId: str(g.playthrough_id),
		...meta
	};
}

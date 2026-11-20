// Reads explanations from the game installation: concepts, journal entries and the tutorial
// lessons linked to them (spike S6, docs/spikes/s6-alle-gegevens.md). Read at runtime from the
// player's own installation; nothing from these files is stored in this repository.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ConceptText, GameKnowledge, JournalText } from '../src/lib/knowledge';
import { parseLocalization } from './game-data';

type Loc = Readonly<Record<string, string>>;

const humanize = (key: string) =>
	key
		.replace(/^(concept|building|je|lesson|lawgroup)_/, '')
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

/** Context-dependent values the overlay cannot know; a neutral wording instead. */
const CONTEXT: [RegExp, string][] = [
	[/GetState\.GetName/, 'that state'],
	[/GetBuilding\.GetName/, 'that building'],
	[/GetPlayer\.GetName|GetPlayer\.GetAdjective/, 'your country'],
	[/GetCountry\.GetName/, 'that country']
];

/**
 * Turns Paradox localization markup into plain text:
 * `$key$` and `$key|q$` → that text, `[concept_x]` → its name, `[Concept('concept_x','label')]` → the
 * label, `[GetBuildingType('building_x').GetName]` / `[GetGoods('x').GetName]` → the name, `#b … #!`
 * and other styles → removed, `\n` → newline. Unknown script calls are dropped.
 */
export function cleanGameText(raw: string, loc: Loc, depth = 0): string {
	if (depth > 4) return raw;
	const resolve = (key: string) =>
		loc[key] !== undefined ? cleanGameText(loc[key], loc, depth + 1) : humanize(key);

	let s = raw
		// $key$ / $key|q$ (formatting flags after |)
		.replace(/\$([A-Za-z0-9_]+)(?:\|[^$]*)?\$/g, (_m, key: string) => resolve(key))
		// [Concept('concept_x','label')]
		.replace(
			/\[Concept\(\s*'([a-z0-9_]+)'\s*,\s*'([^']*)'\s*\)\]/g,
			(_m, key: string, label: string) =>
				label ? cleanGameText(label, loc, depth + 1) : resolve(key)
		)
		// [SelectLocalization(condition,'IN_GAME_LINK','plain_key')] → the plain key
		.replace(
			/\[SelectLocalization\([^,]*,\s*'[^']*'\s*,\s*'([A-Za-z0-9_]+)'\s*\)\]/g,
			(_m, key: string) => resolve(key)
		)
		// [concept_x]
		.replace(/\[(concept_[a-z0-9_]+)\]/g, (_m, key: string) => resolve(key))
		// [GetBuildingType('building_x').GetName], [GetGoods('x').GetName], [GetLawType('x')…]
		.replace(/\[Get[A-Za-z]+\(\s*'([a-z0-9_]+)'\s*\)[^\]]*\]/g, (_m, key: string) => resolve(key))
		.replace(/\[Nbsp\]/g, ' ');

	// Remaining script calls: neutral wording where we can, otherwise drop them
	s = s.replace(/\[[^\]]*\]/g, (m) => CONTEXT.find(([re]) => re.test(m))?.[1] ?? '');

	return (
		s
			// text styles: #b, #v, #bold, #title, #indent_newline … and the closing #!
			.replace(/#[a-z_]+\s?/gi, '')
			.replace(/#!/g, '')
			// icons: @money! → £, others dropped
			.replace(/@money!/g, '£')
			.replace(/@[a-z_]+!/gi, '')
			.replace(/\\n/g, '\n')
			// a value we cannot know (e.g. a define) leaves "()" behind
			.replace(/[ \t]*\([ \t]*\)/g, '')
			.replace(/[ \t]+/g, ' ')
			.replace(/ +([.,;:!?])/g, '$1')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}

/**
 * Every journal entry definition → its tutorial lessons (empty when it has none), from `common/journal_entries/*.txt`:
 *   je_tutorial_grow_gdp = { how_tutorial = lesson_grow_gdp_how  why_tutorial = lesson_grow_gdp_why … }
 */
export function parseJournalLessons(text: string): Record<string, { how?: string; why?: string }> {
	const out: Record<string, { how?: string; why?: string }> = {};
	let current: string | null = null;
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const top = line.match(/^(je_[A-Za-z0-9_]+)\s*=\s*\{/);
		if (top) {
			current = top[1];
			out[current] ??= {};
		}
		if (!current) continue;
		const how = line.match(/^\s+how_tutorial\s*=\s*([A-Za-z0-9_]+)/);
		const why = line.match(/^\s+why_tutorial\s*=\s*([A-Za-z0-9_]+)/);
		if (how) (out[current] ??= {}).how = how[1];
		if (why) (out[current] ??= {}).why = why[1];
	}
	return out;
}

/**
 * Tutorial lesson chains → their pages' text keys, in order, from `common/tutorial_lessons/*.txt`:
 *   lesson_grow_gdp_how = { lesson_grow_gdp_how_1 = { text = "lesson_grow_gdp_how_1_desc" … } … }
 */
export function parseLessonChains(text: string): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	let chain: string | null = null;
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const top = line.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
		if (top) {
			chain = top[1];
			out[chain] = [];
			continue;
		}
		const page = line.match(/^\s+text\s*=\s*"([A-Za-z0-9_]+)"/);
		if (chain && page) out[chain].push(page[1]);
	}
	return out;
}

/** Concepts by display name, from `concepts_l_english.yml` (concept_x and concept_x_desc). */
export function buildConcepts(loc: Loc): Record<string, ConceptText> {
	const out: Record<string, ConceptText> = {};
	for (const key of Object.keys(loc)) {
		if (!/^concept_[a-z0-9_]+_desc$/.test(key)) continue;
		const base = key.slice(0, -'_desc'.length);
		if (loc[base] === undefined) continue;
		const name = cleanGameText(loc[base], loc);
		const description = cleanGameText(loc[key], loc);
		// Names that are just a word form of another concept (Imports, Exported) share its text
		if (name && description && !out[name]) out[name] = { key: base, name, description };
	}
	return out;
}

/** Short description per law, by key without prefix (free_trade → "…"). */
export function buildLawTexts(loc: Loc): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, text] of Object.entries(loc)) {
		const m = key.match(/^law_([a-z0-9_]+)_desc$/);
		if (m) out[m[1]] = cleanGameText(text, loc);
	}
	return out;
}

export function buildJournal(
	lessonsByEntry: Record<string, { how?: string; why?: string }>,
	chains: Record<string, string[]>,
	loc: Loc
): Record<string, JournalText> {
	const pages = (chain?: string) =>
		(chain ? (chains[chain] ?? []) : [])
			.map((key) => (loc[key] !== undefined ? cleanGameText(loc[key], loc) : ''))
			.filter(Boolean);
	const out: Record<string, JournalText> = {};
	for (const [type, lessons] of Object.entries(lessonsByEntry)) {
		const how = pages(lessons.how);
		const why = pages(lessons.why);
		// Entries without a lesson are still worth naming (e.g. a goal with progress)
		if (how.length === 0 && why.length === 0 && loc[type] === undefined) continue;
		out[type] = {
			type,
			name: loc[type] !== undefined ? cleanGameText(loc[type], loc) : humanize(type),
			how,
			why
		};
	}
	return out;
}

const readAll = (dir: string, ext: string) =>
	readdirSync(dir)
		.filter((f) => f.endsWith(ext))
		.map((f) => readFileSync(path.join(dir, f), 'utf8'));

/** All English localization (about 11 MB): names of journal entries, buildings, pop types … are
 * spread over many files. Read once, on first request. */
function readLocalization(dir: string): Record<string, string> {
	const loc: Record<string, string> = {};
	for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile() || !entry.name.endsWith('.yml')) continue;
		try {
			Object.assign(
				loc,
				parseLocalization(readFileSync(path.join(entry.parentPath, entry.name), 'utf8'), /./)
			);
		} catch {
			// one unreadable file only means fewer resolved names
		}
	}
	return loc;
}

/** Everything at once; null when the installation cannot be read (the overlay works without). */
export function readGameKnowledge(
	gameDir: string | null,
	version: string | null
): GameKnowledge | null {
	if (!gameDir) return null;
	const game = path.join(gameDir, 'game');
	try {
		const loc = readLocalization(path.join(game, 'localization', 'english'));
		const lessonsByEntry = Object.assign(
			{},
			...readAll(path.join(game, 'common', 'journal_entries'), '.txt').map(parseJournalLessons)
		);
		const chains = Object.assign(
			{},
			...readAll(path.join(game, 'common', 'tutorial_lessons'), '.txt').map(parseLessonChains)
		);
		return {
			version,
			concepts: buildConcepts(loc),
			laws: buildLawTexts(loc),
			journal: buildJournal(lessonsByEntry, chains, loc)
		};
	} catch {
		return null;
	}
}

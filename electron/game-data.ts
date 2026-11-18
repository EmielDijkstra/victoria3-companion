// Reference data from the game installation (read at runtime, never copied into the repo).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface GoodDefinition {
	name: string;
	/** Base price ("cost" in the game file) */
	cost: number | null;
}

/**
 * Goods in definition order. In a save, goods are numbers: the number is the position in this
 * list (checked in spike S2, see docs/save-structuur.md).
 */
export function parseGoods(text: string): GoodDefinition[] {
	const goods: GoodDefinition[] = [];
	let current: GoodDefinition | null = null;
	for (const line of text.split(/\r?\n/)) {
		const block = line.match(/^([a-z_]+)\s*=\s*\{/);
		if (block) {
			current = { name: block[1], cost: null };
			goods.push(current);
			continue;
		}
		const cost = line.match(/^\s+cost\s*=\s*([\d.]+)/);
		if (cost && current && current.cost === null) current.cost = Number(cost[1]);
	}
	return goods;
}

export function readGoods(gameDir: string | null): GoodDefinition[] | null {
	if (!gameDir) return null;
	try {
		const text = readFileSync(
			path.join(gameDir, 'game', 'common', 'goods', '00_goods.txt'),
			'utf8'
		);
		const goods = parseGoods(text);
		return goods.length > 0 ? goods : null;
	} catch {
		return null;
	}
}

export interface GameNames {
	/** STATE_GELRE → "Gelre" */
	states: Record<string, string>;
	/** BEL → "Belgian" */
	adjectives: Record<string, string>;
	/** Production method groups and names; null when they could not be read */
	productionMethods?: ProductionMethodData | null;
	/** Laws, what ideologies think of them, and names; null when they could not be read */
	laws?: LawData | null;
}

/** Simple reader for Paradox localization lines:  KEY:0 "Text"  (the :0 is optional). */
export function parseLocalization(text: string, keyPattern: RegExp): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		// KEY:0 "Text" or KEY: "Text"
		const m = line.match(/^\s*([A-Za-z0-9_]+):\d*\s+"(.*)"\s*$/);
		if (m && keyPattern.test(m[1])) out[m[1]] = m[2];
	}
	return out;
}

export function readGameNames(gameDir: string | null): GameNames | null {
	if (!gameDir) return null;
	const loc = path.join(gameDir, 'game', 'localization', 'english');
	try {
		const states = parseLocalization(
			readFileSync(path.join(loc, 'map', 'states_l_english.yml'), 'utf8'),
			/^STATE_/
		);
		const adjectives = Object.fromEntries(
			Object.entries(
				parseLocalization(
					readFileSync(path.join(loc, 'countries_l_english.yml'), 'utf8'),
					/^[A-Z0-9]{3}_ADJ$/
				)
			).map(([k, v]) => [k.slice(0, -4), v])
		);
		return {
			states,
			adjectives,
			productionMethods: readProductionMethods(gameDir),
			laws: readLawData(gameDir)
		};
	} catch {
		return null;
	}
}

/**
 * Production method groups from `common/production_method_groups/*.txt`:
 *   pmg_steelmaking_process = { … production_methods = { pm_blister_steel_process pm_bessemer_process } }
 * A building can switch between the methods of one group.
 */
export function parsePmGroups(text: string): Record<string, string[]> {
	return parseListBlocks(text, 'pmg_', 'production_methods');
}

/**
 * Building types → their production method groups, from `common/buildings/*.txt`:
 *   building_coal_mine = { … production_method_groups = { pmg_base_building_coal_mine … } }
 */
export function parseBuildingGroups(text: string): Record<string, string[]> {
	return parseListBlocks(text, 'building_', 'production_method_groups');
}

/** Top-level blocks starting with `prefix` → the words in their `field = { … }` list. */
function parseListBlocks(text: string, prefix: string, field: string): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	const clean = text.replace(/^\uFEFF/, '').replace(/#[^\n]*/g, '');
	const starts = [...clean.matchAll(new RegExp(`^(${prefix}[A-Za-z0-9_]+)\\s*=\\s*\\{`, 'gm'))];
	const list = new RegExp(`${field}\\s*=\\s*\\{([^}]*)\\}`);
	starts.forEach((m, i) => {
		const body = clean.slice(m.index, starts[i + 1]?.index ?? clean.length);
		const words = body.match(list);
		if (words) out[m[1]] = words[1].split(/\s+/).filter(Boolean);
	});
	return out;
}

/** Production method → the groups it belongs to (some belong to more than one). */
export function groupsByMethod(groups: Record<string, string[]>): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const [group, pms] of Object.entries(groups))
		for (const pm of pms) (out[pm] ??= []).push(group);
	return out;
}

export interface ProductionMethodData {
	/** pm → its groups */
	groups: Record<string, string[]>;
	/** building type (with prefix, e.g. building_coal_mine) → its groups */
	buildingGroups: Record<string, string[]>;
	/** pm → name as the game shows it, e.g. "Bessemer Process" */
	names: Record<string, string>;
}

export function readProductionMethods(gameDir: string | null): ProductionMethodData | null {
	if (!gameDir) return null;
	const game = path.join(gameDir, 'game');
	try {
		const dir = path.join(game, 'common', 'production_method_groups');
		const groups: Record<string, string[]> = {};
		for (const file of readdirSync(dir).filter((f) => f.endsWith('.txt')))
			Object.assign(groups, parsePmGroups(readFileSync(path.join(dir, file), 'utf8')));
		let names: Record<string, string> = {};
		try {
			names = parseLocalization(
				readFileSync(
					path.join(game, 'localization', 'english', 'production_methods_l_english.yml'),
					'utf8'
				),
				/^[a-z]/
			);
		} catch {
			// names fall back to the key
		}
		const buildingGroups: Record<string, string[]> = {};
		const buildingDir = path.join(game, 'common', 'buildings');
		for (const file of readdirSync(buildingDir).filter((f) => f.endsWith('.txt')))
			Object.assign(
				buildingGroups,
				parseBuildingGroups(readFileSync(path.join(buildingDir, file), 'utf8'))
			);
		return { groups: groupsByMethod(groups), buildingGroups, names };
	} catch {
		return null;
	}
}

export type Stance =
	'strongly_approve' | 'approve' | 'neutral' | 'disapprove' | 'strongly_disapprove';
const STANCES = new Set<string>([
	'strongly_approve',
	'approve',
	'neutral',
	'disapprove',
	'strongly_disapprove'
]);

export interface LawDefinition {
	group: string;
	/** Technologies that unlock the law (empty: always unlocked) */
	techs: string[];
	/** Only shown to some countries (`is_visible`); left out of the advice */
	restricted: boolean;
	/** Extra conditions (`possible`, `can_enact`) the overlay cannot check */
	conditions: boolean;
}

/** Laws from `common/laws/*.txt`: group, unlocking technologies and whether conditions apply. */
export function parseLaws(text: string): Record<string, LawDefinition> {
	const out: Record<string, LawDefinition> = {};
	const clean = text.replace(/^\uFEFF/, '').replace(/#[^\n]*/g, '');
	const starts = [...clean.matchAll(/^(law_[A-Za-z0-9_]+)\s*=\s*\{/gm)];
	starts.forEach((m, i) => {
		const body = clean.slice(m.index, starts[i + 1]?.index ?? clean.length);
		const group = body.match(/^\s+group\s*=\s*(lawgroup_[A-Za-z0-9_]+)/m)?.[1];
		if (!group) return;
		const techs = body.match(/unlocking_technologies\s*=\s*\{([^}]*)\}/)?.[1];
		out[m[1]] = {
			group,
			techs: techs ? techs.split(/\s+/).filter(Boolean) : [],
			restricted: /\bis_visible\s*=\s*\{/.test(body),
			conditions: /\b(possible|can_enact)\s*=\s*\{/.test(body)
		};
	});
	return out;
}

/**
 * What each ideology thinks of laws, from `common/ideologies/*.txt`:
 *   ideology_pious = { lawgroup_church_and_state = { law_state_religion = strongly_approve … } }
 */
export function parseIdeologies(text: string): Record<string, Record<string, Stance>> {
	const out: Record<string, Record<string, Stance>> = {};
	let current: string | null = null;
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const top = line.match(/^(ideology_[A-Za-z0-9_]+)\s*=\s*\{/);
		if (top) current = top[1];
		const stance = line.match(/^\s+(law_[A-Za-z0-9_]+)\s*=\s*([a-z_]+)/);
		if (current && stance && STANCES.has(stance[2]))
			(out[current] ??= {})[stance[1]] = stance[2] as Stance;
	}
	return out;
}

export interface LawData {
	laws: Record<string, LawDefinition>;
	ideologies: Record<string, Record<string, Stance>>;
	/** law_x, lawgroup_x and ig_x → name as the game shows it */
	names: Record<string, string>;
}

export function readLawData(gameDir: string | null): LawData | null {
	if (!gameDir) return null;
	const common = path.join(gameDir, 'game', 'common');
	const readDir = (dir: string) =>
		readdirSync(dir)
			.filter((f) => f.endsWith('.txt'))
			.map((f) => readFileSync(path.join(dir, f), 'utf8'));
	try {
		const laws = Object.assign({}, ...readDir(path.join(common, 'laws')).map(parseLaws));
		const ideologies = Object.assign(
			{},
			...readDir(path.join(common, 'ideologies')).map(parseIdeologies)
		);
		const loc = path.join(gameDir, 'game', 'localization', 'english');
		const names: Record<string, string> = {};
		for (const file of [
			'laws_l_english.yml',
			path.join('interest_groups', 'interest_groups_l_english.yml')
		]) {
			try {
				Object.assign(
					names,
					parseLocalization(readFileSync(path.join(loc, file), 'utf8'), /^(law_|lawgroup_|ig_)/)
				);
			} catch {
				// names fall back to the key
			}
		}
		return { laws, ideologies, names };
	} catch {
		return null;
	}
}

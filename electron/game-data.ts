// Reference data from the game installation (read at runtime, never copied into the repo).
import { readFileSync } from 'node:fs';
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
		return { states, adjectives };
	} catch {
		return null;
	}
}

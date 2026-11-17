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

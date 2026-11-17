import { describe, expect, it } from 'vitest';
import { GOODS_TXT, makeGamestate } from './fixtures/gamestate';
import { parseGoods, parseLocalization } from './game-data';
import { buildSnapshot, newestOfChannel, newestOfWeekly } from './snapshot';

const goods = parseGoods(GOODS_TXT);

describe('parseGoods', () => {
	it('keeps the definition order and the base price', () => {
		expect(goods).toEqual([
			{ name: 'ammunition', cost: 50 },
			{ name: 'paper', cost: 30 },
			{ name: 'explosives', cost: 50 },
			{ name: 'tools', cost: 40 }
		]);
	});
});

describe('parseLocalization', () => {
	it('reads keys with and without :0, and a byte-order mark', () => {
		const text =
			'\uFEFFl_english:\n STATE_GELRE:0 "Gelre"\n STATE_ILE_DE_FRANCE: "Île-de-France"\n BEL_ADJ: "Belgian"\n';
		expect(parseLocalization(text, /^STATE_/)).toEqual({
			STATE_GELRE: 'Gelre',
			STATE_ILE_DE_FRANCE: 'Île-de-France'
		});
		expect(parseLocalization(text, /_ADJ$/)).toEqual({ BEL_ADJ: 'Belgian' });
	});
});

describe('ring buffers', () => {
	it('takes the value before the write index, not the last one', () => {
		expect(newestOfChannel({ channels: { '0': { index: 2, values: [1, 2, 3] } } })).toBe(2);
		expect(newestOfChannel({ channels: { '0': { index: 3, values: [1, 2, 3] } } })).toBe(3);
		expect(newestOfWeekly({ weekly: { sample_index: 0, samples: [1, 2, 3] } })).toBe(3);
		expect(newestOfWeekly({ weekly: { sample_index: 2, samples: [1273, 1551, -4190] } })).toBe(
			1551
		);
	});

	it('copes with missing series', () => {
		expect(newestOfChannel(undefined)).toBe(0);
		expect(newestOfWeekly({})).toBe(0);
	});
});

describe('buildSnapshot', () => {
	const s = buildSnapshot(makeGamestate(), goods);

	it('reads the player country and economy', () => {
		expect(s.country).toEqual({ name: 'Belgium', tag: 'BEL' });
		expect(s.date).toBe('1848.9.16.6');
		expect(s.economy.weeklyBalance).toBe(2508);
		expect(s.economy.debtPct).toBe(44);
		expect(s.economy.taxLevel).toBe('very_high');
		expect(s.economy.constructionCostPerWeek).toBe(11277);
		expect(s.economy.gdp).toBe(3600000); // ring buffer, see above
	});

	it('reads population figures', () => {
		expect(s.population.standardOfLiving).toBe(8.77);
		expect(s.population.literacyPct).toBe(42.2);
		expect(s.population.radicalsPct).toBe(24.1);
		expect(s.population.unemployed).toBe(168084);
	});

	it('maps goods ids to names and compares with the base price', () => {
		expect(s.prices?.[0]).toEqual({ good: 'explosives', price: 122.5, base: 50, vsBasePct: 145 });
		expect(s.prices?.find((p) => p.good === 'paper')?.vsBasePct).toBe(56);
		expect(s.prices?.at(-1)?.good).toBe('tools');
	});

	it('has no prices without the goods list', () => {
		expect(buildSnapshot(makeGamestate(), null).prices).toBeNull();
	});

	it('only takes buildings in the player states', () => {
		expect(s.buildings.map((b) => b.type)).not.toContain('iron_mine');
		const paper = s.buildings.find((b) => b.type === 'paper_mill');
		expect(paper).toMatchObject({ state: 'flanders', staffingPct: 100, profitPerLevel: 1615 });
		expect(s.buildings.find((b) => b.type === 'explosives_factory')?.staffingPct).toBe(3);
	});

	it('reads construction, states, interest groups and laws', () => {
		expect(s.construction).toEqual({
			paused: true,
			sectorLevels: 3,
			governmentQueue: [
				{ building: 'paper_mill', state: 'gelre' },
				{ building: 'port', state: 'flanders' }
			],
			privateQueueCount: 1
		});
		expect(s.states.find((x) => x.state === 'flanders')?.unemployed).toBe(99192);
		// Gelre is split: the Netherlands owns the other part
		expect(s.states.find((x) => x.state === 'gelre')?.sharedWith).toEqual(['NET']);
		expect(s.states.find((x) => x.state === 'flanders')?.sharedWith).toEqual([]);
		expect(s.interestGroups.map((ig) => ig.group)).toEqual(['intelligentsia', 'trade_unions']);
		expect(s.activeLaws).toEqual(['monarchy', 'no_police']);
	});

	it('reads the active journal entries of the player, with progress', () => {
		expect(s.journal).toEqual([
			{ type: 'je_tutorial_grow_gdp', value: 3916769, goal: 4895962, since: '1839.3.4' }
		]);
	});

	it('names a split state like the game does: "Belgian Gelre"', () => {
		const names = {
			states: { STATE_GELRE: 'Gelre', STATE_FLANDERS: 'Flanders' },
			adjectives: { BEL: 'Belgian' }
		};
		const named = buildSnapshot(makeGamestate(), goods, names);
		expect(named.stateNames).toEqual({ flanders: 'Flanders', gelre: 'Belgian Gelre' });
	});

	it('falls back to title-cased keys without game files', () => {
		expect(s.stateNames.flanders).toBe('Flanders');
		expect(s.stateNames.gelre).toBe('Belgium Gelre'); // no adjective known: country name
	});

	it('flags untested game versions instead of failing', () => {
		expect(s.versionTested).toBe(true);
		const future = makeGamestate();
		future.meta_data.version = '2.0.0';
		expect(buildSnapshot(future, goods).versionTested).toBe(false);
	});

	it('does not crash on an empty save', () => {
		const empty = buildSnapshot({}, goods);
		expect(empty.country.name).toBe('');
		expect(empty.buildings).toEqual([]);
		expect(empty.versionTested).toBe(false);
	});
});

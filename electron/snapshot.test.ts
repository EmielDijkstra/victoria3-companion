import { describe, expect, it } from 'vitest';
import { GOODS_TXT, makeGamestate } from './fixtures/gamestate';
import {
	groupsByMethod,
	parseGoods,
	parseIdeologies,
	parseLaws,
	parseLocalization,
	parsePmGroups,
	parsePopNeeds,
	parsePopTypeKeys,
	parseTechs
} from './game-data';
import {
	buildLaws,
	buildPeople,
	buildDiplomacy,
	buildSnapshot,
	buildTech,
	indexedArray,
	newestOfChannel,
	newestOfWeekly,
	newProductionMethods
} from './snapshot';

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

describe('newProductionMethods', () => {
	const pmData = {
		groups: {
			pm_old_steel: ['pmg_steel'],
			pm_new_steel: ['pmg_steel'],
			pm_other: ['pmg_other'],
			pm_no_explosives: ['pmg_explosives_coal', 'pmg_explosives_iron'],
			pm_nitro_coal: ['pmg_explosives_coal'],
			pm_nitro_iron: ['pmg_explosives_iron']
		},
		buildingGroups: {
			building_coal_mine: ['pmg_explosives_coal'],
			building_iron_mine: ['pmg_explosives_iron']
		},
		names: { pm_new_steel: 'New Steel', pm_nitro_coal: 'Nitro', pm_nitro_iron: 'Nitro' }
	};
	const key = (id: number) => ({ 1: 'wallonia', 2: 'flanders' })[id] ?? String(id);

	it('finds the player buildings that can switch, by group', () => {
		const result = newProductionMethods(
			['pm_new_steel', 'pm_unknown'],
			[
				{
					building: 'building_steel_mill',
					state: 1,
					levels: 2,
					production_methods: ['pm_old_steel']
				},
				{
					building: 'building_steel_mill',
					state: 2,
					levels: 5,
					production_methods: ['pm_old_steel']
				},
				{
					building: 'building_steel_mill',
					state: 2,
					levels: 1,
					production_methods: ['pm_new_steel']
				},
				{ building: 'building_glassworks', state: 1, levels: 3, production_methods: ['pm_other'] }
			],
			pmData,
			key
		);
		expect(result).toEqual([
			{
				pm: 'pm_new_steel',
				name: 'New Steel',
				buildings: [
					{ type: 'steel_mill', state: 'flanders', levels: 5 },
					{ type: 'steel_mill', state: 'wallonia', levels: 2 }
				]
			}
		]);
	});

	it('only matches buildings that have the group, and merges methods with the same name', () => {
		const mines = [
			{
				building: 'building_coal_mine',
				state: 1,
				levels: 2,
				production_methods: ['pm_no_explosives']
			},
			{
				building: 'building_iron_mine',
				state: 1,
				levels: 3,
				production_methods: ['pm_no_explosives']
			}
		];
		expect(newProductionMethods(['pm_nitro_coal', 'pm_nitro_iron'], mines, pmData, key)).toEqual([
			{
				pm: 'pm_nitro_coal',
				name: 'Nitro',
				buildings: [
					{ type: 'iron_mine', state: 'wallonia', levels: 3 },
					{ type: 'coal_mine', state: 'wallonia', levels: 2 }
				]
			}
		]);
	});

	it('gives nothing without the game files', () => {
		expect(newProductionMethods(['pm_new_steel'], [], null, key)).toEqual([]);
	});
});

describe('parsePmGroups', () => {
	it('reads multi-line and one-line lists, skips comments, and maps methods to all their groups', () => {
		const groups = parsePmGroups(`pmg_a = {
	texture = "x.dds"
	production_methods = {
		pm_one # first
		pm_two
	}
}
pmg_b = {
	production_methods = { pm_two pm_three }
}`);
		expect(groups).toEqual({ pmg_a: ['pm_one', 'pm_two'], pmg_b: ['pm_two', 'pm_three'] });
		expect(groupsByMethod(groups).pm_two).toEqual(['pmg_a', 'pmg_b']);
	});
});

describe('trade', () => {
	const s = buildSnapshot(makeGamestate(), parseGoods(GOODS_TXT));

	it('reads capacity, traded goods with prices and policies, partners and trade centers', () => {
		expect(s.trade?.states).toEqual([{ state: 'flanders', capacity: 64, used: 64 }]);
		expect(s.trade?.goods).toEqual([
			{
				good: 'tools',
				net: -4,
				localPrice: 12.5,
				worldPrice: 0,
				base: 40,
				importPolicy: '',
				exportPolicy: 'low_tariffs',
				produced: 0
			},
			{
				good: 'paper',
				net: 8,
				localPrice: 46.7,
				worldPrice: 41,
				base: 30,
				importPolicy: 'high_subventions',
				exportPolicy: '',
				produced: 12
			}
		]);
		expect(s.trade?.partners).toEqual(['NET']);
		expect(s.trade?.tradeCenters).toEqual({
			levels: 3,
			revenue: 100,
			tariffs: 20,
			subventions: 5,
			profit: 10
		});
	});

	it('has no trade without the goods list', () => {
		expect(buildSnapshot(makeGamestate(), null).trade).toBeNull();
	});
});

describe('laws', () => {
	const LAWS_TXT = `law_monarchy = {
	group = lawgroup_governance
}
law_republic = {
	group = lawgroup_governance
	unlocking_technologies = { tech_a }
	possible = { always = yes }
}
law_future = {
	group = lawgroup_governance
	unlocking_technologies = { tech_b }
}
law_local_only = {
	group = lawgroup_governance
	is_visible = { always = no }
}
law_no_police = {
	group = lawgroup_policing
}`;
	const IDEOLOGY_TXT = `ideology_liberal = {
	lawgroup_governance = {
		law_monarchy = disapprove
		law_republic = strongly_approve
	}
}`;

	it('reads group, technologies, restrictions and conditions', () => {
		const laws = parseLaws(LAWS_TXT);
		expect(laws.law_republic).toEqual({
			group: 'lawgroup_governance',
			techs: ['tech_a'],
			restricted: false,
			conditions: true
		});
		expect(laws.law_local_only.restricted).toBe(true);
		expect(parseIdeologies(IDEOLOGY_TXT)).toEqual({
			ideology_liberal: { law_monarchy: 'disapprove', law_republic: 'strongly_approve' }
		});
	});

	it('lists unlocked alternatives with clout-weighted support', () => {
		const data = {
			laws: parseLaws(LAWS_TXT),
			ideologies: parseIdeologies(IDEOLOGY_TXT),
			names: { law_republic: 'Republic', ig_intelligentsia: 'Intelligentsia' }
		};
		const groups = buildLaws(makeGamestate(), 25, data);
		// Only governance has an unlocked alternative (tech_b is not known, local_only is hidden)
		expect(groups).toEqual([
			{
				group: 'governance',
				name: 'Governance',
				active: 'monarchy',
				activeName: 'Monarchy',
				activeSupport: -0.42,
				options: [
					{
						law: 'republic',
						name: 'Republic',
						support: 0.83,
						conditions: true,
						stances: [
							{
								ig: 'intelligentsia',
								name: 'Intelligentsia',
								stance: 'strongly_approve',
								cloutPct: 41.7
							}
						]
					}
				]
			}
		]);
	});
});

describe('population', () => {
	it('reads pop needs and pop type keys from the game files', () => {
		expect(
			parsePopNeeds(`popneed_basic_food = {
	default = grain
	entry = {
		goods = grain
		weight = 1
	}
	entry = {
		goods = fish
		weight = 2
	}
}`)
		).toEqual([
			{
				need: 'popneed_basic_food',
				goods: [
					{ good: 'grain', weight: 1 },
					{ good: 'fish', weight: 2 }
				]
			}
		]);
		expect(parsePopTypeKeys('\uFEFFlaborers = {\n\tstrata = poor\n}\n')).toEqual(['laborers']);
		expect(indexedArray([3, { '0': 5 }, { '2': 7 }])).toEqual({ 0: 5, 2: 7 });
	});

	it('weighs needs by price, food security by people, and finds half-empty buildings', () => {
		const data = {
			popTypes: ['academics', 'laborers'],
			needs: [
				{
					need: 'popneed_basic_food',
					goods: [
						{ good: 'paper', weight: 1 },
						{ good: 'tools', weight: 3 }
					]
				}
			],
			needNames: { popneed_basic_food: 'Basic Food' }
		};
		const people = buildPeople(
			makeGamestate() as never,
			makeGamestate().country_manager.database['25'] as never,
			[477, 476],
			parseGoods(GOODS_TXT),
			data,
			[
				{ type: 'textile_mill', state: 'flanders', levels: 3, staffingPct: 40 },
				{ type: 'paper_mill', state: 'flanders', levels: 1, staffingPct: 30 },
				{ type: 'steel_mill', state: 'gelre', levels: 4, staffingPct: 35 }
			],
			{ flanders: 99192, gelre: 4322 },
			(id: number) =>
				(({ 477: 'flanders', 476: 'gelre' }) as Record<number, string>)[id] ?? String(id)
		);
		expect(people.professions).toEqual([
			{ type: 'laborers', workforce: 391050 },
			{ type: 'academics', workforce: 500 }
		]);
		// paper 46.7 / 30 = 1.557, tools 12.5 / 40 = 0.3125 → (1.557 + 3 × 0.3125) / 4 = 0.623
		expect(people.needs).toEqual([
			{
				need: 'popneed_basic_food',
				name: 'Basic Food',
				vsBasePct: -38,
				goods: [
					{ good: 'paper', vsBasePct: 56 },
					{ good: 'tools', vsBasePct: -69 }
				]
			}
		]);
		// (0.5 × 400 + 0.9 × 100) / 500 = 0.58; the pop in another country's state is left out
		expect(people.foodSecurity).toEqual([{ state: 'flanders', value: 0.58 }]);
		// one level, or too few unemployed in the state: not counted
		expect(people.understaffed).toEqual([
			{
				type: 'textile_mill',
				state: 'flanders',
				levels: 3,
				staffingPct: 40,
				stateUnemployed: 99192
			}
		]);
	});
});

describe('technology', () => {
	const TECH_TXT = `tech_a = {
	era = era_1
	category = production
}
tech_b = {
	era = era_1
	category = society
}
tech_c = {
	era = era_2
	category = production
	unlocking_technologies = {
		tech_a
	}
}
tech_d = {
	era = era_2
	category = production
	unlocking_technologies = { tech_a tech_b }
}`;

	it('reads era, category and prerequisites', () => {
		expect(parseTechs(TECH_TXT).tech_c).toEqual({
			era: 'era_2',
			category: 'production',
			requires: ['tech_a']
		});
	});

	it("suggests research that unlocks a method for the player's own building types", () => {
		const tech = buildTech(
			makeGamestate(),
			25,
			[477, 476],
			{
				techs: parseTechs(TECH_TXT),
				pmTechs: { pm_better_paper: ['tech_c'], pm_future: ['tech_d'] },
				names: { tech_c: 'Tech C', tech_b: 'Tech B' }
			},
			{
				groups: { pm_better_paper: ['pmg_paper'], pm_future: ['pmg_paper'] },
				buildingGroups: { building_paper_mill: ['pmg_paper'] },
				names: { pm_better_paper: 'Better Paper' }
			}
		);
		expect(tech.researching).toEqual({ tech: 'tech_c', name: 'Tech C' });
		expect(tech.spreading).toEqual(['Tech B']);
		// tech_d needs tech_b, which is not known yet: not suggested
		expect(tech.suggestions).toEqual([
			{
				tech: 'tech_c',
				name: 'Tech C',
				levels: 1,
				unlocks: [{ pm: 'Better Paper', building: 'paper_mill', levels: 1 }]
			}
		]);
	});
});

describe('diplomacy', () => {
	it('reads friends, enemies, rivals, separatism, guarantees and lobbies of the player', () => {
		const names = {
			states: {},
			adjectives: {},
			countries: { FRA: 'France', NET: 'Netherlands', GBR: 'Great Britain' },
			laws: { laws: {}, ideologies: {}, names: { ig_intelligentsia: 'Intelligentsia' } }
		};
		expect(buildDiplomacy(makeGamestate(), 25, names)).toEqual({
			friends: [{ tag: 'FRA', name: 'France', relations: 100 }],
			hostile: [{ tag: 'NET', name: 'Netherlands', relations: -30 }],
			rivals: [{ tag: 'NET', name: 'Netherlands' }],
			separatism: [{ tag: 'NET', name: 'Netherlands' }],
			guarantors: [{ tag: 'GBR', name: 'Great Britain' }],
			lobbies: [
				{
					target: { tag: 'FRA', name: 'France' },
					pro: true,
					appeasement: -2,
					groups: ['Intelligentsia']
				}
			]
		});
	});
});

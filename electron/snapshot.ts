// Build a Snapshot from a save converted to JSON (Rakaly). Works on the parsed gamestate only,
// so any source that produces the same structure (binary via Rakaly, a text save) can use it.
// Field paths: docs/save-structuur.md. Ported from spikes/advisor/facts.mjs.
import {
	isTestedVersion,
	type BuildingInfo,
	type LawGroupInfo,
	type LawStance,
	type NewProductionMethod,
	type DiplomacyInfo,
	type PeopleInfo,
	type TechInfo,
	type TradeInfo,
	type PriceInfo,
	type Snapshot
} from '../src/lib/snapshot';
import type {
	GameNames,
	GoodDefinition,
	LawData,
	PopulationData,
	ProductionMethodData,
	Stance,
	TechData
} from './game-data';

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const titleCase = (key: string) =>
	key
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
const round = (x: number, digits = 0) => Math.round(x * 10 ** digits) / 10 ** digits;
const sum = (values: unknown[]) => values.reduce<number>((a, b) => a + num(b), 0);
const strip = (s: string, prefix: string) => (s.startsWith(prefix) ? s.slice(prefix.length) : s);

/**
 * Newest value of a time series. Series are ring buffers: when full, the game writes from the
 * front again, so the newest value is not always the last one (spike S2).
 */
export function newestOfChannel(series: unknown): number {
	const channel = obj(obj(obj(series).channels)['0']);
	const values = arr(channel.values);
	if (values.length === 0) return 0;
	const index = num(channel.index);
	return num(values[(((index - 1) % values.length) + values.length) % values.length]);
}

export function newestOfWeekly(trend: unknown): number {
	const weekly = obj(obj(trend).weekly);
	const samples = arr(weekly.samples);
	if (samples.length === 0) return 0;
	const index = num(weekly.sample_index);
	return num(samples[(((index - 1) % samples.length) + samples.length) % samples.length]);
}

/**
 * The game lists newly unlocked production methods (`new_production_methods_v2`, none in use yet,
 * spike S6). A building can switch when one of its current methods is in the same group.
 */
export function newProductionMethods(
	unlocked: string[],
	buildings: Record<string, unknown>[],
	pmData: ProductionMethodData | null,
	stateKey: (id: number) => string
): NewProductionMethod[] {
	if (!pmData) return [];
	return unlocked
		.map((pm) => {
			const groups = new Set(pmData.groups[pm] ?? []);
			const candidates = buildings.filter((b) => {
				const current = arr(b.production_methods).map(str);
				if (current.includes(pm)) return false;
				// The building type must have one of the method's groups. Groups can share methods
				// (every mine has "no explosives"), so a shared current method is not enough.
				const own = pmData.buildingGroups[str(b.building)];
				if (own) return own.some((group) => groups.has(group));
				return current.some((p) => (pmData.groups[p] ?? []).some((group) => groups.has(group)));
			});
			return {
				pm,
				name: pmData.names[pm] ?? titleCase(strip(pm, 'pm_')),
				buildings: candidates
					.map((b) => ({
						type: strip(str(b.building), 'building_'),
						state: stateKey(num(b.state)),
						levels: num(b.levels)
					}))
					.sort((a, b) => b.levels - a.levels)
			};
		})
		.filter((p) => p.buildings.length > 0)
		.reduce<NewProductionMethod[]>((merged, p) => {
			const same = merged.find((m) => m.name === p.name);
			if (same)
				same.buildings = [...same.buildings, ...p.buildings].sort((a, b) => b.levels - a.levels);
			else merged.push(p);
			return merged;
		}, []);
}

/** Trade of the player's country: capacity, traded goods with prices and policies, partners. */
export function buildTrade(
	g: Json,
	c: Json,
	playerId: number,
	myStates: number[],
	goods: GoodDefinition[],
	stateKey: (id: number) => string
): TradeInfo {
	const stateDb = obj(obj(g.states).database);
	const myBuildings = Object.values(obj(obj(g.building_manager).database))
		.map(obj)
		.filter((b) => myStates.includes(num(b.state)));

	const net: Record<string, number> = {};
	const produced: Record<string, number> = {};
	for (const id of myStates)
		for (const [good, v] of Object.entries(obj(obj(obj(stateDb[String(id)]).trade).goods)))
			net[good] = (net[good] ?? 0) + num(obj(v).value);
	for (const b of myBuildings)
		for (const [good, v] of Object.entries(obj(obj(b.output_goods).goods)))
			produced[good] = (produced[good] ?? 0) + num(obj(v).value);

	const prices = obj(obj(obj(c.budget).current_price_report).goods);
	const world = obj(obj(obj(obj(g.market_manager).world_market).price_trend).channels);
	const policy = (field: unknown, id: string) => str(obj(obj(field)[id]).level);
	const countries = obj(obj(g.country_manager).database);

	const centers = myBuildings.filter((b) => str(b.building) === 'building_trade_center');
	const total = (field: string) => round(centers.reduce((n, b) => n + num(b[field]), 0));

	return {
		states: myStates
			.map((id) => ({ id, s: obj(stateDb[String(id)]) }))
			.filter(({ s }) => num(s.trade_capacity) > 0)
			.map(({ id, s }) => ({
				state: stateKey(id),
				capacity: round(num(s.trade_capacity)),
				used: round(num(s.trade_capacity_usage))
			})),
		goods: Object.entries(net)
			.filter(([id, n]) => n !== 0 && goods[Number(id)])
			.map(([id, n]) => {
				const ch = obj(world[id]);
				return {
					good: goods[Number(id)].name,
					net: round(n),
					localPrice: round(num(obj(prices[id]).value), 1),
					worldPrice: round(
						arr(ch.values).length ? newestOfChannel({ channels: { 0: ch } }) : 0,
						1
					),
					base: goods[Number(id)].cost ?? 0,
					importPolicy: policy(c.import_tariffs, id),
					exportPolicy: policy(c.export_tariffs, id),
					produced: round(produced[id] ?? 0)
				};
			})
			.sort((a, b) => a.net - b.net),
		partners: [
			...new Set(
				Object.values(obj(obj(g.treaty_article_manager).database))
					.map(obj)
					.filter((a) => str(a.article) === 'trade_privilege' && num(a.source_country) === playerId)
					.map((a) => str(obj(countries[String(num(a.target_country))]).definition))
					.filter(Boolean)
			)
		].sort(),
		tradeCenters: {
			levels: centers.reduce((n, b) => n + num(b.levels), 0),
			revenue: total('trade_revenue'),
			tariffs: total('tariffs'),
			subventions: total('subventions'),
			profit: total('profit_after_reserves')
		}
	};
}

const STANCE_VALUE: Record<Stance, number> = {
	strongly_approve: 2,
	approve: 1,
	neutral: 0,
	disapprove: -1,
	strongly_disapprove: -2
};
const STANCE_OF: Stance[] = [
	'strongly_disapprove',
	'disapprove',
	'neutral',
	'approve',
	'strongly_approve'
];

/**
 * Law groups of the player: the current law and the alternatives that are unlocked (technology
 * known, not restricted to other countries), with the clout-weighted stance of the interest
 * groups. An interest group's stance is the sum over its ideologies, as in the game.
 */
export function buildLaws(g: Json, playerId: number, data: LawData): LawGroupInfo[] {
	const techs = new Set(
		Object.values(obj(obj(g.technology).database))
			.map(obj)
			.filter((t) => num(t.country) === playerId)
			.flatMap((t) => arr(t.acquired_technologies).map(str))
	);
	const igs = Object.values(obj(obj(g.interest_groups).database))
		.map(obj)
		.filter((ig) => num(ig.country) === playerId)
		.map((ig) => ({
			key: str(ig.definition),
			clout: num(ig.clout),
			ideologies: arr(ig.ideologies).map(str)
		}));
	const name = (key: string, prefix: string) => data.names[key] ?? titleCase(strip(key, prefix));

	// −2 … +2: the sum of what the group's ideologies think of the law
	const value = (ig: (typeof igs)[number], law: string) =>
		Math.max(
			-2,
			Math.min(
				2,
				ig.ideologies.reduce(
					(n, id) => n + STANCE_VALUE[data.ideologies[id]?.[law] ?? 'neutral'],
					0
				)
			)
		);
	const support = (law: string) =>
		round(
			igs.reduce((n, ig) => n + ig.clout * value(ig, law), 0),
			2
		);
	const visible = (law: string): LawStance[] =>
		igs
			.map((ig) => ({
				ig: strip(ig.key, 'ig_'),
				name: name(ig.key, 'ig_'),
				stance: STANCE_OF[value(ig, law) + 2],
				cloutPct: round(ig.clout * 100, 1)
			}))
			.filter((st) => st.stance !== 'neutral')
			.sort((a, b) => b.cloutPct - a.cloutPct);

	const active = Object.values(obj(obj(g.laws).database))
		.map(obj)
		.filter((l) => num(l.country) === playerId && l.active === true)
		.map((l) => str(l.law))
		.filter((law) => data.laws[law]);

	return active
		.map((law) => {
			const group = data.laws[law].group;
			const options = Object.entries(data.laws)
				.filter(
					([other, def]) =>
						other !== law &&
						def.group === group &&
						!def.restricted &&
						def.techs.every((t) => techs.has(t))
				)
				.map(([other, def]) => ({
					law: strip(other, 'law_'),
					name: name(other, 'law_'),
					support: support(other),
					stances: visible(other),
					conditions: def.conditions
				}))
				.sort((a, b) => b.support - a.support);
			return {
				group: strip(group, 'lawgroup_'),
				name: name(group, 'lawgroup_'),
				active: strip(law, 'law_'),
				activeName: name(law, 'law_'),
				activeSupport: support(law),
				options
			};
		})
		.filter((gr) => gr.options.length > 0);
}

/** Needs that weigh most on workers and peasants (the lower strata). */
const BASIC_NEEDS = [
	'popneed_basic_food',
	'popneed_simple_clothing',
	'popneed_heating',
	'popneed_crude_items'
];

/** "[15, {"0": 510}, {"1": 2400}, …]": the first number is the length, then one object per index. */
export function indexedArray(v: unknown): Record<number, number> {
	const out: Record<number, number> = {};
	for (const item of arr(v).slice(1))
		for (const [k, n] of Object.entries(obj(item))) out[Number(k)] = num(n);
	return out;
}

/**
 * Population of the player: workforce per profession, how expensive the basic needs are, food
 * security per state and buildings that stay half empty although people look for work.
 */
export function buildPeople(
	g: Json,
	c: Json,
	myStates: number[],
	goods: GoodDefinition[],
	data: PopulationData,
	buildings: { type: string; state: string; levels: number; staffingPct: number }[],
	unemployedByState: Record<string, number>,
	stateKey: (id: number) => string
): PeopleInfo {
	const workforce = indexedArray(obj(c.pop_statistics).population_workforce_by_profession);
	const prices = obj(obj(obj(c.budget).current_price_report).goods);
	const goodIndex = new Map(goods.map((gd, i) => [gd.name, i]));
	const ratio = (good: string) => {
		const i = goodIndex.get(good);
		const base = i === undefined ? 0 : (goods[i].cost ?? 0);
		const price = i === undefined ? 0 : num(obj(prices[String(i)]).value);
		return base > 0 && price > 0 ? price / base : null;
	};

	const needs = data.needs
		.filter((n) => BASIC_NEEDS.includes(n.need))
		.map((n) => {
			const priced = n.goods
				.map((gd) => ({ ...gd, r: ratio(gd.good) }))
				.filter((gd): gd is typeof gd & { r: number } => gd.r !== null);
			const weight = priced.reduce((t, gd) => t + gd.weight, 0);
			const avg = weight > 0 ? priced.reduce((t, gd) => t + gd.weight * gd.r, 0) / weight : 1;
			return {
				need: n.need,
				name: data.needNames[n.need] ?? titleCase(strip(n.need, 'popneed_')),
				vsBasePct: round((avg - 1) * 100),
				goods: priced
					.map((gd) => ({ good: gd.good, vsBasePct: round((gd.r - 1) * 100) }))
					.sort((a, b) => b.vsBasePct - a.vsBasePct)
			};
		})
		.sort((a, b) => b.vsBasePct - a.vsBasePct);

	// Food security per state, weighted by workforce (pops is the largest part of the save)
	const food: Record<string, { sum: number; weight: number }> = {};
	for (const p of Object.values(obj(obj(g.pops).database))) {
		const pop = obj(p);
		const location = num(pop.location);
		if (!myStates.includes(location)) continue;
		const fs = obj(pop.food_security);
		if (fs.value === undefined) continue;
		const w = num(pop.workforce) + num(pop.dependents);
		const key = stateKey(location);
		food[key] ??= { sum: 0, weight: 0 };
		food[key].sum += num(fs.value) * w;
		food[key].weight += w;
	}

	return {
		professions: Object.entries(workforce)
			.map(([i, n]) => ({ type: data.popTypes[Number(i)] ?? `pop_${i}`, workforce: round(n) }))
			.filter((p) => p.workforce > 0)
			.sort((a, b) => b.workforce - a.workforce),
		needs,
		foodSecurity: Object.entries(food)
			.filter(([, f]) => f.weight > 0)
			.map(([state, f]) => ({ state, value: round(f.sum / f.weight, 2) })),
		understaffed: buildings
			.filter(
				(b) =>
					b.levels >= 2 &&
					b.staffingPct >= 25 &&
					b.staffingPct < 60 &&
					(unemployedByState[b.state] ?? 0) >= 5000
			)
			.map((b) => ({
				type: b.type,
				state: b.state,
				levels: b.levels,
				staffingPct: b.staffingPct,
				stateUnemployed: unemployedByState[b.state]
			}))
			.sort((a, b) => a.staffingPct - b.staffingPct)
	};
}

/**
 * Research of the player: what is being researched, what spreads from other countries, and which
 * technologies that can be researched now unlock production methods for the player's own building
 * types (scored by the building levels that profit).
 */
export function buildTech(
	g: Json,
	playerId: number,
	myStates: number[],
	data: TechData,
	pmData: ProductionMethodData | null
): TechInfo {
	const record = obj(
		Object.values(obj(obj(g.technology).database))
			.map(obj)
			.find((t) => num(t.country) === playerId)
	);
	const acquired = new Set(arr(record.acquired_technologies).map(str));
	const name = (key: string) => data.names[key] ?? titleCase(key);
	const researching = str(record.research_technology);

	// Building levels per type (with prefix, as in the game files)
	const levels: Record<string, number> = {};
	for (const b of Object.values(obj(obj(g.building_manager).database)).map(obj))
		if (myStates.includes(num(b.state)) && num(b.levels) > 0)
			levels[str(b.building)] = (levels[str(b.building)] ?? 0) + num(b.levels);

	const suggestions = Object.entries(data.techs)
		.filter(([tech, def]) => !acquired.has(tech) && def.requires.every((r) => acquired.has(r)))
		.map(([tech]) => {
			const unlocks = pmData
				? Object.entries(data.pmTechs)
						.filter(([, techs]) => techs.includes(tech))
						.flatMap(([pm]) => {
							const groups = new Set(pmData.groups[pm] ?? []);
							return Object.entries(levels)
								.filter(([type]) =>
									(pmData.buildingGroups[type] ?? []).some((gr) => groups.has(gr))
								)
								.map(([type, n]) => ({
									pm: pmData.names[pm] ?? titleCase(strip(pm, 'pm_')),
									building: strip(type, 'building_'),
									levels: n
								}));
						})
						.sort((a, b) => b.levels - a.levels)
				: [];
			return {
				tech,
				name: name(tech),
				unlocks,
				levels: unlocks.reduce((n, u) => n + u.levels, 0)
			};
		})
		.filter((t) => t.levels > 0)
		.sort((a, b) => b.levels - a.levels)
		.slice(0, 3);

	return {
		researching: researching ? { tech: researching, name: name(researching) } : null,
		spreading: arr(record.currently_spreading_technologies).map(str).map(name),
		suggestions
	};
}

/** Relations, rivals, separatism, guarantees and lobbies of the player (spike S6). */
export function buildDiplomacy(g: Json, playerId: number, names: GameNames | null): DiplomacyInfo {
	const countries = obj(obj(g.country_manager).database);
	const ref = (id: number) => {
		const tag = str(obj(countries[String(id)]).definition) || String(id);
		return { tag, name: names?.countries?.[tag] ?? tag };
	};
	const relations = Object.values(obj(obj(g.relations).database))
		.map(obj)
		.filter(
			(r) => num(obj(r.first).country) === playerId || num(obj(r.second).country) === playerId
		)
		.map((r) => {
			const first = num(obj(r.first).country);
			const other = first === playerId ? num(obj(r.second).country) : first;
			return { ...ref(other), relations: round(num(r.relations)) };
		});
	const pacts = Object.values(obj(obj(g.pacts).database)).map(obj);
	const pact = (action: string, fromPlayer: boolean) =>
		pacts
			.filter((p) => str(p.action) === action)
			.filter((p) =>
				fromPlayer
					? num(obj(p.targets).first) === playerId
					: num(obj(p.targets).second) === playerId
			)
			.map((p) => ref(num(obj(p.targets)[fromPlayer ? 'second' : 'first'])));
	const igName = (id: number) => {
		const key = str(obj(obj(obj(g.interest_groups).database)[String(id)]).definition);
		return names?.laws?.names[key] ?? titleCase(strip(key, 'ig_'));
	};

	return {
		friends: relations
			.filter((r) => r.relations >= 50)
			.sort((a, b) => b.relations - a.relations)
			.slice(0, 3),
		hostile: relations.filter((r) => r.relations <= -20).sort((a, b) => a.relations - b.relations),
		rivals: pact('rivalry', true),
		separatism: pact('support_separatism', false),
		guarantors: Object.values(obj(obj(g.treaty_article_manager).database))
			.map(obj)
			.filter(
				(a) => str(a.article) === 'guarantee_independence' && num(a.target_country) === playerId
			)
			.map((a) => ref(num(a.source_country))),
		lobbies: Object.values(obj(obj(g.political_lobbies).database))
			.map(obj)
			.filter((l) => num(l.country) === playerId)
			.map((l) => ({
				target: ref(num(l.target_country)),
				pro: str(l.type) === 'lobby_pro_country',
				appeasement: round(num(l.appeasement)),
				groups: arr(l.members).map(num).map(igName)
			}))
	};
}

export function buildSnapshot(
	save: unknown,
	goods: GoodDefinition[] | null,
	names: GameNames | null = null
): Snapshot {
	const g = obj(save);
	const meta = obj(g.meta_data);
	const players = Object.values(obj(obj(g.player_manager).database));
	const playerId = num(obj(players[0]).country);
	const c = obj(obj(obj(g.country_manager).database)[String(playerId)]);
	const budget = obj(c.budget);
	const ps = obj(c.pop_statistics);
	const myStates = arr(c.states).map(num);
	const stateDb = obj(obj(g.states).database);
	const stateKey = (id: number) =>
		strip(str(obj(stateDb[String(id)]).region), 'STATE_').toLowerCase() || String(id);

	const income = sum(arr(budget.weekly_income));
	const expenses = sum(arr(budget.weekly_expenses));
	const debt = num(budget.principal);
	const credit = num(budget.credit);
	const population =
		num(ps.population_lower_strata) +
		num(ps.population_middle_strata) +
		num(ps.population_upper_strata);

	const buildings: BuildingInfo[] = Object.values(obj(obj(g.building_manager).database))
		.map(obj)
		.filter((b) => myStates.includes(num(b.state)) && num(b.levels) > 0)
		.map((b) => {
			const levels = num(b.levels);
			const profit = num(b.profit_after_reserves);
			return {
				type: strip(str(b.building), 'building_'),
				state: stateKey(num(b.state)),
				levels,
				staffingPct: round((num(b.staffing) / levels) * 100),
				profitPerWeek: round(profit),
				profitPerLevel: round(profit / levels),
				inputShortagePct: round(num(b.input_goods_shortage) * 100)
			};
		})
		.sort((a, b) => b.profitPerLevel - a.profitPerLevel);

	let prices: PriceInfo[] | null = null;
	if (goods) {
		prices = Object.entries(obj(obj(budget.current_price_report).goods))
			.map(([id, v]) => {
				const good = goods[Number(id)];
				const price = num(obj(v).value);
				if (!good?.cost || !price) return null;
				return {
					good: good.name,
					price: round(price, 1),
					base: good.cost,
					vsBasePct: round((price / good.cost - 1) * 100)
				};
			})
			.filter((p): p is PriceInfo => p !== null)
			.sort((a, b) => b.vsBasePct - a.vsBasePct);
	}

	const gameVersion = str(meta.version);
	const countries = obj(obj(g.country_manager).database);
	const states = myStates.map((id) => {
		const st = obj(stateDb[String(id)]);
		const sp = obj(st.pop_statistics);
		const region = str(st.region);
		const sharedWith = Object.values(stateDb)
			.map(obj)
			.filter((other) => region && str(other.region) === region && num(other.country) !== playerId)
			.map(
				(other) =>
					str(obj(countries[String(num(other.country))]).definition) || String(num(other.country))
			);
		return {
			state: stateKey(id),
			region,
			population:
				num(sp.population_lower_strata) +
				num(sp.population_middle_strata) +
				num(sp.population_upper_strata),
			unemployed: num(sp.population_unemployed_workforce),
			infrastructure: round(num(st.infrastructure)),
			infrastructureUsed: round(num(st.infrastructure_usage)),
			sharedWith: [...new Set(sharedWith)]
		};
	});
	const adjective = names?.adjectives[str(c.definition)] ?? str(meta.name);
	// As the game shows it: "Gelre", or "Belgian Gelre" for the player's part of a split state
	const stateNames = Object.fromEntries(
		states.map(({ state, region, sharedWith }) => {
			const base = names?.states[region] ?? titleCase(state);
			return [state, sharedWith.length > 0 && adjective ? `${adjective} ${base}` : base];
		})
	);

	return {
		date: str(g.date) || str(meta.game_date),
		gameVersion,
		versionTested: isTestedVersion(gameVersion),
		country: { name: str(meta.name), tag: str(c.definition) },
		economy: {
			weeklyIncome: round(income),
			weeklyExpenses: round(expenses),
			weeklyBalance: round(income - expenses),
			treasury: round(num(budget.money)),
			debt: round(debt),
			creditLimit: round(credit),
			debtPct: credit > 0 ? round((debt / credit) * 100) : 0,
			taxLevel: str(c.tax_level),
			investmentPool: round(num(budget.investment_pool)),
			investmentByBuilding: Object.entries(obj(budget.investment))
				.map(([building, v]) => ({
					building: strip(building, 'building_'),
					perWeek: round(num(v))
				}))
				.filter((i) => i.perWeek > 0)
				.sort((a, b) => b.perWeek - a.perWeek),
			constructionCostPerWeek: round(
				sum(
					Object.values(
						obj(obj(obj(obj(budget.country_building_budget).expenses).construction_goods).values)
					)
				)
			),
			gdp: round(newestOfChannel(c.gdp))
		},
		population: {
			total: population,
			standardOfLiving: round(newestOfChannel(c.avgsoltrend), 2),
			literacyPct: round(newestOfChannel(c.literacy) * 100, 1),
			radicals: num(ps.population_radicals),
			loyalists: num(ps.population_loyalists),
			radicalsPct: population ? round((num(ps.population_radicals) / population) * 100, 1) : 0,
			unemployed: num(ps.population_unemployed_workforce),
			unemployedPct: population
				? round((num(ps.population_unemployed_workforce) / population) * 100, 1)
				: 0
		},
		construction: {
			paused: c.construction_paused === true || c.construction_paused === 'yes',
			sectorLevels: sum(
				buildings.filter((b) => b.type === 'construction_sector').map((b) => b.levels)
			),
			governmentQueue: arr(obj(c.government_queue).construction_elements).map((e) => ({
				building: strip(str(obj(e).type), 'building_'),
				state: stateKey(num(obj(e).state))
			})),
			privateQueueCount: arr(obj(c.private_queue).construction_elements).length
		},
		states: states.map(({ region, ...rest }) => rest),
		stateNames,
		prices,
		buildings,
		interestGroups: Object.values(obj(obj(g.interest_groups).database))
			.map(obj)
			.filter((ig) => num(ig.country) === playerId)
			.map((ig) => ({
				group: strip(str(ig.definition), 'ig_'),
				approval: num(ig.approval),
				cloutPct: round(num(ig.clout) * 100, 1),
				influence: str(ig.influence_type)
			}))
			.sort((a, b) => b.cloutPct - a.cloutPct),
		activeLaws: Object.values(obj(obj(g.laws).database))
			.map(obj)
			.filter((l) => num(l.country) === playerId && l.active === true)
			.map((l) => strip(str(l.law), 'law_')),
		newProductionMethods: newProductionMethods(
			arr(c.new_production_methods_v2).map(str),
			Object.values(obj(obj(g.building_manager).database))
				.map(obj)
				.filter((b) => myStates.includes(num(b.state)) && num(b.levels) > 0),
			names?.productionMethods ?? null,
			stateKey
		),
		trade: goods ? buildTrade(g, c, playerId, myStates, goods, stateKey) : null,
		laws: names?.laws ? buildLaws(g, playerId, names.laws) : null,
		people:
			goods && names?.population
				? buildPeople(
						g,
						c,
						myStates,
						goods,
						names.population,
						buildings,
						Object.fromEntries(states.map((st) => [st.state, st.unemployed])),
						stateKey
					)
				: null,
		technology: names?.technology
			? buildTech(g, playerId, myStates, names.technology, names.productionMethods ?? null)
			: null,
		diplomacy: buildDiplomacy(g, playerId, names),
		journal: Object.values(obj(obj(g.journal_entry_manager).database))
			.map(obj)
			.filter((j) => num(j.country) === playerId && j.active === true)
			.map((j) => ({
				type: str(j.type),
				value: round(num(j.baseline_value), 0),
				goal: round(num(j.goal_value), 0),
				since: str(j.date_added)
			}))
			.filter((j) => j.type !== '')
	};
}

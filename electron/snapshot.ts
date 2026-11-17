// Build a Snapshot from a save converted to JSON (Rakaly). Works on the parsed gamestate only,
// so any source that produces the same structure (binary via Rakaly, a text save) can use it.
// Field paths: docs/save-structuur.md. Ported from spikes/advisor/facts.mjs.
import {
	isTestedVersion,
	type BuildingInfo,
	type NewProductionMethod,
	type PriceInfo,
	type Snapshot
} from '../src/lib/snapshot';
import type { GameNames, GoodDefinition, ProductionMethodData } from './game-data';

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

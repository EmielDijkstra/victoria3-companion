// Build a Snapshot from a save converted to JSON (Rakaly). Works on the parsed gamestate only,
// so any source that produces the same structure (binary via Rakaly, a text save) can use it.
// Field paths: docs/save-structuur.md. Ported from spikes/advisor/facts.mjs.
import {
	isTestedVersion,
	type BuildingInfo,
	type PriceInfo,
	type Snapshot
} from '../src/lib/snapshot';
import type { GoodDefinition } from './game-data';

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
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

export function buildSnapshot(save: unknown, goods: GoodDefinition[] | null): Snapshot {
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
		states: myStates.map((id) => {
			const s = obj(stateDb[String(id)]);
			const sp = obj(s.pop_statistics);
			return {
				state: stateKey(id),
				population:
					num(sp.population_lower_strata) +
					num(sp.population_middle_strata) +
					num(sp.population_upper_strata),
				unemployed: num(sp.population_unemployed_workforce),
				infrastructure: round(num(s.infrastructure)),
				infrastructureUsed: round(num(s.infrastructure_usage))
			};
		}),
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
			.map((l) => strip(str(l.law), 'law_'))
	};
}

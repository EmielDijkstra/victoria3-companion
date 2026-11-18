// Advice rules: Snapshot → ranked advice. Each rule returns a code plus the numbers that back it
// up; the texts (Dutch/English) live in texts.ts. Ported and extended from spike S5
// (spikes/advisor/rules.mjs, docs/spikes/s5-regels-vs-ai.md).
import type { BuildingInfo, PriceInfo, Snapshot, StateInfo } from '../snapshot';

export type AdviceLevel = 'urgent' | 'warn' | 'smart' | 'patience' | 'consider';

/** Order in the list: urgent first, "consider" last. */
const LEVEL_RANK: Record<AdviceLevel, number> = {
	urgent: 0,
	warn: 1,
	smart: 2,
	patience: 3,
	consider: 4
};

export type Advice =
	| {
			id: 'construction-paused';
			level: 'urgent';
			queued: number;
			costPerWeek: number;
			balance: number;
	  }
	| { id: 'deficit'; level: 'urgent'; balance: number; debtPct: number }
	| {
			id: 'debt-high';
			level: 'urgent' | 'warn';
			debt: number;
			credit: number;
			debtPct: number;
			balance: number;
	  }
	| {
			id: 'expand-best';
			level: 'smart';
			building: string;
			buildingState: string;
			profitPerLevel: number;
			good: string;
			price: number;
			base: number;
			vsBasePct: number;
			targetState: string;
			unemployed: number;
			queuedElsewhere: string[];
	  }
	| {
			id: 'unemployment';
			level: 'smart';
			unemployed: number;
			unemployedPct: number;
			targetState: string;
			stateUnemployed: number;
	  }
	| {
			id: 'more-construction';
			level: 'smart';
			investmentPool: number;
			sectorLevels: number;
			/** Where to build: the state with the most unemployed, so the new levels fill quickly */
			targetState?: string;
			stateUnemployed?: number;
			/** Building types the private builders spend the most on (largest first, max 3) */
			waitingFor?: string[];
	  }
	| {
			id: 'trade-capacity-full';
			level: 'smart';
			states: { state: string; capacity: number; used: number }[];
			/** Largest imports that cost more here than on the world market (max 2) */
			dearImports: string[];
	  }
	| {
			id: 'subsidized-export';
			level: 'consider';
			/** Goods with an import subsidy that the player exports */
			goods: { good: string; net: number; policy: string }[];
	  }
	| {
			id: 'import-what-you-make';
			level: 'smart';
			good: string;
			imported: number;
			produced: number;
			price: number;
			base: number;
			vsBasePct: number;
	  }
	| {
			id: 'law-with-support';
			level: 'consider';
			law: string;
			groupName: string;
			current: string;
			support: number;
			currentSupport: number;
			/** Interest groups for (approve or more) and against, most clout first, max 3 each */
			for: { name: string; cloutPct: number; strong: boolean }[];
			against: { name: string; cloutPct: number; strong: boolean }[];
			conditions: boolean;
	  }
	| {
			id: 'new-production-methods';
			level: 'smart';
			/** Max 4, the ones with the most building levels first */
			methods: { name: string; buildings: { type: string; state: string; levels: number }[] }[];
	  }
	| {
			id: 'be-patient';
			level: 'patience';
			building: string;
			buildingState: string;
			staffingPct: number;
			profitPerWeek: number;
			good: string;
			vsBasePct: number;
	  }
	| {
			id: 'losing-building';
			level: 'warn';
			building: string;
			buildingState: string;
			staffingPct: number;
			loss: number;
			inputShortagePct: number;
	  }
	| {
			id: 'government-inputs';
			level: 'warn';
			building: string;
			buildingState: string;
			inputShortagePct: number;
			costPerWeek: number;
	  }
	| { id: 'angry-ig'; level: 'warn'; group: string; approval: number; cloutPct: number }
	| {
			id: 'lower-tax';
			level: 'consider';
			taxLevel: string;
			radicalsPct: number;
			standardOfLiving: number;
			balance: number;
			debtPct: number;
	  };

export type AdviceId = Advice['id'];

/** Main good a building produces (enough for the rules; not every building). */
export const OUTPUT_GOOD: Record<string, string> = {
	paper_mill: 'paper',
	explosives_factory: 'explosives',
	tooling_workshop: 'tools',
	steel_mill: 'steel',
	textile_mill: 'clothes',
	furniture_manufactory: 'furniture',
	glassworks: 'glass',
	logging_camp: 'wood',
	coal_mine: 'coal',
	iron_mine: 'iron',
	sulfur_mine: 'sulfur',
	lead_mine: 'lead',
	food_industry: 'groceries',
	chemical_plant: 'fertilizer',
	motor_industry: 'engines',
	arms_industry: 'small_arms',
	munition_plant: 'ammunition',
	shipyard: 'clippers',
	livestock_ranch: 'meat',
	wheat_farm: 'grain',
	rye_farm: 'grain',
	fishing_wharf: 'fish'
};

/** Buildings that are meant to cost money or are not "producers" in the usual sense. */
const NOT_A_PRODUCER =
	/^(government_administration|university|barrack|naval_|construction_sector|port|railway|army_logistics|naval_logistics|trade_center|urban_center|manor_house|financial_district|subsistence|company_|art_academy)/;

const GOVERNMENT = /^(government_administration|university)$/;

const isProducer = (b: BuildingInfo) => !NOT_A_PRODUCER.test(b.type);

const round = (n: number) => Math.round(n);

/** low_subventions / high_subventions; not "no_tariffs_or_subventions" */
export const isSubsidy = (policy: string) => /^(low|high|very_high)_subventions$/.test(policy);

function priceOf(prices: PriceInfo[] | null, good: string | undefined) {
	return good ? prices?.find((p) => p.good === good) : undefined;
}

function mostUnemployed(states: StateInfo[]): StateInfo | undefined {
	return [...states].sort((a, b) => b.unemployed - a.unemployed)[0];
}

/** All advice for a snapshot, most important first. */
export function adviseFor(s: Snapshot): Advice[] {
	const out: Advice[] = [];
	const e = s.economy;
	const target = mostUnemployed(s.states);

	// Construction paused while projects wait
	if (s.construction.paused && s.construction.governmentQueue.length > 0) {
		out.push({
			id: 'construction-paused',
			level: 'urgent',
			queued: s.construction.governmentQueue.length,
			costPerWeek: e.constructionCostPerWeek,
			balance: e.weeklyBalance
		});
	}

	// Budget and debt
	if (e.weeklyBalance < 0) {
		out.push({ id: 'deficit', level: 'urgent', balance: e.weeklyBalance, debtPct: e.debtPct });
	} else if (e.debtPct >= 40) {
		out.push({
			id: 'debt-high',
			level: e.debtPct >= 75 ? 'urgent' : 'warn',
			debt: e.debt,
			credit: e.creditLimit,
			debtPct: e.debtPct,
			balance: e.weeklyBalance
		});
	}

	// Expand the most profitable producer whose good is scarce, where people need jobs
	const best = s.buildings.find(
		(b) =>
			isProducer(b) &&
			b.staffingPct >= 80 &&
			b.profitPerLevel > 0 &&
			(priceOf(s.prices, OUTPUT_GOOD[b.type])?.vsBasePct ?? 0) > 10
	);
	if (best && target) {
		const p = priceOf(s.prices, OUTPUT_GOOD[best.type])!;
		out.push({
			id: 'expand-best',
			level: 'smart',
			building: best.type,
			buildingState: best.state,
			profitPerLevel: best.profitPerLevel,
			good: p.good,
			price: p.price,
			base: p.base,
			vsBasePct: p.vsBasePct,
			targetState: target.state,
			unemployed: target.unemployed,
			queuedElsewhere: s.construction.governmentQueue
				.filter((q) => q.building === best.type && q.state !== target.state)
				.map((q) => q.state)
		});
	} else if (target && s.population.unemployedPct >= 2) {
		// No clear winner to expand, but many people without work
		out.push({
			id: 'unemployment',
			level: 'smart',
			unemployed: s.population.unemployed,
			unemployedPct: s.population.unemployedPct,
			targetState: target.state,
			stateUnemployed: target.unemployed
		});
	}

	// Money waiting for construction capacity
	if (e.investmentPool > 100_000 && s.construction.sectorLevels < 10) {
		out.push({
			id: 'more-construction',
			level: 'smart',
			investmentPool: e.investmentPool,
			sectorLevels: s.construction.sectorLevels,
			...(target ? { targetState: target.state, stateUnemployed: target.unemployed } : {}),
			...(e.investmentByBuilding?.length
				? { waitingFor: e.investmentByBuilding.slice(0, 3).map((i) => i.building) }
				: {})
		});
	}

	// Trade (spike S6): capacity, subsidies, imports
	const trade = s.trade;
	if (trade) {
		const full = trade.states.filter((t) => t.capacity > 0 && t.used / t.capacity >= 0.95);
		if (full.length > 0) {
			out.push({
				id: 'trade-capacity-full',
				level: 'smart',
				states: full,
				dearImports: trade.goods
					.filter((t) => t.net < 0 && t.worldPrice > 0 && t.localPrice > t.worldPrice * 1.1)
					.slice(0, 2)
					.map((t) => t.good)
			});
		}
		const subsidized = trade.goods.filter((t) => t.net > 0 && isSubsidy(t.importPolicy));
		if (subsidized.length > 0) {
			out.push({
				id: 'subsidized-export',
				level: 'consider',
				goods: subsidized.map((t) => ({ good: t.good, net: t.net, policy: t.importPolicy }))
			});
		}
		const made = trade.goods.find(
			(t) => t.net <= -5 && t.produced > 0 && t.base > 0 && t.localPrice >= t.base * 1.15
		);
		if (made) {
			out.push({
				id: 'import-what-you-make',
				level: 'smart',
				good: made.good,
				imported: -made.net,
				produced: made.produced,
				price: made.localPrice,
				base: made.base,
				vsBasePct: round((made.localPrice / made.base - 1) * 100)
			});
		}
	}

	// A law with clearly more support than the current one in its group (spike S6). Support is
	// the clout-weighted stance of the interest groups; it says what is feasible, not what is good.
	const lawPick = (s.laws ?? [])
		.flatMap((g) => g.options.map((o) => ({ g, o, gain: o.support - g.activeSupport })))
		.filter(({ o, gain }) => o.support >= 0.3 && gain >= 0.3)
		.sort((a, b) => b.gain - a.gain)[0];
	if (lawPick) {
		const side = (approve: boolean) =>
			lawPick.o.stances
				.filter((st) =>
					approve
						? /approve$/.test(st.stance) && !/disapprove/.test(st.stance)
						: /disapprove/.test(st.stance)
				)
				.slice(0, 3)
				.map((st) => ({
					name: st.name,
					cloutPct: st.cloutPct,
					strong: st.stance.startsWith('strongly')
				}));
		out.push({
			id: 'law-with-support',
			level: 'consider',
			law: lawPick.o.name,
			groupName: lawPick.g.name,
			current: lawPick.g.activeName,
			support: lawPick.o.support,
			currentSupport: lawPick.g.activeSupport,
			for: side(true),
			against: side(false),
			conditions: lawPick.o.conditions
		});
	}

	// The game unlocked production methods that the player's buildings do not use yet
	const levelsOf = (m: { buildings: { levels: number }[] }) =>
		m.buildings.reduce((n, b) => n + b.levels, 0);
	const methods = [...(s.newProductionMethods ?? [])]
		.sort((a, b) => levelsOf(b) - levelsOf(a))
		.slice(0, 4)
		.map((m) => ({ name: m.name, buildings: m.buildings }));
	if (methods.length > 0) out.push({ id: 'new-production-methods', level: 'smart', methods });

	for (const b of s.buildings) {
		// New producer of a scarce good, still hiring: be patient
		const p = priceOf(s.prices, OUTPUT_GOOD[b.type]);
		if (isProducer(b) && b.staffingPct < 25 && p && p.vsBasePct > 30) {
			out.push({
				id: 'be-patient',
				level: 'patience',
				building: b.type,
				buildingState: b.state,
				staffingPct: b.staffingPct,
				profitPerWeek: b.profitPerWeek,
				good: p.good,
				vsBasePct: p.vsBasePct
			});
		}
		// Staffed producer that still loses money
		if (isProducer(b) && b.staffingPct >= 50 && b.profitPerWeek < 0) {
			out.push({
				id: 'losing-building',
				level: 'warn',
				building: b.type,
				buildingState: b.state,
				staffingPct: b.staffingPct,
				loss: -b.profitPerWeek,
				inputShortagePct: b.inputShortagePct
			});
		}
		// Government buildings short of inputs (e.g. paper): they work worse and cost more
		if (GOVERNMENT.test(b.type) && b.inputShortagePct >= 10) {
			out.push({
				id: 'government-inputs',
				level: 'warn',
				building: b.type,
				buildingState: b.state,
				inputShortagePct: b.inputShortagePct,
				costPerWeek: -b.profitPerWeek
			});
		}
	}

	// Unhappy and powerful interest groups
	for (const ig of s.interestGroups) {
		if (ig.approval <= -5 && ig.cloutPct >= 10) {
			out.push({
				id: 'angry-ig',
				level: 'warn',
				group: ig.group,
				approval: ig.approval,
				cloutPct: ig.cloutPct
			});
		}
	}

	// High taxes, many radicals, and the budget allows a step down
	if (
		/^(very_high|high)$/.test(e.taxLevel) &&
		s.population.radicalsPct > 15 &&
		e.weeklyBalance > 0
	) {
		out.push({
			id: 'lower-tax',
			level: 'consider',
			taxLevel: e.taxLevel,
			radicalsPct: s.population.radicalsPct,
			standardOfLiving: s.population.standardOfLiving,
			balance: e.weeklyBalance,
			debtPct: e.debtPct
		});
	}

	// Stable sort: by level, keeping the rule order above within a level
	return out
		.map((a, i) => ({ a, i }))
		.sort((x, y) => LEVEL_RANK[x.a.level] - LEVEL_RANK[y.a.level] || x.i - y.i)
		.map(({ a }) => a);
}

// Test snapshot shared by unit tests and the Playwright test (e2e/advice.test.ts).
import type { Snapshot } from '../snapshot';

// A snapshot like the Belgium save of 16 September 1848 (docs/spikes/s5-regels-vs-ai.md).
export function belgium(patch: (s: Snapshot) => void = () => {}): Snapshot {
	const s: Snapshot = {
		journal: [
			{ type: 'je_tutorial_grow_gdp', value: 3916769, goal: 4895962, since: '1839.3.4' },
			{ type: 'je_without_texts', value: 0, goal: 0, since: '1840.1.1' }
		],
		date: '1848.9.16.6',
		gameVersion: '1.15.1',
		versionTested: true,
		country: { name: 'Belgium', tag: 'BEL' },
		economy: {
			weeklyIncome: 32144,
			weeklyExpenses: 29636,
			weeklyBalance: 2508,
			treasury: 0,
			debt: 2023328,
			creditLimit: 4614425,
			debtPct: 44,
			taxLevel: 'very_high',
			investmentPool: 166194,
			constructionCostPerWeek: 11277,
			gdp: 3432405
		},
		population: {
			total: 5061265,
			standardOfLiving: 8.77,
			literacyPct: 42.2,
			radicals: 1222155,
			loyalists: 33692,
			radicalsPct: 24.1,
			unemployed: 168084,
			unemployedPct: 3.3
		},
		construction: {
			paused: true,
			sectorLevels: 3,
			governmentQueue: [
				{ building: 'paper_mill', state: 'gelre' },
				{ building: 'port', state: 'flanders' }
			],
			privateQueueCount: 2
		},
		states: [
			{
				state: 'flanders',
				population: 2828061,
				unemployed: 99192,
				infrastructure: 124,
				infrastructureUsed: 68,
				sharedWith: []
			},
			{
				state: 'gelre',
				population: 247030,
				unemployed: 4322,
				infrastructure: 32,
				infrastructureUsed: 12,
				sharedWith: ['NET']
			},
			{
				state: 'wallonia',
				population: 1986174,
				unemployed: 64570,
				infrastructure: 130,
				infrastructureUsed: 92,
				sharedWith: []
			}
		],
		stateNames: { flanders: 'Flanders', gelre: 'Belgian Gelre', wallonia: 'Wallonia' },
		prices: [
			{ good: 'explosives', price: 122.5, base: 50, vsBasePct: 145 },
			{ good: 'paper', price: 46.7, base: 30, vsBasePct: 56 },
			{ good: 'iron', price: 47.1, base: 40, vsBasePct: 18 },
			{ good: 'tools', price: 12.5, base: 40, vsBasePct: -69 }
		],
		buildings: [
			{
				type: 'paper_mill',
				state: 'flanders',
				levels: 1,
				staffingPct: 100,
				profitPerWeek: 1615,
				profitPerLevel: 1615,
				inputShortagePct: 0
			},
			{
				type: 'iron_mine',
				state: 'wallonia',
				levels: 8,
				staffingPct: 100,
				profitPerWeek: 2024,
				profitPerLevel: 253,
				inputShortagePct: 0
			},
			{
				type: 'explosives_factory',
				state: 'wallonia',
				levels: 1,
				staffingPct: 3,
				profitPerWeek: -18,
				profitPerLevel: -18,
				inputShortagePct: 0
			},
			{
				type: 'government_administration',
				state: 'wallonia',
				levels: 3,
				staffingPct: 100,
				profitPerWeek: -1007,
				profitPerLevel: -336,
				inputShortagePct: 19
			},
			{
				type: 'barrack',
				state: 'flanders',
				levels: 10,
				staffingPct: 35,
				profitPerWeek: -380,
				profitPerLevel: -38,
				inputShortagePct: 0
			}
		],
		interestGroups: [
			{ group: 'intelligentsia', approval: 5, cloutPct: 41.7, influence: 'influential' },
			{ group: 'trade_unions', approval: -9, cloutPct: 0, influence: 'neutral' }
		],
		activeLaws: ['monarchy', 'no_police']
	};
	patch(s);
	return s;
}

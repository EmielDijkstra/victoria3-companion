// Test snapshot shared by unit tests and the Playwright test (e2e/advice.test.ts).
import type { Snapshot } from '../snapshot';

// A snapshot like the Belgium save of 16 September 1848 (docs/spikes/s5-regels-vs-ai.md).
export function belgium(patch: (s: Snapshot) => void = () => {}): Snapshot {
	const s: Snapshot = {
		newProductionMethods: [
			{
				pm: 'pm_bessemer_process',
				name: 'Bessemer Process',
				buildings: [
					{ type: 'steel_mill', state: 'wallonia', levels: 4 },
					{ type: 'steel_mill', state: 'flanders', levels: 1 }
				]
			},
			{
				pm: 'pm_rifles',
				name: 'Rifles',
				buildings: [{ type: 'arms_industry', state: 'wallonia', levels: 2 }]
			}
		],
		trade: {
			states: [
				{ state: 'flanders', capacity: 123, used: 123 },
				{ state: 'wallonia', capacity: 178, used: 170 }
			],
			goods: [
				{
					good: 'tobacco',
					net: -35,
					localPrice: 42.9,
					worldPrice: 34.8,
					base: 30,
					importPolicy: '',
					exportPolicy: '',
					produced: 0
				},
				{
					good: 'fabric',
					net: -19,
					localPrice: 20.9,
					worldPrice: 14.9,
					base: 20,
					importPolicy: 'low_tariffs',
					exportPolicy: 'low_tariffs',
					produced: 310
				},
				{
					good: 'paper',
					net: 6,
					localPrice: 38.9,
					worldPrice: 43,
					base: 30,
					importPolicy: 'high_subventions',
					exportPolicy: 'low_tariffs',
					produced: 120
				},
				{
					good: 'tools',
					net: 64,
					localPrice: 37.7,
					worldPrice: 51.4,
					base: 40,
					importPolicy: 'low_tariffs',
					exportPolicy: '',
					produced: 767
				}
			],
			partners: ['FRA', 'GBR', 'SWI'],
			tradeCenters: { levels: 24, revenue: 11096, tariffs: 1618, subventions: 210, profit: 888 }
		},
		laws: [
			{
				group: 'policing',
				name: 'Policing',
				active: 'local_police',
				activeName: 'Local Police Force',
				activeSupport: -0.1,
				options: [
					{
						law: 'dedicated_police',
						name: 'Dedicated Police Force',
						support: 0.69,
						conditions: false,
						stances: [
							{
								ig: 'petty_bourgeoisie',
								name: 'Petite Bourgeoisie',
								stance: 'strongly_approve',
								cloutPct: 25.5
							},
							{
								ig: 'armed_forces',
								name: 'Armed Forces',
								stance: 'strongly_approve',
								cloutPct: 8.8
							}
						]
					}
				]
			},
			{
				group: 'free_speech',
				name: 'Free Speech',
				active: 'right_of_assembly',
				activeName: 'Right of Assembly',
				activeSupport: 0.17,
				options: [
					{
						law: 'censorship',
						name: 'Censorship',
						support: 0.56,
						conditions: false,
						stances: [
							{
								ig: 'petty_bourgeoisie',
								name: 'Petite Bourgeoisie',
								stance: 'approve',
								cloutPct: 25.5
							},
							{ ig: 'intelligentsia', name: 'Intelligentsia', stance: 'disapprove', cloutPct: 15.5 }
						]
					}
				]
			}
		],
		people: {
			professions: [
				{ type: 'peasants', workforce: 628650 },
				{ type: 'laborers', workforce: 375630 },
				{ type: 'clerks', workforce: 45308 },
				{ type: 'engineers', workforce: 13260 }
			],
			needs: [
				{
					need: 'popneed_basic_food',
					name: 'Basic Food',
					vsBasePct: 31,
					goods: [
						{ good: 'meat', vsBasePct: 40 },
						{ good: 'grain', vsBasePct: 25 },
						{ good: 'fish', vsBasePct: 5 }
					]
				},
				{
					need: 'popneed_heating',
					name: 'Heating',
					vsBasePct: 4,
					goods: [{ good: 'coal', vsBasePct: 9 }]
				}
			],
			foodSecurity: [
				{ state: 'flanders', value: 0.62 },
				{ state: 'gelre', value: 0.57 }
			],
			understaffed: [
				{
					type: 'livestock_ranch',
					state: 'gelre',
					levels: 3,
					staffingPct: 43,
					stateUnemployed: 30486
				}
			]
		},
		technology: {
			researching: { tech: 'canneries', name: 'Canneries' },
			spreading: ['Psychiatry', 'Shell Gun'],
			suggestions: [
				{
					tech: 'steam_donkey',
					name: 'Steam Donkey',
					levels: 20,
					unlocks: [
						{ pm: 'Steam Donkey', building: 'logging_camp', levels: 12 },
						{ pm: 'Steam Donkey', building: 'iron_mine', levels: 8 }
					]
				},
				{
					tech: 'steel_frame_buildings',
					name: 'Steel-Frame Buildings',
					levels: 19,
					unlocks: [{ pm: 'Covered Markets', building: 'urban_center', levels: 19 }]
				}
			]
		},
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
			investmentByBuilding: [
				{ building: 'company_headquarter', perWeek: 2974 },
				{ building: 'financial_district', perWeek: 802 },
				{ building: 'paper_mill', perWeek: 570 }
			],
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

import { describe, expect, it } from 'vitest';
import type { Advice } from './rules';
import {
	ADVICE_TEXTS,
	adviceText,
	gameName,
	howToStatus,
	LEVEL_LABEL,
	minorVersion,
	money
} from './texts';

const NAMES = { flanders: 'Flanders', gelre: 'Belgian Gelre', wallonia: 'Wallonia' };

const samples: Advice[] = [
	{ id: 'construction-paused', level: 'urgent', queued: 10, costPerWeek: 11277, balance: 2508 },
	{ id: 'deficit', level: 'urgent', balance: -4000, debtPct: 44 },
	{ id: 'debt-high', level: 'warn', debt: 2023328, credit: 4614425, debtPct: 44, balance: 2508 },
	{
		id: 'expand-best',
		level: 'smart',
		building: 'paper_mill',
		buildingState: 'flanders',
		profitPerLevel: 1615,
		good: 'paper',
		price: 46.7,
		base: 30,
		vsBasePct: 56,
		targetState: 'flanders',
		unemployed: 99192,
		queuedElsewhere: ['gelre']
	},
	{
		id: 'unemployment',
		level: 'smart',
		unemployed: 168084,
		unemployedPct: 3.3,
		targetState: 'flanders',
		stateUnemployed: 99192
	},
	{
		id: 'more-construction',
		level: 'smart',
		investmentPool: 166194,
		sectorLevels: 3,
		targetState: 'flanders',
		stateUnemployed: 99192
	},
	{
		id: 'be-patient',
		level: 'patience',
		building: 'explosives_factory',
		buildingState: 'wallonia',
		staffingPct: 3,
		profitPerWeek: -18,
		good: 'explosives',
		vsBasePct: 145
	},
	{
		id: 'losing-building',
		level: 'warn',
		building: 'textile_mill',
		buildingState: 'flanders',
		staffingPct: 90,
		loss: 500,
		inputShortagePct: 30
	},
	{
		id: 'government-inputs',
		level: 'warn',
		building: 'government_administration',
		buildingState: 'wallonia',
		inputShortagePct: 19,
		costPerWeek: 1007
	},
	{ id: 'angry-ig', level: 'warn', group: 'landowners', approval: -7, cloutPct: 15.1 },
	{
		id: 'lower-tax',
		level: 'consider',
		taxLevel: 'very_high',
		radicalsPct: 24.1,
		standardOfLiving: 8.77,
		balance: 2508,
		debtPct: 44
	},
	{
		id: 'new-production-methods',
		level: 'smart',
		methods: [
			{
				name: 'Bessemer Process',
				buildings: [
					{ type: 'steel_mill', state: 'wallonia', levels: 4 },
					{ type: 'steel_mill', state: 'gelre', levels: 1 }
				]
			},
			{ name: 'Rifles', buildings: [{ type: 'arms_industry', state: 'wallonia', levels: 2 }] }
		]
	},
	{
		id: 'trade-capacity-full',
		level: 'smart',
		states: [
			{ state: 'flanders', capacity: 123, used: 123 },
			{ state: 'gelre', capacity: 10, used: 10 }
		],
		dearImports: ['tobacco']
	},
	{
		id: 'subsidized-export',
		level: 'consider',
		goods: [{ good: 'paper', net: 6, policy: 'high_subventions' }]
	},
	{
		id: 'import-what-you-make',
		level: 'smart',
		good: 'fabric',
		imported: 19,
		produced: 310,
		price: 26,
		base: 20,
		vsBasePct: 30
	},
	{
		id: 'law-with-support',
		level: 'consider',
		law: 'Dedicated Police Force',
		groupName: 'Policing',
		current: 'Local Police Force',
		support: 0.69,
		currentSupport: -0.1,
		for: [{ name: 'Petite Bourgeoisie', cloutPct: 25.5, strong: true }],
		against: [],
		conditions: true
	},
	{
		id: 'dear-basic-needs',
		level: 'smart',
		need: 'Basic Food',
		vsBasePct: 31,
		goods: [{ good: 'meat', vsBasePct: 40 }]
	},
	{
		id: 'understaffed',
		level: 'consider',
		building: 'livestock_ranch',
		buildingState: 'gelre',
		staffingPct: 43,
		stateUnemployed: 30486
	}
];

describe('advice texts', () => {
	it('has a text for every rule in every language', () => {
		const rules = Object.keys(ADVICE_TEXTS.nl).sort();
		expect(Object.keys(ADVICE_TEXTS.en).sort()).toEqual(rules);
		expect(samples.map((s) => s.id).sort()).toEqual(rules);
	});

	it('writes a title and a reason for every sample, in both languages', () => {
		for (const sample of samples) {
			for (const locale of ['nl', 'en'] as const) {
				const text = adviceText(sample, locale);
				expect(text.title.trim(), `${sample.id} ${locale}`).not.toBe('');
				expect(text.why.trim(), `${sample.id} ${locale}`).not.toBe('');
				expect(text.why, `${sample.id} ${locale}`).not.toMatch(/undefined|NaN/);
			}
		}
	});

	it('shows the paper mill advice with the numbers from the save', () => {
		const nl = adviceText(samples[3], 'nl');
		expect(nl.title).toBe('Breid je Paper Mill uit in Flanders');
		expect(nl.why).toContain('£1,6K winst per level');
		expect(nl.why).toContain('46,7');
		expect(nl.why).toContain('99.192');
		expect(nl.why).toContain('Gelre');
		const en = adviceText(samples[3], 'en');
		expect(en.title).toBe('Expand your Paper Mill in Flanders');
		expect(en.why).toContain('46.7');
		expect(en.why).toContain('99,192');
	});

	it('uses the state names as the game shows them, also for a split state', () => {
		const losing = samples.find((x) => x.id === 'losing-building')!;
		const gelre = {
			...losing,
			buildingState: 'gelre',
			building: 'tooling_workshop'
		} as typeof losing;
		expect(adviceText(gelre, 'nl', NAMES).title).toBe(
			'Tooling Workshop in Belgian Gelre draait verlies'
		);
		expect(adviceText(gelre, 'en', NAMES).title).toBe(
			'Tooling Workshop in Belgian Gelre loses money'
		);
		expect(adviceText(samples[3], 'nl', NAMES).why).toContain('Belgian Gelre');
	});

	it('falls back to a readable name without game files', () => {
		const losing = samples.find((x) => x.id === 'losing-building')!;
		expect(adviceText(losing, 'nl').title).toBe('Textile Mill in Flanders draait verlies');
	});

	it('has a level label in both languages', () => {
		expect(LEVEL_LABEL.nl.smart).toBe('Slim');
		expect(LEVEL_LABEL.en.smart).toBe('Smart');
	});
});

describe('formatting', () => {
	it('formats money per language', () => {
		expect(money(2508, 'nl')).toBe('£2,5K');
		expect(money(2508, 'en')).toBe('£2.5K');
		expect(money(2023328, 'nl')).toBe('£2,02M');
		expect(money(-18, 'en')).toBe('−£18');
	});

	it('turns game keys into game names', () => {
		expect(gameName('paper_mill')).toBe('Paper Mill');
		expect(gameName('very_high')).toBe('Very High');
	});
});

describe('howToStatus', () => {
	it('compares on major.minor, ignoring the patch', () => {
		expect(minorVersion('1.15.1')).toBe('1.15');
		expect(howToStatus('deficit', '1.15.3', { deficit: '1.15' })).toEqual({
			kind: 'checked',
			version: '1.15'
		});
	});

	it('warns when the steps were checked in another version', () => {
		expect(howToStatus('deficit', '1.16.0', { deficit: '1.15' })).toEqual({
			kind: 'other-version',
			checked: '1.15',
			version: '1.16'
		});
	});

	it('says when the steps were never checked', () => {
		expect(howToStatus('deficit', '1.15.1', {})).toEqual({ kind: 'unchecked', version: '1.15' });
	});
});

describe('more-construction steps', () => {
	it('names the state to build in, and works without one', () => {
		const base = {
			id: 'more-construction',
			level: 'smart',
			investmentPool: 1,
			sectorLevels: 3
		} as const;
		const withState = adviceText(
			{ ...base, targetState: 'gelre', stateUnemployed: 1200 },
			'nl',
			NAMES
		);
		expect(withState.how[0]).toContain('Belgian Gelre');
		expect(withState.how[0]).toContain('1.200');
		expect(withState.how.some((step) => step.includes('Construction Queue'))).toBe(true);
		expect(adviceText(base, 'en').how[1]).toContain('that state');
	});
});

describe('new-production-methods text', () => {
	it('lists each method with its buildings and states', () => {
		const pm = samples.find((x) => x.id === 'new-production-methods')!;
		const text = adviceText(pm, 'nl', NAMES);
		expect(text.title).toBe('Nieuwe Production Methods beschikbaar');
		expect(text.why).toContain(
			'Bessemer Process voor je Steel Mill in Wallonia en Belgian Gelre en Rifles voor je Arms Industry in Wallonia'
		);
		expect(text.how[0]).toContain('Steel Mill in Wallonia');
	});
});

describe('trade texts', () => {
	const byId = (id: string) => samples.find((x) => x.id === id)!;

	it('names the full states as the game does', () => {
		const text = adviceText(byId('trade-capacity-full'), 'nl', NAMES);
		expect(text.why).toContain('Flanders (123/123) en Belgian Gelre (10/10)');
		expect(text.why).toContain('Tobacco');
	});

	it('explains the import subsidy on an exported good', () => {
		const text = adviceText(byId('subsidized-export'), 'en', NAMES);
		expect(text.title).toBe('You subsidise imports of Paper');
		expect(text.why).toContain('Paper (High Subventions)');
	});
});

describe('law text', () => {
	it('names supporters, says nobody is against, and warns about conditions', () => {
		const law = samples.find((x) => x.id === 'law-with-support')!;
		const text = adviceText(law, 'nl');
		expect(text.why).toContain('Voor: Petite Bourgeoisie (sterk) 25,5%');
		expect(text.why).toContain('Geen enkele Interest Group is tegen.');
		expect(text.caveat).toContain('extra voorwaarden');
	});
});

describe('population texts', () => {
	it('names the need, its dearest good and the split state as the game does', () => {
		const need = adviceText(
			samples.find((x) => x.id === 'dear-basic-needs')!,
			'nl'
		);
		expect(need.title).toBe('Basic Food is duur voor je arbeiders');
		expect(need.why).toContain('(Meat +40%)');
		const empty = adviceText(
			samples.find((x) => x.id === 'understaffed')!,
			'nl',
			NAMES
		);
		expect(empty.title).toBe('Livestock Ranch in Belgian Gelre blijft half leeg');
		expect(empty.why).toContain('30.486 mensen werk zoeken');
	});
});

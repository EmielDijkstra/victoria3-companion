import { describe, expect, it } from 'vitest';
import type { Advice } from './rules';
import { ADVICE_TEXTS, adviceText, gameName, LEVEL_LABEL, money } from './texts';

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
	{ id: 'more-construction', level: 'smart', investmentPool: 166194, sectorLevels: 3 },
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

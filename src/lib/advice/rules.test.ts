import { describe, expect, it } from 'vitest';
import { belgium } from './fixtures';
import { adviseFor, type Advice } from './rules';

const ids = (advice: Advice[]) => advice.map((a) => a.id);
const find = <T extends Advice['id']>(advice: Advice[], id: T) =>
	advice.find((a) => a.id === id) as Extract<Advice, { id: T }> | undefined;

describe('adviseFor: the Belgium test set from spike S5', () => {
	const advice = adviseFor(belgium());

	it('puts the paused construction first', () => {
		expect(advice[0]).toMatchObject({ id: 'construction-paused', queued: 2, costPerWeek: 11277 });
	});

	it('suggests paper mills in Flanders, not in Gelre', () => {
		expect(find(advice, 'expand-best')).toMatchObject({
			building: 'paper_mill',
			good: 'paper',
			vsBasePct: 56,
			targetState: 'flanders',
			unemployed: 99192,
			queuedElsewhere: ['gelre']
		});
	});

	it('asks for patience with the new explosives factory', () => {
		expect(find(advice, 'be-patient')).toMatchObject({
			building: 'explosives_factory',
			staffingPct: 3
		});
	});

	it('suggests lowering taxes last, as something to consider', () => {
		expect(advice.at(-1)).toMatchObject({ id: 'lower-tax', taxLevel: 'very_high' });
	});

	it('warns about debt, government inputs and construction capacity', () => {
		expect(ids(advice)).toEqual(
			expect.arrayContaining(['debt-high', 'government-inputs', 'more-construction'])
		);
		expect(find(advice, 'debt-high')?.level).toBe('warn');
	});

	it('does not flag barracks (not a producer) or the powerless trade unions', () => {
		expect(ids(advice)).not.toContain('losing-building');
		expect(ids(advice)).not.toContain('angry-ig');
	});

	it('ranks urgent, then warnings, then smart, patience and consider', () => {
		const order = ['urgent', 'warn', 'smart', 'patience', 'consider'];
		const ranks = advice.map((a) => order.indexOf(a.level));
		expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
	});
});

describe('adviseFor: other situations', () => {
	it('gives an urgent deficit advice instead of the debt warning', () => {
		const advice = adviseFor(belgium((s) => (s.economy.weeklyBalance = -4000)));
		expect(find(advice, 'deficit')).toMatchObject({ level: 'urgent', balance: -4000 });
		expect(ids(advice)).not.toContain('debt-high');
		expect(ids(advice)).not.toContain('lower-tax'); // no room in the budget
	});

	it('makes high debt urgent from 75% of the credit limit', () => {
		const advice = adviseFor(belgium((s) => (s.economy.debtPct = 80)));
		expect(find(advice, 'debt-high')?.level).toBe('urgent');
	});

	it('flags a staffed producer that loses money', () => {
		const advice = adviseFor(
			belgium((s) => {
				s.buildings.push({
					type: 'textile_mill',
					state: 'flanders',
					levels: 4,
					staffingPct: 90,
					profitPerWeek: -500,
					profitPerLevel: -125,
					inputShortagePct: 30
				});
			})
		);
		expect(find(advice, 'losing-building')).toMatchObject({
			building: 'textile_mill',
			loss: 500,
			inputShortagePct: 30
		});
	});

	it('warns about an angry, powerful interest group', () => {
		const advice = adviseFor(
			belgium((s) =>
				s.interestGroups.push({
					group: 'landowners',
					approval: -7,
					cloutPct: 15.1,
					influence: 'neutral'
				})
			)
		);
		expect(find(advice, 'angry-ig')).toMatchObject({ group: 'landowners', approval: -7 });
	});

	it('falls back to an unemployment advice when nothing scarce is produced', () => {
		const advice = adviseFor(belgium((s) => (s.prices = null)));
		expect(ids(advice)).not.toContain('expand-best');
		expect(find(advice, 'unemployment')).toMatchObject({
			targetState: 'flanders',
			stateUnemployed: 99192
		});
	});

	it('gives no construction advice when nothing is paused', () => {
		const advice = adviseFor(belgium((s) => (s.construction.paused = false)));
		expect(ids(advice)).not.toContain('construction-paused');
	});

	it('names what the private investors wait for', () => {
		const more = adviseFor(belgium()).find((a) => a.id === 'more-construction');
		expect(more && 'waitingFor' in more && more.waitingFor).toEqual([
			'company_headquarter',
			'financial_district',
			'paper_mill'
		]);
	});

	it('suggests new production methods, the most building levels first', () => {
		const pm = adviseFor(belgium()).find((a) => a.id === 'new-production-methods');
		expect(pm && 'methods' in pm && pm.methods.map((m) => m.name)).toEqual([
			'Bessemer Process',
			'Rifles'
		]);
		expect(ids(adviseFor(belgium((s) => (s.newProductionMethods = []))))).not.toContain(
			'new-production-methods'
		);
	});

	it('handles an empty country without crashing', () => {
		const empty = belgium((s) => {
			s.states = [];
			s.buildings = [];
			s.prices = null;
			s.interestGroups = [];
			s.construction = {
				paused: false,
				sectorLevels: 0,
				governmentQueue: [],
				privateQueueCount: 0
			};
			s.economy.investmentPool = 0;
			s.economy.debtPct = 0;
			s.economy.taxLevel = 'medium';
			s.newProductionMethods = [];
		});
		expect(adviseFor(empty)).toEqual([]);
	});
});

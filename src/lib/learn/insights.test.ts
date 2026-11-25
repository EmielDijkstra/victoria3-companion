import { describe, expect, it } from 'vitest';
import { belgium } from '../advice/fixtures';
import {
	budgetInsights,
	diplomacyInsights,
	lawInsights,
	peopleInsights,
	techInsights,
	tradeInsights
} from './insights';

const place = (key: string) => ({ gelre: 'Belgian Gelre' })[key] ?? key;

describe('tradeInsights', () => {
	it('names what the country earns on and what it buys abroad, without tables', () => {
		const [earn, abroad] = tradeInsights(belgium(), 'nl');
		expect(earn).toBe(
			'Je verdient aan de export van Tools en Paper: die maak je zelf veel. Houd die gebouwen bezet en winstgevend.'
		);
		expect(abroad).toContain('Tobacco koop je in het buitenland');
	});

	it('suggests a trade agreement when there is none', () => {
		const out = tradeInsights(
			belgium((s) => (s.trade!.partners = [])),
			'en'
		);
		expect(out.at(-1)).toContain('You have no trade agreements.');
	});
});

describe('lawInsights', () => {
	it('leaves out the law that already has its own advice', () => {
		expect(lawInsights(belgium(), 'nl', {}, 'Dedicated Police Force')[0]).toMatch(/^Censorship/);
	});

	it('explains who is for and against, with the description from the game', () => {
		const [first, second] = lawInsights(belgium(), 'nl', {
			dedicated_police: 'A police force with training.'
		});
		expect(first).toBe(
			'Dedicated Police Force in plaats van Local Police Force: Petite Bourgeoisie en Armed Forces zijn ervoor, niemand is ertegen. A police force with training.'
		);
		expect(second).toBe(
			'Censorship in plaats van Right of Assembly: Petite Bourgeoisie is ervoor, Intelligentsia ertegen.'
		);
	});
});

describe('peopleInsights', () => {
	it('explains the peasant share, the dearest basic good and low literacy', () => {
		const out = peopleInsights(
			belgium((s) => (s.population.literacyPct = 35)),
			'nl',
			place
		);
		expect(out[0]).toMatch(/^59% van je werkenden is Peasant\./);
		expect(out[1]).toBe(
			'Meat kost +40% boven de basisprijs. Daardoor wordt Basic Food duurder voor je arbeiders en boeren.'
		);
		expect(out.at(-1)).toContain('Geletterdheid is 35%');
	});

	it('warns about hunger only when food security is low', () => {
		expect(peopleInsights(belgium(), 'en', place).join(' ')).not.toContain('food');
		const hungry = peopleInsights(
			belgium((s) => (s.people!.foodSecurity[1].value = 0.3)),
			'en',
			place
		);
		expect(hungry.join(' ')).toContain('In Belgian Gelre people struggle to buy enough food.');
	});
});

describe('techInsights', () => {
	it('explains spreading technologies and other useful research, without the advised one', () => {
		expect(techInsights(belgium(), 'nl', 'Steam Donkey')).toEqual([
			'Psychiatry en Shell Gun verspreiden zich vanuit andere landen naar jou: daar krijg je vanzelf voortgang op.',
			'Ook nuttig: Steel-Frame Buildings geeft Covered Markets aan je Urban Center.',
			'Geletterdheid is 42%. Meer geletterdheid en Universities geven meer Innovation, dus sneller onderzoek.'
		]);
	});
});

describe('diplomacyInsights', () => {
	it('explains friends, guarantees and what a lobby wants', () => {
		expect(diplomacyInsights(belgium(), 'nl')).toEqual([
			'Je beste relaties heb je met France en Great Britain: logische partners voor handel en verdragen.',
			'Great Britain en Prussia garanderen je onafhankelijkheid. Wie jou bedreigt, krijgt met hen te maken.',
			'Armed Forces en Intelligentsia vormen een lobby voor France. Goede relaties en verdragen met France houden hen tevreden.'
		]);
	});
});

describe('budgetInsights', () => {
	it('explains construction, the largest fixed cost, a jump in the balance and tax options', () => {
		const out = budgetInsights(belgium(), 'nl');
		expect(out[0]).toBe(
			'Van je uitgaven gaat £11,3K per week naar bouwen. Zonder bouw is je saldo £13,8K: je vaste lasten zijn gedekt.'
		);
		expect(out[1]).toBe(
			'Je grootste vaste post is het leger: 48% van je vaste uitgaven (27 levels Barracks en 4 levels Army Logistics Center).'
		);
		expect(out[2]).toMatch(
			/^Ongeveer 3 weken geleden steeg je saldo in één week van −£3,8K naar £10,3K\./
		);
		expect(out.at(-1)).toContain('Consumption Tax heffen op Grain en Clothes');
	});

	it('says how long a deficit lasts', () => {
		const out = budgetInsights(
			belgium((s) => (s.budget!.weeksToCreditLimit = 80)),
			'en'
		);
		expect(out.join(' ')).toContain('reach your Credit Limit in about 80 weeks');
	});
});

// Knowledge sheet "Budget": where the money comes from and goes to, and how to find the real
// cause of a deficit, in our own words.
import type { KnowledgeSheet } from './sheet';

export const BUDGET: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Budget data of a 1.15 save (issue #53)',
			license: 'own work',
			source_url: 'docs/save-structuur.md'
		}
	],
	concepts: ['Treasury', 'Taxes', 'Minting', 'Credit Limit', 'Default', 'Interest', 'Wages'],
	points: {
		nl: [
			'Inkomsten komen uit belastingen (inkomsten, Poll Tax, consumptie, dividenden), Tariffs en Minting. Uitgaven gaan naar overheidsgebouwen, het leger, rente en bouwen.',
			'Bouwen is een investering: het kost geld zolang er gebouwd wordt. Kijk daarom naar je saldo zónder bouw. Is dat positief, dan is een tekort tijdens het bouwen geen ramp.',
			'Een tekort leen je bij: je schuld groeit en kost rente. Raak je je Credit Limit, dan kom je in Default.',
			'Vaste lasten zijn de lonen en goederen van je overheidsgebouwen en je leger. Dure grondstoffen, zoals Paper, maken die ongemerkt duurder.',
			'Zoek bij een slechter saldo eerst wat er veranderde: een nieuwe post of een duurder geworden post is meestal de echte oorzaak. Belasting verhogen is pas de laatste stap: je bevolking houdt dan minder over.'
		],
		en: [
			'Income comes from taxes (income, Poll Tax, consumption, dividends), Tariffs and Minting. Expenses go to government buildings, the army, interest and construction.',
			'Construction is an investment: it costs money while building goes on. So look at your balance without construction. If that is positive, a deficit while building is not a disaster.',
			'A deficit is borrowed: your debt grows and costs interest. Reach your Credit Limit and you go into Default.',
			'Fixed costs are the wages and goods of your government buildings and your army. Expensive inputs, such as Paper, quietly make them cost more.',
			'When the balance gets worse, first look for what changed: a new or more expensive item is usually the real cause. Raising taxes is the last step: your people keep less.'
		]
	}
};

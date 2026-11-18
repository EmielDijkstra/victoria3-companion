// Knowledge sheet "Population": Standard of Living, professions and qualifications, in our own words.
import type { KnowledgeSheet } from './sheet';

export const POPULATION: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Pop types and pop needs of the installed game (common/pop_types, common/pop_needs)',
			license: 'Paradox Interactive, own use',
			source_url: ''
		},
		{
			source: 'Spike S6: save data of a 1.15.1 game',
			license: 'own work',
			source_url: 'docs/spikes/s6-alle-gegevens.md'
		}
	],
	concepts: [
		'Standard of Living',
		'Pop',
		'Qualification',
		'Literacy',
		'Wage',
		'Subsistence',
		'Radical',
		'Migration'
	],
	points: {
		nl: [
			'Standard of Living hangt af van wat pops kunnen kopen: hun loon tegenover de prijzen van wat ze nodig hebben. Voor arbeiders en boeren tellen de basisbehoeften het zwaarst: Basic Food, Simple Clothing, Heating en Crude Items.',
			'Peasants leven grotendeels van wat ze zelf maken en verdienen weinig. Gebouwen die loon betalen trekken hen naar betere banen; zo groeien je economie en je belastinginkomsten.',
			'Geschoolde banen (zoals Clerks, Engineers en Machinists) vragen geletterdheid. Scholen en de Institution Schools verhogen die, maar dat gaat langzaam.',
			'Werklozen en mensen met een dalende Standard of Living worden sneller Radical. Werk en betaalbare basisbehoeften houden het land rustig.',
			'Food security laat zien of pops genoeg te eten kunnen kopen. Hoe lager, hoe groter de kans op honger en onrust.'
		],
		en: [
			'Standard of Living depends on what pops can buy: their income against the prices of what they need. For workers and peasants the basic needs weigh most: Basic Food, Simple Clothing, Heating and Crude Items.',
			'Peasants mostly live off what they make themselves and earn little. Buildings that pay wages draw them into better jobs; that grows your economy and your tax income.',
			'Skilled jobs (such as Clerks, Engineers and Machinists) need literacy. Schools and the Schools institution raise it, but slowly.',
			'Unemployed people and people whose Standard of Living drops turn Radical faster. Work and affordable basic needs keep the country calm.',
			'Food security shows whether pops can buy enough to eat. The lower it is, the higher the risk of hunger and unrest.'
		]
	}
};

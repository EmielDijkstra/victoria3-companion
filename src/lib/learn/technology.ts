// Knowledge sheet "Technology": how research works and what is smart, in our own words.
import type { KnowledgeSheet } from './sheet';

export const TECHNOLOGY: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Technologies and production methods of the installed game (common/technology)',
			license: 'Paradox Interactive, own use',
			source_url: ''
		},
		{
			source: 'Spike S6: save data of a 1.15.1 game',
			license: 'own work',
			source_url: 'docs/spikes/s6-alle-gegevens.md'
		}
	],
	concepts: ['Technology', 'Innovation', 'Technology Spread', 'Literacy', 'Production Method'],
	points: {
		nl: [
			'Je onderzoekt één technologie tegelijk. Hoe snel dat gaat, bepaalt je Innovation; die komt vooral van Universities en een geletterde bevolking.',
			'Technologieën die andere landen al kennen, verspreiden zich naar jou: je krijgt er vanzelf voortgang op.',
			'Kies onderzoek dat iets vrijspeelt voor gebouwen die je al veel hebt. Een betere Production Method op veel levels levert meer op dan een gebouw dat je nog niet hebt.',
			'Er zijn drie richtingen: Production (economie), Military (leger) en Society (wetten en instituties). Veel nieuwe wetten worden pas mogelijk na een Society-technologie.'
		],
		en: [
			'You research one technology at a time. Your Innovation decides how fast; it mostly comes from Universities and a literate population.',
			'Technologies that other countries already know spread to you: you gain progress on them by themselves.',
			'Pick research that unlocks something for buildings you already have a lot of. A better Production Method on many levels pays more than a building you do not have yet.',
			'There are three directions: Production (economy), Military (army) and Society (laws and institutions). Many new laws only become possible after a Society technology.'
		]
	}
};

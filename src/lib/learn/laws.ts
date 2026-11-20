// Knowledge sheet "Laws": how enacting laws works and what is smart, in our own words.
import type { KnowledgeSheet } from './sheet';

export const LAWS: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Laws and ideologies of the installed game (common/laws, common/ideologies)',
			license: 'Paradox Interactive, own use',
			source_url: ''
		},
		{
			source: 'Spike S6: save data of a 1.15.1 game',
			license: 'own work',
			source_url: 'docs/spikes/s6-alle-gegevens.md'
		}
	],
	concepts: ['Law', 'Interest Group', 'Legitimacy', 'Political Movement', 'Approval', 'Clout'],
	points: {
		nl: [
			'Je voert één wet tegelijk in, en dat duurt maanden. Onderweg kijkt het spel steeds of het doorgaat, vastloopt of slaagt.',
			'Wat Interest Groups van een wet vinden, komt uit hun ideologieën. Groepen in je regering en groepen met veel Clout tellen het zwaarst.',
			'Voer je een wet in waar een machtige groep tegen is, dan daalt haar Approval en kunnen er meer Radicals komen.',
			'Steun zegt wat haalbaar is, niet wat goed is. Kies wetten die je economie of je mensen helpen en waar genoeg steun voor is.',
			'Wil je een wet waar nu te weinig steun voor is? Haal dan eerst een Interest Group die ervoor is in je regering.'
		],
		en: [
			'You enact one law at a time, and it takes months. Along the way the game keeps checking whether it advances, stalls or passes.',
			'What interest groups think of a law comes from their ideologies. Groups in your government and groups with a lot of Clout weigh most.',
			'Enacting a law a powerful group opposes lowers its Approval and can create more Radicals.',
			'Support says what is feasible, not what is good. Pick laws that help your economy or your people and that have enough support.',
			'Want a law that lacks support now? First bring an interest group that favours it into your government.'
		]
	}
};

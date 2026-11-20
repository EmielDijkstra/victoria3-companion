// Knowledge sheet "Diplomacy": relations, treaties, lobbies and rivals, in our own words.
import type { KnowledgeSheet } from './sheet';

export const DIPLOMACY: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Spike S6: save data of a 1.15.1 game (relations, pacts, treaties, lobbies)',
			license: 'own work',
			source_url: 'docs/spikes/s6-alle-gegevens.md'
		}
	],
	concepts: ['Relations', 'Influence', 'Treaty', 'Political Lobby', 'Rivalry', 'Diplomatic Play'],
	points: {
		nl: [
			'Relaties lopen van −100 tot +100. Met Improve Relations verbeter je ze langzaam; dat kost Influence.',
			'Veel verdragen en pacten, zoals handelsverdragen en allianties, vragen eerst goede relaties.',
			'Een lobby is een groep Interest Groups met een mening over een ander land. Doe je wat ze willen, dan stijgt hun Approval; negeer je ze, dan daalt die.',
			'Een garantie van een groot land beschermt je: wie jou bedreigt, krijgt met hen te maken.',
			'Een rivaal kan separatisme in jouw land steunen. Tevreden minderheden maken je daar minder kwetsbaar voor.'
		],
		en: [
			'Relations run from −100 to +100. Improve Relations raises them slowly; it costs Influence.',
			'Many treaties and pacts, such as trade agreements and alliances, need good relations first.',
			'A lobby is a group of interest groups with an opinion about another country. Do what they want and their Approval rises; ignore them and it drops.',
			'A guarantee from a great power protects you: whoever threatens you has to deal with them.',
			'A rival may support separatism in your country. Content minorities make you less vulnerable to it.'
		]
	}
};

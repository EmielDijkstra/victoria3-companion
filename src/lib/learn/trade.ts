// Knowledge sheet "Trade": how trade works and what is smart, in our own words. Checked per game
// version, like the how-to steps: only Emiel sets `checked`. Game concepts are explained by the
// game itself (concept cards); this sheet adds the strategy.
import type { Locale } from '../i18n/messages';

export interface KnowledgeSheet {
	/** Game version (major.minor) the sheet was written for */
	version: string;
	/** Version in which Emiel checked it in the game; null = not yet */
	checked: string | null;
	sources: { source: string; license: string; source_url: string }[];
	/** Concept names from the game that belong to this topic (shown as clickable chips) */
	concepts: string[];
	points: Record<Locale, string[]>;
}

export const TRADE: KnowledgeSheet = {
	version: '1.15',
	checked: null,
	sources: [
		{
			source: 'Concepts and tutorial of the installed game (read at runtime, not copied)',
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
		'World Market',
		'World Market Hub',
		'Trade Capacity',
		'Tariffs',
		'Subventions',
		'Market Access',
		'Trade'
	],
	points: {
		nl: [
			'Handel gaat vanzelf via de World Market. Je Trade Centers kopen en verkopen goederen waar het prijsverschil het grootst is; jij bouwt ze niet per route.',
			'Hoeveel er kan, bepaalt je Trade Capacity. Die komt van Trade Center-levels in je staten. Is hij vol, dan blijft winstgevende handel liggen.',
			'Tariffs maken import of export van een goed duurder; je verdient eraan. Subventions maken het goedkoper; je betaalt erbij. Subsidieer alleen wat je echt tekortkomt.',
			'Exporteer wat je veel en goedkoop maakt. Importeer grondstoffen die je niet hebt, en maak er zelf duurdere goederen van.',
			'Een handelsverdrag (trade privilege) maakt handel met dat land voordeliger.'
		],
		en: [
			'Trade happens by itself through the World Market. Your Trade Centers buy and sell goods where the price difference is largest; you do not build routes.',
			'How much fits depends on your Trade Capacity, which comes from Trade Center levels in your states. When it is full, profitable trade is left undone.',
			'Tariffs make importing or exporting a good more expensive; you earn from them. Subventions make it cheaper; you pay for them. Only subsidise what you are really short of.',
			'Export what you make a lot of, cheaply. Import raw materials you lack, and turn them into more valuable goods yourself.',
			'A trade agreement (trade privilege) makes trade with that country more favourable.'
		]
	}
};

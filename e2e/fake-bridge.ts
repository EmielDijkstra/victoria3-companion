// A fake window.overlayBridge for browser tests: returns a fixed status with a test snapshot,
// instead of the Electron main process.
import type { Page } from '@playwright/test';
import { belgium } from '../src/lib/advice/fixtures';
import type { GameKnowledge } from '../src/lib/knowledge';
import type { AppStatus } from '../src/lib/status';

export function testStatus(): AppStatus {
	return {
		paths: {
			userData: {
				path: 'C:\\Users\\test\\Documents\\Paradox Interactive\\Victoria 3',
				source: 'auto'
			},
			game: { path: 'C:\\Steam\\steamapps\\common\\Victoria 3', source: 'auto' },
			rakaly: { path: 'C:\\tools\\rakaly.exe', source: 'auto' }
		},
		installedVersion: '1.15.1',
		lastPlayed: null,
		save: {
			state: 'ready',
			summary: {
				country: 'Belgium',
				gameDate: '1848.9.16.6',
				gameVersion: '1.15.1',
				ironman: false,
				achievementsAllowed: true,
				autosaveInterval: null,
				playthroughId: 'test',
				fileName: 'autosave.v3',
				readAt: '2026-11-17T12:00:00Z',
				durationMs: 2600
			},
			snapshot: belgium()
		}
	};
}

/** Made-up texts in the game's style (no game text in this repository). */
export function testKnowledge(): GameKnowledge {
	return {
		version: '1.15.1',
		concepts: {
			'Investment Pool': {
				key: 'concept_investment_pool',
				name: 'Investment Pool',
				description: 'Test: money that private owners use to build. Spent on Construction.'
			},
			'Trade Capacity': {
				key: 'concept_trade_capacity',
				name: 'Trade Capacity',
				description: 'Test: how much a state can trade.'
			},
			Construction: {
				key: 'concept_construction',
				name: 'Construction',
				description: 'Test: how fast buildings are built.'
			}
		},
		laws: {
			dedicated_police: 'Test: a police force with training.',
			censorship: 'Test: no free press.'
		},
		journal: {
			je_tutorial_grow_gdp: {
				type: 'je_tutorial_grow_gdp',
				name: 'Grow GDP',
				how: ['Test step one: expand productive buildings.', 'Test step two: trade.'],
				why: ['Test reason: a bigger economy.']
			}
		}
	};
}

/**
 * `advisor`: what the fake AI advisor does. 'answer' streams a fixed answer in three pieces;
 * an error code makes it fail with that code. The sent messages are kept in
 * `window.__advisorMessages` so a test can check what would go to the AI.
 */
export async function installFakeBridge(
	page: Page,
	options: { locale?: 'nl' | 'en'; advisor?: 'answer' | 'no-key' | 'busy' } = {}
) {
	await page.addInitScript(
		({ status, locale, knowledge, advisor }) => {
			if (locale) localStorage.setItem('vic3-companion.locale', locale);
			const noop = () => {};
			type Listener = Parameters<NonNullable<typeof window.overlayBridge>['onAdvisor']>[0];
			let listener: Listener = noop;
			const sent: unknown[] = [];
			(window as unknown as { __advisorMessages: unknown[] }).__advisorMessages = sent;
			window.overlayBridge = {
				askAdvisor: (id, messages) => {
					sent.push(messages);
					if (advisor !== 'answer') {
						setTimeout(() => listener({ id, type: 'error', code: advisor }), 50);
						return;
					}
					['Test answer: your ', '**Construction** ', 'is paused.'].forEach((text, i) =>
						setTimeout(() => listener({ id, type: 'text', text }), 50 * (i + 1))
					);
					setTimeout(() => listener({ id, type: 'done' }), 250);
				},
				cancelAdvisor: noop,
				onAdvisor: (callback) => (listener = callback),
				releaseFocus: noop,
				setInteractive: noop,
				resize: noop,
				moveBy: noop,
				dragEnd: noop,
				hide: noop,
				onState: noop,
				getStatus: async () => status,
				onStatus: noop,
				choosePath: async () => status,
				resetPath: async () => status,
				getKnowledge: async () => knowledge
			};
		},
		{
			status: testStatus(),
			locale: options.locale,
			knowledge: testKnowledge(),
			advisor: options.advisor ?? 'answer'
		}
	);
}

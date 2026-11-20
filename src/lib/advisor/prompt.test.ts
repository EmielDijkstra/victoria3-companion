import { describe, expect, it } from 'vitest';
import { belgium } from '../advice/fixtures';
import { answerParagraphs } from '../overlay/advisor.svelte';
import { buildAdvisorMessages, compactFacts, conceptsFor, systemPrompt } from './prompt';

const subject = {
	kind: 'advice' as const,
	title: 'Zet je bouwlijst weer aan',
	why: 'Alle Construction staat op pauze.',
	how: ['Open het Construction-scherm.']
};

describe('buildAdvisorMessages', () => {
	const base = {
		subject,
		facts: { date: '1850.1.1' },
		gameVersion: '1.15.1',
		locale: 'nl' as const,
		concepts: [
			{ key: 'concept_construction', name: 'Construction', description: 'How fast\nyou build.' }
		],
		history: [],
		question: 'Waarom is dit belangrijk?'
	};

	it('sends the sources once, with the first question', () => {
		const [system, user] = buildAdvisorMessages(base);
		expect(system.role).toBe('system');
		expect(system.content).toContain('Answer in Dutch');
		expect(system.content).toContain('game version 1.15.1');
		expect(user.content).toContain('ADVICE: Zet je bouwlijst weer aan');
		expect(user.content).toContain('1. Open het Construction-scherm.');
		expect(user.content).toContain('- Construction: How fast you build.');
		expect(user.content).toContain('FACTS from the save (JSON):\n{"date":"1850.1.1"}');
		expect(user.content).toMatch(/QUESTION: Waarom is dit belangrijk\?$/);
	});

	it('keeps the conversation: later questions do not repeat the sources', () => {
		const messages = buildAdvisorMessages({
			...base,
			history: [
				{ role: 'user', content: 'Waarom?' },
				{ role: 'assistant', content: 'Omdat je betaalt voor stilstand.' }
			],
			question: 'En wat als ik het niet doe?'
		});
		expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
		expect(messages[1].content).toContain('SOURCES');
		expect(messages[3].content).toBe('En wat als ik het niet doe?');
	});

	it('answers in English when the overlay is English', () => {
		expect(systemPrompt('en', '1.15.1')).toContain('Answer in English');
	});
});

describe('compactFacts and conceptsFor', () => {
	it('cuts long lists and keeps names as the game shows them', () => {
		const facts = compactFacts(belgium());
		expect((facts.bestBuildings as unknown[]).length).toBeLessThanOrEqual(8);
		expect(JSON.stringify(facts.states)).toContain('Belgian Gelre');
		expect(facts.trade).toBeTruthy();
		expect(facts.diplomacy).toBeTruthy();
	});

	it('picks concepts that appear in the subject, longest names first', () => {
		const concepts = {
			Construction: { key: 'a', name: 'Construction', description: '…' },
			'Construction Sector': { key: 'b', name: 'Construction Sector', description: '…' },
			Trade: { key: 'c', name: 'Trade', description: '…' }
		};
		expect(
			conceptsFor({ ...subject, why: 'Bouw een Construction Sector.' }, concepts).map((c) => c.name)
		).toEqual(['Construction Sector', 'Construction']);
	});
});

describe('answerParagraphs', () => {
	it('turns light Markdown into plain paragraphs', () => {
		expect(
			answerParagraphs('Je **Construction** staat stil.\n\n* Open het scherm\n* Klik Resume')
		).toEqual(['Je Construction staat stil.', '• Open het scherm\n• Klik Resume']);
	});
});

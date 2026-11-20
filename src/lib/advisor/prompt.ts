// What the AI advisor gets when the player asks a follow-up question: the subject (an advice or a
// Learn topic), compact facts from the save, the game version, the language, our knowledge sheet
// and the game's own concept texts. The model may only build on these sources (spike S5).
import type { Locale } from '../i18n/messages';
import type { ConceptText } from '../knowledge';
import type { Snapshot } from '../snapshot';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** What the conversation is about. */
export type AdvisorSubject =
	| { kind: 'advice'; title: string; why: string; caveat?: string; how: string[] }
	| { kind: 'topic'; title: string; sheet: string[]; insights: string[] };

export interface AdvisorRequest {
	subject: AdvisorSubject;
	facts: Record<string, unknown>;
	gameVersion: string;
	locale: Locale;
	/** Concept texts from the installed game that belong to the subject */
	concepts: ConceptText[];
	/** Earlier questions and answers in this conversation */
	history: ChatMessage[];
	question: string;
}

const LANGUAGE: Record<Locale, string> = { nl: 'Dutch', en: 'English' };

export function systemPrompt(locale: Locale, gameVersion: string): string {
	return [
		'You are an experienced Victoria 3 player coaching a newer player through a small overlay next to the game.',
		`Answer in ${LANGUAGE[locale]}. Keep game terms in English, exactly as the game shows them (Construction, Interest Groups, Standard of Living, Production Methods …).`,
		`The player runs game version ${gameVersion}. Screens and mechanics differ between versions: describe them for this version, and say so when you are not sure a screen or button exists there.`,
		"Build only on the SOURCES you are given: the subject, the FACTS from the save, our knowledge sheet and the game's own concept texts. Never invent numbers; if something is not in the sources, say that.",
		'Be short and concrete: at most about 150 words. Start with the answer. Use plain sentences; a short numbered list is fine. No headings, no introduction.',
		'Explain why, not only what: the player wants to understand the game.'
	].join('\n');
}

function subjectBlock(subject: AdvisorSubject): string {
	if (subject.kind === 'advice') {
		return [
			`ADVICE: ${subject.title}`,
			`Why: ${subject.why}`,
			subject.caveat ? `Mind: ${subject.caveat}` : '',
			subject.how.length
				? `Steps in the game:\n${subject.how.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
				: ''
		]
			.filter(Boolean)
			.join('\n');
	}
	return [
		`TOPIC: ${subject.title}`,
		`Our knowledge sheet (not yet checked in the game):\n${subject.sheet.map((p) => `- ${p}`).join('\n')}`,
		subject.insights.length
			? `What stands out in this country:\n${subject.insights.map((p) => `- ${p}`).join('\n')}`
			: ''
	]
		.filter(Boolean)
		.join('\n');
}

/** The messages for the chat endpoint: system prompt, the sources once, then the conversation. */
export function buildAdvisorMessages(req: AdvisorRequest): ChatMessage[] {
	const sources = [
		'SOURCES',
		subjectBlock(req.subject),
		req.concepts.length
			? `Concepts, explained by the game itself:\n${req.concepts.map((c) => `- ${c.name}: ${c.description.replace(/\s+/g, ' ')}`).join('\n')}`
			: '',
		`FACTS from the save (JSON):\n${JSON.stringify(req.facts)}`
	]
		.filter(Boolean)
		.join('\n\n');
	const [first, ...rest] = req.history;
	// The sources go with the first question; later questions only add to the conversation
	return [
		{ role: 'system', content: systemPrompt(req.locale, req.gameVersion) },
		...(first
			? [{ role: 'user' as const, content: `${sources}\n\nQUESTION: ${first.content}` }, ...rest]
			: []),
		{
			role: 'user',
			content: first ? req.question : `${sources}\n\nQUESTION: ${req.question}`
		}
	];
}

/**
 * Compact facts from the snapshot: enough for the advisor, small enough to send with every
 * conversation. Long lists are cut to their most relevant entries.
 */
export function compactFacts(s: Snapshot): Record<string, unknown> {
	return {
		date: s.date,
		country: s.country.name,
		economy: s.economy,
		population: s.population,
		construction: {
			paused: s.construction.paused,
			sectorLevels: s.construction.sectorLevels,
			governmentQueue: s.construction.governmentQueue.length,
			privateQueue: s.construction.privateQueueCount
		},
		states: s.states.map((st) => ({ ...st, state: s.stateNames[st.state] ?? st.state })),
		bestBuildings: s.buildings.slice(0, 8),
		losingBuildings: s.buildings.filter((b) => b.profitPerWeek < 0).slice(0, 5),
		scarceGoods: s.prices?.slice(0, 6) ?? null,
		cheapGoods: s.prices?.slice(-4) ?? null,
		interestGroups: s.interestGroups,
		activeLaws: s.activeLaws,
		trade: s.trade && {
			states: s.trade.states,
			imports: s.trade.goods.filter((g) => g.net < 0).slice(0, 6),
			exports: s.trade.goods.filter((g) => g.net > 0).slice(-6),
			partners: s.trade.partners
		},
		lawOptions: s.laws
			?.flatMap((g) =>
				g.options.slice(0, 2).map((o) => ({
					group: g.name,
					current: g.activeName,
					law: o.name,
					support: o.support,
					currentSupport: g.activeSupport
				}))
			)
			.sort((a, b) => b.support - b.currentSupport - (a.support - a.currentSupport))
			.slice(0, 8),
		people: s.people && {
			professions: s.people.professions.slice(0, 6),
			basicNeeds: s.people.needs,
			foodSecurity: s.people.foodSecurity
		},
		technology: s.technology,
		diplomacy: s.diplomacy,
		journal: s.journal?.filter((j) => j.goal > 0).slice(0, 5)
	};
}

/** Concepts whose names appear in the subject, at most `max`. */
export function conceptsFor(
	subject: AdvisorSubject,
	concepts: Readonly<Record<string, ConceptText>>,
	max = 8
): ConceptText[] {
	const text = JSON.stringify(subject);
	return Object.values(concepts)
		.filter((c) => c.name.length >= 4 && text.includes(c.name))
		.sort((a, b) => b.name.length - a.name.length)
		.slice(0, max);
}

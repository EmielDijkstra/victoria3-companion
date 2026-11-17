import { describe, expect, it } from 'vitest';
import {
	buildConcepts,
	buildJournal,
	cleanGameText,
	parseJournalLessons,
	parseLessonChains
} from './game-knowledge';

// Made-up lines in the game's format (no text from the game itself in this repository).
const loc = {
	concept_harbour: 'Harbour',
	concept_harbour_desc: 'A [concept_harbour] holds $concept_boats|q$ near a [concept_town].',
	concept_boats: 'Boats',
	concept_boats_desc: "Boats sail. See [Concept('concept_harbour','$concept_harbour$s')].",
	concept_town: 'Town',
	building_dock: 'Dock',
	je_test_build: 'Build a $concept_harbour$',
	lesson_build_how_1_desc:
		"Build a #b [GetBuildingType('building_dock').GetName]#! in [GetTutorialJournalEntry.GetTarget.GetBuilding.GetState.GetName].\\n\\nIt costs @money!100.",
	lesson_build_how_2_desc: "Then wait[Nbsp]a bit [GetDefine('NX','Y')|0].",
	lesson_build_why_1_desc: '#v Boats#! are good.'
};

describe('cleanGameText', () => {
	it('resolves concepts, references and labels', () => {
		expect(cleanGameText(loc.concept_harbour_desc, loc)).toBe('A Harbour holds Boats near a Town.');
		expect(cleanGameText(loc.concept_boats_desc, loc)).toBe('Boats sail. See Harbours.');
	});

	it('resolves names, drops styles and unknown calls, keeps paragraphs', () => {
		expect(cleanGameText(loc.lesson_build_how_1_desc, loc)).toBe(
			'Build a Dock in that state.\n\nIt costs £100.'
		);
		expect(cleanGameText(loc.lesson_build_how_2_desc, loc)).toBe('Then wait a bit.');
		expect(cleanGameText(loc.lesson_build_why_1_desc, loc)).toBe('Boats are good.');
	});

	it('uses the plain key of an in-game link', () => {
		expect(
			cleanGameText(
				"Usually [SelectLocalization(GetPlayer.IsValid,'DOCK_LINK','building_dock')]s.",
				loc
			)
		).toBe('Usually Docks.');
	});

	it('humanizes a key that is missing from the localization', () => {
		expect(cleanGameText('A [concept_world_market_hub].', {})).toBe('A World Market Hub.');
	});
});

describe('journal entries and lessons', () => {
	const journal = `\uFEFFje_test_build = {
	how_tutorial = lesson_build_how
	why_tutorial = lesson_build_why
	group = je_group_tutorial
}
je_without_lesson = {
	group = je_group_x
}`;
	const lessons = `lesson_build_how = {
	lesson_build_how_1 = {
		text = "lesson_build_how_1_desc"
	}
	lesson_build_how_2 = {
		text = "lesson_build_how_2_desc"
	}
}
lesson_build_why = {
	lesson_build_why_1 = {
		text = "lesson_build_why_1_desc"
	}
}`;

	it('links an entry to its how and why lessons', () => {
		expect(parseJournalLessons(journal)).toEqual({
			je_test_build: { how: 'lesson_build_how', why: 'lesson_build_why' },
			je_without_lesson: {}
		});
		expect(parseLessonChains(lessons)).toEqual({
			lesson_build_how: ['lesson_build_how_1_desc', 'lesson_build_how_2_desc'],
			lesson_build_why: ['lesson_build_why_1_desc']
		});
	});

	it('builds the texts per entry, skipping entries without a lesson or name', () => {
		const result = buildJournal(parseJournalLessons(journal), parseLessonChains(lessons), loc);
		expect(Object.keys(result)).toEqual(['je_test_build']);
		expect(result.je_test_build).toEqual({
			type: 'je_test_build',
			name: 'Build a Harbour',
			how: ['Build a Dock in that state.\n\nIt costs £100.', 'Then wait a bit.'],
			why: ['Boats are good.']
		});
	});
});

describe('buildConcepts', () => {
	it('indexes concepts with a description by display name', () => {
		const concepts = buildConcepts(loc);
		expect(Object.keys(concepts).sort()).toEqual(['Boats', 'Harbour']);
		expect(concepts.Harbour).toEqual({
			key: 'concept_harbour',
			name: 'Harbour',
			description: 'A Harbour holds Boats near a Town.'
		});
	});
});

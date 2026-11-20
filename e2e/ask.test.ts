import { expect, test } from '@playwright/test';
import { installFakeBridge } from './fake-bridge';

// Main flow: ask the AI advisor more about an advice. The answer streams in and is labelled as
// an AI answer; the question goes out with the advice, the facts and the instructions.

test('ask more about an advice: streamed answer with an AI label', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();

	const first = page.locator('[data-advice="construction-paused"]');
	await first.locator('[data-ask-open]').click();
	// Opening the conversation sends nothing: only a question the player picks or types does
	const before = await page.evaluate(
		() => (window as unknown as { __advisorMessages: unknown[] }).__advisorMessages.length
	);
	expect(before).toBe(0);
	await first.getByRole('button', { name: 'Waarom is dit belangrijk?' }).click();

	const answer = first.locator('[data-ask-answer]');
	await expect(answer).toContainText('Test answer: your Construction is paused.');
	await expect(first).toContainText('AI-antwoord (Gemini), niet gecontroleerd');

	// What went to the advisor: instructions, the advice, the facts and the question
	const sent = await page.evaluate(
		() =>
			(window as unknown as { __advisorMessages: { role: string; content: string }[][] })
				.__advisorMessages
	);
	expect(sent).toHaveLength(1);
	const [system, user] = sent[0];
	expect(system.content).toContain('Answer in Dutch');
	expect(user.content).toContain('ADVICE: Zet je bouwlijst weer aan');
	expect(user.content).toContain('FACTS from the save');
	expect(user.content).toContain('QUESTION: Waarom is dit belangrijk?');

	// A follow-up question of your own
	await first.locator('input').fill('Hoeveel kost dat per week?');
	await first.locator('[data-ask-send]').click();
	await expect(answer).toHaveCount(2);
});

test('without a key the advisor says so, and the advice stays', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl', advisor: 'no-key' });
	await page.goto('/');
	await page.locator('[data-tip]').click();
	const first = page.locator('[data-advice="construction-paused"]');
	await first.locator('[data-ask-open]').click();
	await first.getByRole('button', { name: 'Wat als ik het niet doe?' }).click();
	await expect(first.locator('[data-ask-error="no-key"]')).toContainText('GEMINI_API_KEY');
	await expect(first).toContainText('Zet je bouwlijst weer aan');
});

test('ask about a Learn topic as a whole', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();
	await page.locator('[data-learn-toggle]').click();
	const topicAsk = page.locator('[data-topic-ask]');
	await topicAsk.locator('[data-ask-open]').click();
	await topicAsk.getByRole('button', { name: 'Wat doe ik als eerste?' }).click();
	await expect(topicAsk.locator('[data-ask-answer]')).toContainText('Test answer');
	const sent = await page.evaluate(
		() => (window as unknown as { __advisorMessages: { content: string }[][] }).__advisorMessages
	);
	expect(sent[0][1].content).toContain('TOPIC: Handel');
});

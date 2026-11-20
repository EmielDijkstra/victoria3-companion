import { expect, test } from '@playwright/test';
import { installFakeBridge } from './fake-bridge';

// Main flow: the game's own goals with the official steps, and a game term that opens its
// explanation from the installed game.

test('shows the goals of the game with progress and the official steps', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();

	await expect(page.getByText('Doelen van het spel')).toBeVisible();
	const goal = page.locator('[data-goal="je_tutorial_grow_gdp"]');
	await expect(goal).toContainText('Grow GDP');
	await expect(goal.locator('[data-goal-progress]')).toContainText('80%');

	await goal.getByText('Hoe doe ik dat?').click();
	await expect(goal).toContainText('Test step one: expand productive buildings.');
	await expect(goal).toContainText('versie 1.15.1');

	// A journal entry the game has no texts for is not shown
	await expect(page.locator('[data-goal="je_without_texts"]')).toHaveCount(0);
});

test('a game term opens its explanation from the game', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();

	await page.locator('[data-concept="Investment Pool"]').first().click();
	const card = page.locator('[data-concept-card]');
	await expect(card).toContainText('Investment Pool');
	await expect(card).toContainText('Test: money that private owners use to build.');

	// Terms inside the explanation are clickable too
	await card.locator('[data-concept="Construction"]').click();
	await expect(card).toContainText('Test: how fast buildings are built.');

	await page.keyboard.press('Escape');
	await expect(card).toHaveCount(0);
});

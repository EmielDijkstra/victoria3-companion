import { expect, test } from '@playwright/test';
import { installFakeBridge } from './fake-bridge';

// Main flow: Learn. Per topic the game's concepts, our explanation, what stands out in the
// player's country (sentences, no tables: the game shows the figures) and the advice of the topic.

test.beforeEach(async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();
	await page.locator('[data-learn-toggle]').click();
});

test('trade: concepts, what stands out and the trade advice', async ({ page }) => {
	await expect(page.locator('[data-learn-topic="trade"]')).toHaveText('Handel');
	// Only the trade advice, not the whole list
	await expect(page.locator('[data-advice="construction-paused"]')).toHaveCount(0);
	await expect(page.locator('[data-advice="trade-capacity-full"]')).toBeVisible();

	await page.locator('button.chip[data-concept="Trade Capacity"]').click();
	await expect(page.locator('[data-concept-card]')).toContainText(
		'Test: how much a state can trade.'
	);
	await page.keyboard.press('Escape');

	await expect(page.getByText('Wat valt op bij Belgium?')).toBeVisible();
	await expect(page.locator('[data-insights]')).toContainText(
		'Je verdient aan de export van Tools en Paper'
	);
	await expect(page.getByText('nog niet in het spel gecontroleerd').first()).toBeVisible();
	// No tables of figures
	await expect(page.locator('table')).toHaveCount(0);

	await page.locator('[data-back]').click();
	await expect(page.locator('[data-advice="construction-paused"]')).toBeVisible();
});

test('laws: feasible laws explained with who is for and against', async ({ page }) => {
	await page.locator('[data-topic="laws"]').click();
	await expect(page.locator('[data-learn-topic="laws"]')).toHaveText('Wetten');
	const insights = page.locator('[data-insights]');
	// The advised law is not repeated; the next one is explained, with its description from the game
	await expect(insights).not.toContainText('Dedicated Police Force');
	await expect(insights).toContainText(
		'Censorship in plaats van Right of Assembly: Petite Bourgeoisie is ervoor, Intelligentsia ertegen. Test: no free press.'
	);
	await expect(page.locator('[data-advice="law-with-support"]')).toBeVisible();
});

test('population: what stands out and the population advice', async ({ page }) => {
	await page.locator('[data-topic="population"]').click();
	await expect(page.locator('[data-learn-topic="population"]')).toHaveText('Bevolking');
	await expect(page.locator('[data-insights]')).toContainText('59% van je werkenden is Peasant');
	await expect(page.locator('[data-advice="dear-basic-needs"]')).toBeVisible();
	await expect(page.locator('[data-advice="understaffed"]')).toBeVisible();
	await expect(page.locator('table')).toHaveCount(0);
});

test('technology: research that helps your own buildings', async ({ page }) => {
	await page.locator('[data-topic="technology"]').click();
	await expect(page.locator('[data-learn-topic="technology"]')).toHaveText('Technologie');
	await expect(page.locator('[data-insights]')).toContainText(
		'Psychiatry en Shell Gun verspreiden zich vanuit andere landen naar jou'
	);
	await expect(page.locator('[data-advice="research-suggestion"]')).toContainText(
		'Overweeg Steam Donkey als volgend onderzoek'
	);
});

test('diplomacy: friends, lobbies and the separatism warning', async ({ page }) => {
	await page.locator('[data-topic="diplomacy"]').click();
	await expect(page.locator('[data-learn-topic="diplomacy"]')).toHaveText('Diplomatie');
	await expect(page.locator('[data-insights]')).toContainText(
		'Armed Forces en Intelligentsia vormen een lobby voor France'
	);
	await expect(page.locator('[data-advice="separatism-support"]')).toContainText(
		'Netherlands steunt separatisme in jouw land'
	);
});

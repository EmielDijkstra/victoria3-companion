import { expect, test } from '@playwright/test';
import { installFakeBridge } from './fake-bridge';

// Main flow: Learn → Trade. The game's concepts, our explanation, the player's trade figures and
// the trade advice.

test('learn about trade, applied to your own country', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();

	await page.locator('[data-learn-toggle]').click();
	await expect(page.locator('[data-learn-topic="trade"]')).toHaveText('Handel');
	// The advice list is not on this page, apart from the trade advice
	await expect(page.locator('[data-advice="construction-paused"]')).toHaveCount(0);
	await expect(page.locator('[data-advice="trade-capacity-full"]')).toBeVisible();

	// Concepts from the game
	await page.locator('button.chip[data-concept="Trade Capacity"]').click();
	await expect(page.locator('[data-concept-card]')).toContainText(
		'Test: how much a state can trade.'
	);
	await page.keyboard.press('Escape');

	// Your country
	await expect(page.getByText('Wat betekent dit voor Belgium?')).toBeVisible();
	await expect(page.locator('[data-trade-capacity="flanders"]')).toContainText('123/123');
	await expect(page.locator('table.goods')).toContainText('Tobacco');
	await expect(page.locator('table.goods')).toContainText('Tools');
	await expect(page.getByText('nog niet in het spel gecontroleerd').first()).toBeVisible();

	await page.locator('[data-back]').click();
	await expect(page.locator('[data-advice="construction-paused"]')).toBeVisible();
});

test('learn about laws: feasible laws with who is for and against', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();
	await page.locator('[data-learn-toggle]').click();
	await page.locator('[data-topic="laws"]').click();

	await expect(page.locator('[data-learn-topic="laws"]')).toHaveText('Wetten');
	const law = page.locator('[data-law="dedicated_police"]');
	await expect(law).toContainText('Dedicated Police Force');
	await expect(law).toContainText('Petite Bourgeoisie ++ (25,5%)');
	// Description from the game files
	await expect(law).toContainText('Test: a police force with training.');
	await expect(page.locator('[data-advice="law-with-support"]')).toBeVisible();
});

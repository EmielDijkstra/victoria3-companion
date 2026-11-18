import { expect, test } from '@playwright/test';
import { installFakeBridge } from './fake-bridge';

// Main flow: a save has been read → the tip shows the most important advice → open the panel →
// read the advice and the steps in the game → switch language.

test('the tip shows the most important advice and opens into the full list', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');

	const tip = page.locator('[data-tip]');
	await expect(tip).toContainText('Urgent');
	await expect(tip).toContainText('Zet je bouwlijst weer aan');
	await expect(tip.locator('.badge')).toHaveText('11');

	await tip.click();
	const items = page.locator('[data-advice]');
	await expect(items).toHaveCount(11);
	await expect(items.first()).toHaveAttribute('data-advice', 'construction-paused');

	const paper = page.locator('[data-advice="expand-best"]');
	await expect(paper).toContainText('Breid je Paper Mill uit in Flanders');
	await expect(paper).toContainText('99.192');
	await expect(paper).toContainText('Gelre');

	// Steps in the game, folded away until asked for
	await paper.getByText('Hoe doe ik dat?').click();
	await expect(paper).toContainText('open de tab Buildings');
	// The steps say for which game version they are meant
	await expect(paper.locator('[data-how-version]')).toContainText('versie 1.15');

	// Last: something to consider
	await expect(items.last()).toHaveAttribute('data-advice', 'lower-tax');

	// Game facts and folders are not in the advice view, but under Settings
	await expect(page.getByText('Spelinstallatie')).toHaveCount(0);
	await page.locator('[data-settings-toggle]').click();
	await expect(page.getByText('Spelinstallatie')).toBeVisible();
	await expect(page.locator('[data-advice]')).toHaveCount(0);
	await page.getByText('← Terug naar advies').click();
	await expect(page.locator('[data-advice]')).toHaveCount(11);
});

test('switching to English translates the advice and the tip', async ({ page }) => {
	await installFakeBridge(page, { locale: 'nl' });
	await page.goto('/');
	await page.locator('[data-tip]').click();

	// Language is in the settings view
	await page.locator('[data-settings-toggle]').click();
	await page.getByRole('button', { name: 'EN', exact: true }).click();
	await page.locator('[data-settings-toggle]').click();
	await expect(page.locator('[data-advice="expand-best"]')).toContainText(
		'Expand your Paper Mill in Flanders'
	);
	await expect(page.locator('[data-advice="expand-best"]')).toContainText('99,192');

	// Collapse: the tip is now English too
	await page.getByTitle('Collapse to tip').click();
	await expect(page.locator('[data-tip]')).toContainText('Resume your construction queue');
});

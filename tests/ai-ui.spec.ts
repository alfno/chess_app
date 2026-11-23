import { test, expect } from '@playwright/test';

/**
 * End-to-end AI tests through the real Web Worker (dev server / browser).
 * Covers: worker integration, thinking indicator, side choice, clean stop on undo.
 */
test.describe('AI opponent (Web Worker)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .square');
  });

  test('AI (White, level 2) finds Ra8# when human plays Black', async ({ page }) => {
    // Human plays Black; board should flip automatically (top-left becomes h1).
    await page.selectOption('#side-select', 'black');
    await expect(page.locator('#board .square').first()).toHaveAttribute('aria-label', 'h1');

    // Enable AI level 2 (Sedang).
    await page.selectOption('#mode-select', 'ai-2');

    // Load the back-rank mate-in-one position (White to move).
    await page.locator('#fen-input').fill('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    await page.click('#btn-load-fen');

    // The AI (White) should now think and play Ra8#.
    await expect(page.locator('.move-white').first()).toContainText('Ra8#', { timeout: 10_000 });
    await expect(page.locator('#game-result')).toBeVisible();
    await expect(page.locator('#game-result')).toContainText('Checkmate - White wins');
    // Thinking indicator must be hidden again after the move.
    await expect(page.locator('#thinking-indicator')).toHaveClass(/hidden/);
  });

  test('thinking indicator appears while the AI is pondering, and Undo stops it cleanly', async ({ page }) => {
    // Highest level so the search lasts long enough to observe the indicator.
    await page.selectOption('#mode-select', 'ai-4');
    await page.selectOption('#side-select', 'black');

    // AI (White) opens the game - indicator should appear, then the move lands.
    await expect(page.locator('#thinking-indicator')).not.toHaveClass(/hidden/, { timeout: 5_000 });
    await expect(page.locator('.move-white').first()).not.toBeEmpty({ timeout: 10_000 });

    // Human replies 1...e5 (from Black's perspective on a flipped board).
    const e7flipped = page.locator('.square[aria-label="e7"]');
    await e7flipped.click();
    const e5flipped = page.locator('.square[aria-label="e5"]');
    await e5flipped.click();

    // AI starts thinking about its 2nd move; hit Undo immediately - must stop cleanly.
    await page.waitForTimeout(150); // let the search start
    await page.click('#btn-undo');
    await expect(page.locator('#thinking-indicator')).toHaveClass(/hidden/);
    // The game must remain responsive: human's e5 is taken back, it's Black to move.
    await expect(page.locator('#turn-indicator')).toContainText('Black to move');
    // No AI move may appear afterwards (undo rolled back the pending reply).
    const moveCount = await page.locator('.move-white, .move-black').count();
    await page.waitForTimeout(1500);
    const moveCountAfter = await page.locator('.move-white, .move-black').count();
    expect(moveCountAfter).toBe(moveCount);
  });

  test('Game Baru button resets and the AI (White) opens the new game', async ({ page }) => {
    await page.selectOption('#mode-select', 'ai-2');
    await page.selectOption('#side-select', 'black');
    await expect(page.locator('.move-white').first()).not.toBeEmpty({ timeout: 10_000 });

    await page.click('#btn-new-game');
    await expect(page.locator('.move-white, .move-black')).toHaveCount(0);
    // AI is White in the new game too, so it must move again.
    await expect(page.locator('.move-white').first()).not.toBeEmpty({ timeout: 10_000 });
  });
});

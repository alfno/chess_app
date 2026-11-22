import { test, expect } from '@playwright/test';

test.describe('Chess App UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#board .square');
  });

  test('loads initial position correctly', async ({ page }) => {
    // Check board has 64 squares
    const squares = await page.locator('#board .square').count();
    expect(squares).toBe(64);

    // Check white pieces on rank 1
    await expect(page.locator('[data-square="0"] .piece')).toBeVisible(); // a1
    await expect(page.locator('[data-square="4"] .piece')).toBeVisible(); // e1 (king)
    await expect(page.locator('[data-square="7"] .piece')).toBeVisible(); // h1

    // Check black pieces on rank 8
    await expect(page.locator('[data-square="56"] .piece')).toBeVisible(); // a8
    await expect(page.locator('[data-square="60"] .piece')).toBeVisible(); // e8 (king)
    await expect(page.locator('[data-square="63"] .piece')).toBeVisible(); // h8

    // Check turn indicator
    await expect(page.locator('#turn-indicator')).toContainText('White to move');
  });

  test('can make a move by clicking', async ({ page }) => {
    // Click e2 pawn
    await page.click('[data-square="12"].square');
    await expect(page.locator('[data-square="12"].square')).toHaveClass(/selected/);

    // Click e4
    await page.click('[data-square="28"].square');

    // Verify move was made
    await expect(page.locator('[data-square="12"] >> .piece')).not.toBeVisible();
    await expect(page.locator('[data-square="28"] >> .piece')).toBeVisible();
    await expect(page.locator('#turn-indicator')).toContainText('Black to move');

    // Check move list
    await expect(page.locator('.move-white')).toContainText('e4');
  });

  test('highlights legal moves', async ({ page }) => {
    // Click white knight on g1
    await page.click('[data-square="6"].square');

    // Check legal move indicators appear
    const indicators = page.locator('.legal-move');
    await expect(indicators.first()).toBeVisible();

    // Should have at least f3 and h3 as legal moves
    await expect(page.locator('[data-square="21"] >> .legal-move')).toBeVisible(); // f3
    await expect(page.locator('[data-square="23"] >> .legal-move')).toBeVisible(); // h3
  });

  test('undo/redo works', async ({ page }) => {
    // Make a move
    await page.click('[data-square="12"].square'); // e2
    await page.click('[data-square="28"].square'); // e4

    // Wait for move to complete
    await expect(page.locator('#turn-indicator')).toContainText('Black to move');

    // Undo
    await page.click('#btn-undo');
    await expect(page.locator('[data-square="12"] >> .piece')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-square="28"] >> .piece')).not.toBeVisible();
    await expect(page.locator('#turn-indicator')).toContainText('White to move');

    // Redo
    await page.click('#btn-redo');
    await expect(page.locator('[data-square="28"] >> .piece')).toBeVisible();
  });

  test('flip board works', async ({ page }) => {
    // Initial: white at bottom
    await expect(page.locator('[data-square="4"] >> .piece.white')).toBeVisible(); // e1 white king

    // Flip
    await page.click('#flip-board');

    // Now black at bottom (e8 becomes bottom rank)
    await expect(page.locator('[data-square="60"] >> .piece.black')).toBeVisible(); // e8 black king (now at bottom)
  });

  test('FEN import/export works', async ({ page }) => {
    // Export FEN
    await page.click('#btn-export-fen');
    const fenInput = page.locator('#fen-input');
    await expect(fenInput).toHaveValue(/rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR w KQkq - 0 1/);

    // Load a different position - just white king on e1, black king on e8
    await fenInput.fill('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    await page.click('#btn-load-fen');

    // Should show just two kings
    const pieces = await page.locator('.piece').count();
    expect(pieces).toBe(2);
  });

  test('dark/light theme toggle', async ({ page }) => {
    // Initial light theme
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Toggle to dark
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-toggle')).toHaveText('☀️');

    // Toggle back to light
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#theme-toggle')).toHaveText('🌙');
  });

  test('checkmate detection', async ({ page }) => {
    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    await page.click('[data-square="13"].square'); // f2-f3
    await page.click('[data-square="21"].square'); // f3

    await page.click('[data-square="52"].square'); // e7-e5
    await page.click('[data-square="36"].square'); // e5

    await page.click('[data-square="14"].square'); // g2-g4
    await page.click('[data-square="30"].square'); // g4

    await page.click('[data-square="59"].square'); // d8-h4
    await page.click('[data-square="31"].square'); // h4

    // Check checkmate detected
    await expect(page.locator('#game-result')).toBeVisible();
    await expect(page.locator('#game-result')).toContainText('Checkmate');
    await expect(page.locator('#check-indicator')).toBeVisible();
  });

  test('stalemate detection', async ({ page }) => {
    // Stalemate position: 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1
    await page.locator('#fen-input').fill('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    await page.click('#btn-load-fen');

    await expect(page.locator('#game-result')).toBeVisible();
    await expect(page.locator('#game-result')).toContainText('Stalemate');
  });

  test('insufficient material detection', async ({ page }) => {
    // K vs K
    await page.locator('#fen-input').fill('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    await page.click('#btn-load-fen');

    await expect(page.locator('#game-result')).toBeVisible();
    await expect(page.locator('#game-result')).toContainText('Insufficient material');
  });

  test('keyboard navigation', async ({ page }) => {
    // Press Escape to deselect
    await page.click('[data-square="12"].square');
    await expect(page.locator('[data-square="12"].square')).toHaveClass(/selected/);

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-square="12"].square')).not.toHaveClass(/selected/);
  });
});
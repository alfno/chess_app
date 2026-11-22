import { test, expect } from '@playwright/test';

test.describe('Chess Piece Test Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/piece-test.html');
    await page.waitForLoadState('networkidle');
    // Wait for the grid to be populated by checking for piece cells
    await page.waitForFunction(() => {
      const grids = document.querySelectorAll('.piece-grid');
      return grids.length === 2 && grids[0].children.length > 0;
    }, { timeout: 15000 });
  });

  test('piece test page - light theme at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/piece-test-light-1280px.png', fullPage: true });
  });

  test('piece test page - dark theme at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/piece-test-dark-1280px.png', fullPage: true });
  });

  test('piece test page - light theme at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/piece-test-light-768px.png', fullPage: true });
  });

  test('piece test page - dark theme at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/piece-test-dark-768px.png', fullPage: true });
  });

  test('piece test page - light theme at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/piece-test-light-375px.png', fullPage: true });
  });

  test('piece test page - dark theme at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/piece-test-dark-375px.png', fullPage: true });
  });
});
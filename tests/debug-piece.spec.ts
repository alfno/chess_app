import { test, expect } from '@playwright/test';

test('debug piece test page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://127.0.0.1:5173/piece-test.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Errors:', errors);
  console.log('Grids:', await page.locator('.piece-grid').count());
  console.log('Cells:', await page.locator('.piece-cell').count());

  await page.screenshot({ path: 'screenshots/debug-piece-test.png', fullPage: true });
});
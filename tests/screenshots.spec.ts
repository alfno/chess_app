import { test, expect } from '@playwright/test';

test.describe('Chess App Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#board .square');
  });

  test('screenshot at 375px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/chess-375px.png', fullPage: true });
  });

  test('screenshot at 768px (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/chess-768px.png', fullPage: true });
  });

  test('screenshot at 1280px (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/chess-1280px.png', fullPage: true });
  });

  test('verify no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#board .square');

    // Perform some actions
    await page.click('[data-square="12"].square');
    await page.click('[data-square="28"].square');

    expect(errors).toHaveLength(0);
  });

  test('verify only local resources loaded', async ({ page }) => {
    const resources: string[] = [];
    page.on('request', request => {
      resources.push(request.url());
    });

    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#board .square');

    // Check all resources are from localhost
    const externalResources = resources.filter(url => !url.startsWith('http://127.0.0.1:5173'));
    expect(externalResources).toHaveLength(0);
  });
});
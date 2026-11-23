import { test, expect, type Page } from '@playwright/test';

/**
 * Square color correctness (both themes, both orientations):
 *   a1 DARK, h1 LIGHT, a8 LIGHT, h8 DARK (white-at-bottom perspective).
 * Colors must stay attached to the squares when the board is flipped:
 *   flipped top-left square = h1 must still be LIGHT.
 */
const EXPECTED: Record<string, Record<'light' | 'dark', [number, number, number]>> = {
  light: {
    light: [240, 217, 181], // #f0d9b5
    dark: [181, 136, 99], //  #b58863
  },
  dark: {
    light: [212, 196, 168], // #d4c4a8
    dark: [139, 115, 85], //  #8b7355
  },
};

const CORNER_SQUARES: Record<string, 'light' | 'dark'> = {
  a1: 'dark',
  h1: 'light',
  a8: 'light',
  h8: 'dark',
};

function squareColor(page: Page, sq: string): Promise<string> {
  return page.evaluate(
    ([sq]) => {
      const el = document.querySelector(`.square[aria-label="${sq}"]`)!;
      return getComputedStyle(el).backgroundColor;
    },
    [sq]
  );
}

async function expectCornerColors(page: Page, theme: 'light' | 'dark') {
  for (const [sq, kind] of Object.entries(CORNER_SQUARES)) {
    const bg = await squareColor(page, sq);
    const [r, g, b] = EXPECTED[theme][kind];
    expect(bg, `${sq} should be ${kind} in ${theme} theme`).toBe(`rgb(${r}, ${g}, ${b})`);
  }
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  // Persist and reload so the theme is applied at init (loadTheme) - avoids the
  // 100ms background-color transition returning stale computed values.
  await page.evaluate((t) => localStorage.setItem('theme', t), theme);
  await page.reload();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`theme=${theme}`, () => {
    test('normal orientation: a1 dark, h1 light, a8 light, h8 dark', async ({ page }) => {
      await page.goto('/');
      await setTheme(page, theme);
      await expectCornerColors(page, theme);
    });

    test('flipped orientation: colors travel with squares, top-left (h1) light', async ({ page }) => {
      await page.goto('/');
      await setTheme(page, theme);
      await page.click('#flip-board');

      // Same squares keep the same colors after the 180° flip.
      await expectCornerColors(page, theme);

      // The visually top-left square after flipping is h1, and it must be LIGHT.
      const topLeft = await page.evaluate(() => {
        const first = document.querySelector('.board .square')!;
        return {
          label: first.getAttribute('aria-label'),
          className: first.className,
        };
      });
      expect(topLeft.label).toBe('h1');
      expect(topLeft.className).toContain('light');
    });
  });
}

test.describe('corner coordinate labels', () => {
  test('a1: rank "1" top-left, file "a" bottom-right, no overlap', async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');

    const boxes = await page.evaluate(() => {
      const sq = document.querySelector('.square[aria-label="a1"]')!;
      const rank = sq.querySelector('.coord .rank')!;
      const file = sq.querySelector('.coord .file')!;
      const rankBox = rank.getBoundingClientRect();
      const fileBox = file.getBoundingClientRect();
      const sqBox = sq.getBoundingClientRect();
      return {
        rankText: rank.textContent,
        rankTop: rankBox.top - sqBox.top,
        rankLeft: rankBox.left - sqBox.left,
        fileText: file.textContent,
        fileBottom: sqBox.bottom - fileBox.bottom,
        fileRight: sqBox.right - fileBox.right,
        overlap: !(
          rankBox.right < fileBox.left ||
          fileBox.right < rankBox.left ||
          rankBox.bottom < fileBox.top ||
          fileBox.bottom < rankBox.top
        ),
      };
    });

    expect(boxes.rankText).toBe('1');
    expect(boxes.rankTop).toBeLessThan(8); // near top edge
    expect(boxes.rankLeft).toBeLessThan(8); // near left edge
    expect(boxes.fileText).toBe('a');
    expect(boxes.fileBottom).toBeLessThan(8); // near bottom edge
    expect(boxes.fileRight).toBeLessThan(8); // near right edge
    expect(boxes.overlap, 'rank and file labels must not overlap').toBe(false);
  });

  test('flipped: a8 corner square (visual bottom-left) has both labels without overlap', async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');
    await page.click('#flip-board');

    const info = await page.evaluate(() => {
      const sq = document.querySelector('.square[aria-label="h8"]')!;
      const rank = sq.querySelector('.coord .rank')!;
      const file = sq.querySelector('.coord .file')!;
      const rankBox = rank.getBoundingClientRect();
      const fileBox = file.getBoundingClientRect();
      return {
        label: sq.getAttribute('aria-label'),
        rankText: rank.textContent,
        fileText: file.textContent,
        overlap: !(
          rankBox.right < fileBox.left ||
          fileBox.right < rankBox.left ||
          rankBox.bottom < fileBox.top ||
          fileBox.bottom < rankBox.top
        ),
      };
    });

    // h8 is the visually bottom-left square when flipped (leftmost column shows
    // file 'h', bottom row shows rank '8'): both labels present, no overlap.
    expect(info.rankText).toBe('8');
    expect(info.fileText).toBe('h');
    expect(info.overlap, 'labels must not overlap in flipped corner square').toBe(false);
  });
});

test.describe('selected-square highlight', () => {
  test('soft translucent overlay, not neon green', async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');

    // Select the e2 pawn.
    await page.click('.square[aria-label="e2"]');

    const overlay = await page.evaluate(() => {
      const sq = document.querySelector('.square.selected')!;
      const after = getComputedStyle(sq, '::after');
      return { bg: after.backgroundColor, label: sq.getAttribute('aria-label') };
    });

    expect(overlay.label).toBe('e2');
    // Soft translucent green (Lichess-style), replaces #00ff00aa.
    expect(overlay.bg).toBe('rgba(20, 85, 30, 0.45)');
    expect(overlay.bg).not.toContain('0, 255, 0');
  });
});

test.describe('cursor and user-select', () => {
  test('board: pointer on empty squares, grab on piece squares, no text selection', async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');

    const styles = await page.evaluate(() => {
      const empty = document.querySelector('.square[aria-label="e4"]')! as HTMLElement;
      const withPiece = document.querySelector('.square[aria-label="e2"]')! as HTMLElement;
      const board = document.querySelector('.board')! as HTMLElement;
      const btn = document.querySelector('.btn')! as HTMLElement;
      return {
        emptyCursor: getComputedStyle(empty).cursor,
        pieceCursor: getComputedStyle(withPiece).cursor,
        boardUserSelect: getComputedStyle(board).userSelect,
        btnCursor: getComputedStyle(btn).cursor,
        btnUserSelect: getComputedStyle(btn).userSelect,
      };
    });

    expect(styles.emptyCursor).toBe('pointer');
    expect(styles.pieceCursor).toBe('grab');
    expect(styles.boardUserSelect).toBe('none');
    expect(styles.btnCursor).toBe('pointer');
    expect(styles.btnUserSelect).toBe('none');
  });
});

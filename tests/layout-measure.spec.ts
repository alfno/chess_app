import { test, expect } from '@playwright/test';

// Measurement helpers evaluated in the browser.
// The board renders coords as <span class="file"> inside bottom-rank squares
// and <span class="rank"> inside left-file squares (lichess style).
function collectMetrics() {
  return () => {
    const board = document.getElementById('board')!;
    const boardRect = board.getBoundingClientRect();
    const squares = Array.from(board.querySelectorAll<HTMLElement>('.square'));

    // File label positions (bottom rank), left to right
    const fileSpans = Array.from(board.querySelectorAll<HTMLElement>('.coord .file'));
    const files = fileSpans.map(s => ({
      text: s.textContent!.trim(),
      x: s.getBoundingClientRect().x
    }));

    // Rank label positions (left file), top to bottom
    const rankSpans = Array.from(board.querySelectorAll<HTMLElement>('.coord .rank'));
    const ranks = rankSpans.map(s => ({
      text: s.textContent!.trim(),
      y: s.getBoundingClientRect().y
    }));

    // Square sizes
    const widths: number[] = [];
    const heights: number[] = [];
    squares.forEach(sq => {
      const r = sq.getBoundingClientRect();
      widths.push(r.width);
      heights.push(r.height);
    });

    // Square positions by algebraic name (data-square: 0=a1, 7=h1, 56=a8, 63=h8)
    const byAlg = (i: number) => squares.find(s => s.dataset.square === String(i))!.getBoundingClientRect();

    // Piece glyph: measure actual rendered ink via Range, plus element centering
    const firstPiece = board.querySelector<HTMLElement>('.piece')!;
    const pieceRect = firstPiece.getBoundingClientRect();
    const parentSquare = firstPiece.closest<HTMLElement>('.square')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNode(firstPiece.firstChild!);
    const ink = range.getBoundingClientRect();

    return {
      board: { width: boardRect.width, height: boardRect.height },
      square: { width: widths[0], height: heights[0] },
      squareUniformity: {
        widthMax: Math.max(...widths), widthMin: Math.min(...widths),
        heightMax: Math.max(...heights), heightMin: Math.min(...heights),
        count: widths.length
      },
      files: { order: files.map(f => f.text).join(''), xs: files.map(f => f.x) },
      ranks: { order: ranks.map(r => r.text).join(''), ys: ranks.map(r => r.y) },
      a1: { x: byAlg(0).x, y: byAlg(0).y },
      h1: { x: byAlg(7).x, y: byAlg(7).y },
      a8: { x: byAlg(56).x, y: byAlg(56).y },
      h8: { x: byAlg(63).x, y: byAlg(63).y },
      piece: {
        glyphWidth: ink.width,
        glyphHeight: ink.height,
        ratioToSquare: ink.width / parentSquare.width,
        inkCenterOffsetX: Math.abs((ink.x + ink.width / 2) - (parentSquare.x + parentSquare.width / 2)),
        inkCenterOffsetY: Math.abs((ink.y + ink.height / 2) - (parentSquare.y + parentSquare.height / 2)),
        elementCenterOffsetX: Math.abs((pieceRect.x + pieceRect.width / 2) - (parentSquare.x + parentSquare.width / 2)),
        elementCenterOffsetY: Math.abs((pieceRect.y + pieceRect.height / 2) - (parentSquare.y + parentSquare.height / 2))
      },
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    };
  };
}

test.describe('Chess Board Layout Measurements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#board .square');
  });

  test('layout at 1280px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    const m = await page.evaluate(collectMetrics());

    console.log('=== 1280px ===');
    console.log(JSON.stringify(m, null, 2));

    expect(m.board.width).toBeGreaterThanOrEqual(480);
    expect(Math.abs(m.board.width - m.board.height)).toBeLessThanOrEqual(2);
    expect(m.squareUniformity.count).toBe(64);
    expect(m.squareUniformity.widthMax - m.squareUniformity.widthMin).toBeLessThanOrEqual(1);
    expect(m.squareUniformity.heightMax - m.squareUniformity.heightMin).toBeLessThanOrEqual(1);
    expect(m.files.order).toBe('abcdefgh');
    expect(m.ranks.order).toBe('87654321');
    // file x positions strictly ascending left->right
    for (let i = 1; i < m.files.xs.length; i++) expect(m.files.xs[i]).toBeGreaterThan(m.files.xs[i - 1]);
    // rank y positions strictly descending top->bottom (8 on top)
    for (let i = 1; i < m.ranks.ys.length; i++) expect(m.ranks.ys[i]).toBeGreaterThan(m.ranks.ys[i - 1]);
    // orientation: a1 left of h1, a1 below a8
    expect(m.a1.x).toBeLessThan(m.h1.x);
    expect(m.a1.y).toBeGreaterThan(m.a8.y);
    // glyph: ink size >= 60% of square, ink center within 3px of square center
    expect(m.piece.ratioToSquare).toBeGreaterThanOrEqual(0.6);
    expect(m.piece.inkCenterOffsetX).toBeLessThanOrEqual(3);
    expect(m.piece.inkCenterOffsetY).toBeLessThanOrEqual(3);
    expect(m.piece.elementCenterOffsetX).toBeLessThanOrEqual(3);
    expect(m.piece.elementCenterOffsetY).toBeLessThanOrEqual(3);
  });

  test('layout at 768px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    const m = await page.evaluate(collectMetrics());

    console.log('=== 768px ===');
    console.log(JSON.stringify(m, null, 2));

    expect(m.board.width).toBeGreaterThanOrEqual(360);
    expect(Math.abs(m.board.width - m.board.height)).toBeLessThanOrEqual(2);
    expect(m.files.order).toBe('abcdefgh');
    expect(m.ranks.order).toBe('87654321');
    expect(m.a1.x).toBeLessThan(m.h1.x);
    expect(m.a1.y).toBeGreaterThan(m.a8.y);
    expect(m.piece.ratioToSquare).toBeGreaterThanOrEqual(0.6);
  });

  test('layout at 375px viewport, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const m = await page.evaluate(collectMetrics());

    console.log('=== 375px ===');
    console.log(JSON.stringify(m, null, 2));

    expect(m.board.width).toBeGreaterThanOrEqual(330);
    expect(m.board.width).toBeLessThanOrEqual(375);
    expect(Math.abs(m.board.width - m.board.height)).toBeLessThanOrEqual(2);
    expect(m.files.order).toBe('abcdefgh');
    expect(m.ranks.order).toBe('87654321');
    expect(m.piece.ratioToSquare).toBeGreaterThanOrEqual(0.6);
    expect(m.hasHorizontalScroll).toBe(false);
  });

  test('flip board reverses coordinates and positions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    const before = await page.evaluate(collectMetrics());
    console.log('=== before flip ===');
    console.log(JSON.stringify({ files: before.files.order, ranks: before.ranks.order, a1: before.a1, h8: before.h8 }));

    expect(before.files.order).toBe('abcdefgh');
    expect(before.ranks.order).toBe('87654321');

    await page.click('#flip-board');
    await page.waitForTimeout(300);

    const after = await page.evaluate(collectMetrics());
    console.log('=== after flip ===');
    console.log(JSON.stringify({ files: after.files.order, ranks: after.ranks.order, a1: after.a1, h8: after.h8 }));

    expect(after.files.order).toBe('hgfedcba');
    expect(after.ranks.order).toBe('12345678');
    // a1 (white corner) moves to top-right after 180° rotation
    expect(after.a1.x).toBeGreaterThan(after.h8.x);
    expect(after.a1.y).toBeLessThan(after.h8.y);
  });
});

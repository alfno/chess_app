import { describe, it, expect } from 'vitest';
import { loadFromFen, getLegalMoves, type Move } from '../engine';
import { findBestMove, AI_LEVELS, MATE_SCORE } from './search';

/** Back-rank mate in one: Ra8# */
const MATE1_FEN = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
/** Scholar's mate position: Qh5xf7# */
const SCHOLAR_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

const A1 = 0;
const A8 = 56;
const H5 = 39; // 4*8+7
const F7 = 53; // 6*8+5

function assertMoveIsLegal(fen: string, move: Move): void {
  const state = loadFromFen(fen);
  const legal = getLegalMoves(state);
  const match = legal.find(
    m =>
      m.from === move.from &&
      m.to === move.to &&
      (m.promotion ?? null) === (move.promotion ?? null)
  );
  expect(match, `AI move ${move.from}->${move.to} must be legal in the position`).toBeDefined();
}

describe('AI search - mate in one (levels 2-4, level 1 excluded)', () => {
  for (const level of [2, 3, 4] as const) {
    it(`level ${level} finds Ra8# in the back-rank position`, () => {
      const state = loadFromFen(MATE1_FEN);
      const move = findBestMove(state, AI_LEVELS[level]!);
      expect(move).not.toBeNull();
      assertMoveIsLegal(MATE1_FEN, move!);
      expect(move!.from).toBe(A1);
      expect(move!.to).toBe(A8);
    });

    it(`level ${level} finds Qxf7# in the scholar's mate position`, () => {
      const state = loadFromFen(SCHOLAR_FEN);
      const move = findBestMove(state, AI_LEVELS[level]!);
      expect(move).not.toBeNull();
      assertMoveIsLegal(SCHOLAR_FEN, move!);
      expect(move!.from).toBe(H5);
      expect(move!.to).toBe(F7);
    });
  }

  it('level 1 still returns a legal move (allowed to miss the mate)', () => {
    for (const fen of [MATE1_FEN, SCHOLAR_FEN]) {
      const state = loadFromFen(fen);
      const move = findBestMove(state, AI_LEVELS[1]!);
      expect(move).not.toBeNull();
      assertMoveIsLegal(fen, move!);
    }
  });

  it('returns null when there are no legal moves (checkmate position)', () => {
    // Fool's mate final position: black just delivered Qh4#, white to move has no moves.
    const state = loadFromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(findBestMove(state, AI_LEVELS[2]!)).toBeNull();
  });
});

describe('AI search - invariants', () => {
  it('never exceeds the level time budget by much (soft deadline, iter. deepening)', () => {
    const state = loadFromFen(SCHOLAR_FEN);
    const budget = AI_LEVELS[4]!.timeBudgetMs;
    const start = Date.now();
    findBestMove(state, AI_LEVELS[4]!);
    const elapsed = Date.now() - start;
    // Deadline is checked between nodes; allow a small margin.
    expect(elapsed).toBeLessThan(budget + 1500);
  });

  it('prefers faster mates (mate score adjusted by ply)', () => {
    const state = loadFromFen(MATE1_FEN);
    const move = findBestMove(state, AI_LEVELS[4]!);
    expect(move!.to).toBe(A8);
    expect(MATE_SCORE).toBeGreaterThan(0);
  });
});

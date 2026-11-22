import { type GameState, type Move } from './types';
import { loadFromFen, cloneState } from './board';
import { generatePseudoLegalMoves, makeMove, isInCheck } from './moves';

/** Perft result */
export interface PerftResult {
  nodes: number;
  timeMs: number;
  nps: number;
}

/** Run perft to given depth */
export function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;

  let nodes = 0;
  const moves = generatePseudoLegalMoves(state);
  const sideToMove = state.turn;

  for (const move of moves) {
    const newState = makeMove(state, move, false);
    // Filter illegal moves: the side that just moved must not be in check
    if (!isInCheck(newState.board, sideToMove)) {
      nodes += perft(newState, depth - 1);
    }
  }

  return nodes;
}

/** Run perft with timing */
export function perftTimed(state: GameState, depth: number): PerftResult {
  const start = performance.now();
  const nodes = perft(state, depth);
  const timeMs = performance.now() - start;
  return {
    nodes,
    timeMs,
    nps: timeMs > 0 ? Math.round(nodes / (timeMs / 1000)) : 0,
  };
}

/** Run perft for a FEN position at multiple depths */
export function runPerftSuite(fen: string, maxDepth: number): Map<number, PerftResult> {
  const state = loadFromFen(fen);
  const results = new Map<number, PerftResult>();

  for (let depth = 1; depth <= maxDepth; depth++) {
    results.set(depth, perftTimed(state, depth));
  }

  return results;
}

/** Standard test positions with reference node counts (from chessprogramming.org) */
export const PERFT_POSITIONS = {
  /** Starting position */
  start: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    reference: { 1: 20, 2: 400, 3: 8902, 4: 197281, 5: 4865609 },
  },
  /** Kiwipete position */
  kiwipete: {
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    reference: { 1: 48, 2: 2039, 3: 97862, 4: 4085603, 5: 193690690 },
  },
  /** Position 3 */
  pos3: {
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    reference: { 1: 14, 2: 191, 3: 2812, 4: 43238, 5: 674624 },
  },
  /** Position 4 */
  pos4: {
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    reference: { 1: 6, 2: 264, 3: 9467, 4: 422333, 5: 15833292 },
  },
  /** Position 5 */
  pos5: {
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    reference: { 1: 44, 2: 1486, 3: 62379, 4: 2103487, 5: 89941194 },
  },
} as const;

/** Run all standard perft tests up to depth 4 */
export function runStandardPerftTests(): Array<{
  name: string;
  depth: number;
  expected: number;
  actual: number;
  passed: boolean;
  timeMs: number;
}> {
  const results: Array<{
    name: string;
    depth: number;
    expected: number;
    actual: number;
    passed: boolean;
    timeMs: number;
  }> = [];

  for (const [name, pos] of Object.entries(PERFT_POSITIONS)) {
    const state = loadFromFen(pos.fen);
    for (let depth = 1; depth <= 4; depth++) {
      const expected = pos.reference[depth as keyof typeof pos.reference];
      const start = performance.now();
      const actual = perft(state, depth);
      const timeMs = performance.now() - start;

      results.push({
        name,
        depth,
        expected,
        actual,
        passed: actual === expected,
        timeMs,
      });
    }
  }

  return results;
}

/** Print perft results table */
export function printPerftResults(results: Array<{
  name: string;
  depth: number;
  expected: number;
  actual: number;
  passed: boolean;
  timeMs: number;
}>): void {
  console.log('\n=== Perft Results ===');
  console.log('Position        Depth  Expected      Actual        Status    Time(ms)');
  console.log('----------------------------------------------------------------------');
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${r.name.padEnd(15)} ${String(r.depth).padStart(4)}  ${String(r.expected).padStart(11)}  ${String(r.actual).padStart(11)}  ${status}  ${r.timeMs.toFixed(2)}`
    );
  }
  console.log('----------------------------------------------------------------------');
  const passed = results.filter(r => r.passed).length;
  console.log(`Total: ${passed}/${results.length} passed`);
}
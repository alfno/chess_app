import { describe, it, expect } from 'vitest';
import { newGame, getLegalMoves, makeMove, getGameResult, type GameState, type Move, type Color } from '../engine';
import { findBestMove } from './search';

/**
 * 20 full games: AI (negamax depth 3) vs a uniformly random legal mover.
 * - Every move by both sides is validated against getLegalMoves() first,
 *   so a single illegal move fails the test.
 * - AI must win the majority of the 20 games.
 */

/** Fast-but-strong config for bulk testing (level 3 depth, tighter budget). */
const TEST_AI = { maxDepth: 3, timeBudgetMs: 200 };

function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}

function playOneGame(gameNo: number): { winner: Color | null; plies: number; ended: string } {
  const aiColor: Color = gameNo % 2 === 0 ? 'w' : 'b'; // alternate colors
  let state: GameState = newGame();
  let plies = 0;

  while (getGameResult(state).type === 'ongoing' && plies < 300) {
    const legal = getLegalMoves(state);
    if (legal.length === 0) break; // should not happen while result is 'ongoing'

    let move: Move;
    if (state.turn === aiColor) {
      const best = findBestMove(state, TEST_AI);
      expect(best, 'AI must return a move while the game is ongoing').not.toBeNull();
      move = best!;
    } else {
      move = legal[Math.floor(Math.random() * legal.length)]!;
    }

    // Hard legality gate - applies to BOTH sides' moves.
    expect(
      legal.find(m => sameMove(m, move)),
      `game ${gameNo}, ply ${plies + 1}: move ${move.from}->${move.to} must be legal`
    ).toBeDefined();

    state = makeMove(state, move, true);
    plies++;
  }

  const result = getGameResult(state);
  const winner: Color | null = result.type === 'checkmate' ? result.winner : null;
  return { winner, plies, ended: result.type };
}

describe('AI vs random mover - 20 games', () => {
  it(
    'AI wins the majority, no illegal moves are ever played',
    { timeout: 120_000 },
    () => {
      let aiWins = 0;
      let randomWins = 0;
      let draws = 0;
      const summaries: string[] = [];

      for (let g = 0; g < 20; g++) {
        const { winner, plies, ended } = playOneGame(g);
        const aiColor: Color = g % 2 === 0 ? 'w' : 'b';
        if (winner === aiColor) aiWins++;
        else if (winner !== null) randomWins++;
        else draws++;
        summaries.push(`g${g + 1}(AI=${aiColor}): ${ended}${winner ? ` winner=${winner}` : ''} plies=${plies}`);
      }

      console.log(summaries.join('\n'));

      // Majority of the 20 games must be AI wins.
      expect(aiWins, `AI wins ${aiWins}/20, random ${randomWins}, draws ${draws}`).toBeGreaterThanOrEqual(11);
      // And AI must never lose more often than it wins.
      expect(aiWins).toBeGreaterThan(randomWins);
    }
  );
});

/**
 * AI search: negamax + alpha-beta pruning + iterative deepening.
 * Move ordering: captures first (MVV-LVA), then promotions, then quiet moves.
 * Evaluation: material + simple piece-square tables (PST).
 * The AI only ever chooses moves returned by the engine's getLegalMoves(),
 * so it can never produce an illegal move.
 */
import { getLegalMoves, makeMove, isInCheck, type GameState, type Move, type Piece, type PieceType, type Color } from '../engine';

// ========================================
// Levels (depth cap + per-move time cap)
// ========================================
export interface LevelConfig {
  maxDepth: number;
  timeBudgetMs: number;
}

/** 4 levels; the highest is capped at 2 seconds per move. */
export const AI_LEVELS: Record<number, LevelConfig> = {
  1: { maxDepth: 1, timeBudgetMs: 150 }, // Mudah
  2: { maxDepth: 2, timeBudgetMs: 400 }, // Sedang
  3: { maxDepth: 3, timeBudgetMs: 800 }, // Sulit
  4: { maxDepth: 6, timeBudgetMs: 2000 }, // Sangat Sulit
};

export const MATE_SCORE = 1_000_000;

class SearchTimeout extends Error {}

// ========================================
// Evaluation: material + piece-square tables
// ========================================
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0, // kings always present; mate handled by search
};

// Piece-square tables from White's perspective, index = square (a1=0, h1=7, a8=56).
// For a black piece, mirror vertically: sq ^ 56.
const PST: Record<PieceType, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, -20, -20, 10, 10, 5,
    5, -5, -10, 0, 0, -10, -5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, 5, 10, 25, 25, 10, 5, 5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 5, 5, 0, 0, 0,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    5, 10, 10, 10, 10, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -10, 5, 5, 5, 5, 5, 0, -10,
    0, 0, 5, 5, 5, 5, 0, -5,
    -5, 0, 5, 5, 5, 5, 0, -5,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    20, 30, 10, 0, 0, 10, 30, 20,
    20, 20, 0, 0, 0, 0, 20, 20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
  ],
};

function pieceTypeOf(p: Piece): PieceType {
  return p[1] as PieceType;
}

/** Static evaluation from White's perspective (material + PST). */
export function evaluate(state: GameState): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const isWhite = piece[0] === 'w';
    const pt = pieceTypeOf(piece);
    const table = PST[pt]!;
    const value = PIECE_VALUES[pt]! + table[isWhite ? sq : sq ^ 56]!;
    score += isWhite ? value : -value;
  }
  return score;
}

// ========================================
// Move ordering: captures first (MVV-LVA), then promotions
// ========================================
function moveOrderScore(move: Move): number {
  let score = 0;
  // En passant captures a pawn even if `captured` is not set for it.
  const victim = move.captured ?? (move.isEnPassant ? ('p' as const) : null);
  if (victim) {
    score += 10 * PIECE_VALUES[pieceTypeOf(victim)] - PIECE_VALUES[pieceTypeOf(move.piece)];
  }
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion];
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

// ========================================
// Negamax with alpha-beta
// ========================================
function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  deadline: number
): number {
  if (Date.now() > deadline) throw new SearchTimeout();

  const moves = getLegalMoves(state);

  // Terminal: no legal moves -> checkmate or stalemate
  if (moves.length === 0) {
    return isInCheck(state.board, state.turn) ? -MATE_SCORE + ply : 0;
  }

  if (depth === 0) {
    // Score from the perspective of the side to move.
    return evaluate(state) * (state.turn === 'w' ? 1 : -1);
  }

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    const child = makeMove(state, move, false);
    const score = -negamax(child, depth - 1, -beta, -alpha, ply + 1, deadline);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
}

// ========================================
// Iterative deepening driver
// ========================================
/**
 * Find the best move for the side to move. Returns a move from
 * getLegalMoves(state) or null when there are no legal moves.
 * Partial (timed-out) iterations are discarded; the result always comes from
 * the deepest fully completed iteration.
 */
export function findBestMove(state: GameState, level: LevelConfig): Move | null {
  const rootMoves = getLegalMoves(state);
  if (rootMoves.length === 0) return null;

  const deadline = Date.now() + level.timeBudgetMs;
  let ordered = orderMoves(rootMoves);
  let bestMove: Move = ordered[0]!; // legal fallback; replaced by first iteration

  for (let depth = 1; depth <= level.maxDepth; depth++) {
    try {
      let currentBest: Move | null = null;
      let currentScore = -Infinity;
      let alpha = -Infinity;
      const beta = Infinity;

      for (const move of ordered) {
        const child = makeMove(state, move, false);
        const score = -negamax(child, depth - 1, -beta, -alpha, 1, deadline);
        if (score > currentScore) {
          currentScore = score;
          currentBest = move;
        }
        if (currentScore > alpha) alpha = currentScore;
      }

      // Full iteration completed - accept it.
      bestMove = currentBest ?? bestMove;
      // Search the best move first in the next, deeper iteration.
      ordered = [bestMove, ...ordered.filter(m => m !== bestMove)];

      // Found a forced mate - no point searching deeper.
      if (currentScore >= MATE_SCORE - 100) break;
    } catch (e) {
      if (e instanceof SearchTimeout) break; // time is up: keep last completed result
      throw e;
    }
  }

  return bestMove;
}

// Re-export for convenience in tests/tools.
export type { Color };

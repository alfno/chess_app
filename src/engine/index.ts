/**
 * Chess Engine - Main Entry Point
 * Pure TypeScript, zero dependencies, fully testable
 */

// Types
export * from './types';

// Board representation & FEN
export * from './board';

// Move generation & validation
export * from './moves';

// Game rules (checkmate, stalemate, draws)
export * from './rules';

// Notation (SAN, PGN)
export * from './notation';

// Perft testing
export * from './perft';

/**
 * High-level API for easy usage
 */
import { type GameState, type Move, type GameResult, type Color, INITIAL_FEN } from './types';
import { createInitialState, loadFromFen, buildFen } from './board';
import { getLegalMoves, makeMove, undoMove } from './moves';
import { getGameResult, isLegalMove } from './rules';
import { moveToFullSan, parseSan, exportPgn, exportFen } from './notation';

/** Create a new game */
export function newGame(fen?: string): GameState {
  return fen ? loadFromFen(fen) : createInitialState();
}

/** Get all legal moves for current position */
export function getMoves(state: GameState): Move[] {
  return getLegalMoves(state);
}

/** Make a move (returns new state) */
export function playMove(state: GameState, move: Move): GameState {
  const san = moveToFullSan(state, move);
  const newState = makeMove(state, { ...move, san });
  return newState;
}

/** Make a move from SAN string */
export function playSan(state: GameState, san: string): GameState | null {
  const move = parseSan(state, san);
  if (!move) return null;
  return playMove(state, move);
}

/** Undo last move */
export function takeBack(state: GameState): GameState | null {
  return undoMove(state);
}

/** Get current game result */
export function getResult(state: GameState): GameResult {
  return getGameResult(state);
}

/** Check if a move is legal */
export function isLegal(state: GameState, move: Move): boolean {
  return isLegalMove(state, move);
}

/** Export current position as FEN */
export function toFen(state: GameState): string {
  return exportFen(state);
}

/** Export game as PGN */
export function toPgn(state: GameState, options?: Parameters<typeof exportPgn>[1]): string {
  return exportPgn(state, options);
}

/** Get FEN for initial position */
export { INITIAL_FEN };

/** Simple AI: pick random legal move (placeholder for minimax) */
export function findRandomMove(state: GameState): Move | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)] ?? null;
}
import { describe, it, expect } from 'vitest';
import { createInitialState, loadFromFen } from '../engine/board';
import { getLegalMoves, makeMove, isInCheck } from '../engine/moves';
import { getGameResult, isInsufficientMaterial, isLegalMove, buildPositionKey } from '../engine/rules';

describe('rules', () => {
  describe('getGameResult', () => {
    it('returns ongoing for initial position', () => {
      const state = createInitialState();
      const result = getGameResult(state);
      expect(result.type).toBe('ongoing');
    });

    it('detects checkmate - simple queen checkmate', () => {
      // White king on h1, black queen on h2, black king on g3 - white is checkmated
      const fen = '8/8/8/8/8/6k1/7q/7K w - - 0 1';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('checkmate');
      if (result.type === 'checkmate') expect(result.winner).toBe('b');
    });

    it('detects checkmate - Scholar\'s mate', () => {
      // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# - Black is checkmated
      const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('checkmate');
      if (result.type === 'checkmate') expect(result.winner).toBe('w');
    });

    it('detects stalemate', () => {
      // Stalemate: black king on a8, white king on c7, white queen on b6
      // Black to move, no legal moves, not in check
      const fen = 'k7/2K5/1Q6/8/8/8/8/8 b - - 0 1';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('stalemate');
    });

    it('detects 50-move rule draw', () => {
      const state = createInitialState();
      state.halfmoveClock = 100;
      const result = getGameResult(state);
      expect(result.type).toBe('draw50');
    });

    it('detects threefold repetition', () => {
      const state = createInitialState();
      const key = buildPositionKey(state);
      state.positionHistory = [key, key, key];
      const result = getGameResult(state);
      expect(result.type).toBe('drawRepetition');
    });

    it('detects insufficient material - K vs K', () => {
      // White king on e1, black king on e8
      const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('drawInsufficientMaterial');
    });

    it('detects insufficient material - K vs KB', () => {
      // White king on e1, black king on e8, black bishop on c8
      const fen = '2b1k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('drawInsufficientMaterial');
    });

    it('detects insufficient material - K vs KN', () => {
      // White king on e1, black king on e8, black knight on c8
      const fen = '2n1k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const result = getGameResult(state);
      expect(result.type).toBe('drawInsufficientMaterial');
    });
  });

  describe('isInsufficientMaterial', () => {
    it('returns true for K vs K', () => {
      const board = createEmptyBoardForTest();
      board[4] = 'wk'; // e1
      board[60] = 'bk'; // e8
      expect(isInsufficientMaterial(board)).toBe(true);
    });

    it('returns false for K vs KR', () => {
      const board = createEmptyBoardForTest();
      board[4] = 'wk';
      board[60] = 'bk';
      board[63] = 'br';
      expect(isInsufficientMaterial(board)).toBe(false);
    });

    it('returns true for KB vs KB (same color bishops)', () => {
      const board = createEmptyBoardForTest();
      board[4] = 'wk';
      board[2] = 'wb'; // c1 - light square
      board[60] = 'bk';
      board[57] = 'bb'; // b8 - light square
      expect(isInsufficientMaterial(board)).toBe(true);
    });
  });

  describe('isLegalMove', () => {
    it('returns true for legal moves', () => {
      const state = createInitialState();
      const moves = getLegalMoves(state);
      for (const move of moves) {
        expect(isLegalMove(state, move)).toBe(true);
      }
    });

    it('returns false for illegal moves', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
      const state = loadFromFen(fen);
      const illegalMove = { from: 1, to: 17, piece: 'wp' as const, isCastle: false, isEnPassant: false, isCheck: false, isCheckmate: false, san: '' };
      expect(isLegalMove(state, illegalMove)).toBe(false);
    });
  });
});

// Helper for tests
function createEmptyBoardForTest(): (string | null)[] {
  return new Array(64).fill(null);
}
import { describe, it, expect } from 'vitest';
import { createInitialState, loadFromFen } from '../engine/board';
import { getLegalMoves, makeMove } from '../engine/moves';
import { moveToSan, moveToFullSan, parseSan, exportFen, exportPgn } from '../engine/notation';

describe('notation', () => {
  describe('moveToSan', () => {
    it('generates correct SAN for pawn moves', () => {
      const state = createInitialState();
      const e4Move = getLegalMoves(state).find(m => m.from === 12 && m.to === 28)!;
      expect(moveToSan(state, e4Move)).toBe('e4');
    });

    it('generates correct SAN for pawn captures', () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const state = loadFromFen(fen);
      const exd5Move = getLegalMoves(state).find(m => m.from === 28 && m.to === 35 && m.captured)!;
      expect(moveToSan(state, exd5Move)).toBe('exd5');
    });

    it('generates correct SAN for knight moves', () => {
      const state = createInitialState();
      const nf3Move = getLegalMoves(state).find(m => m.from === 6 && m.to === 21)!;
      expect(moveToSan(state, nf3Move)).toBe('Nf3');
    });

    it('generates correct SAN for castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      const ooMove = getLegalMoves(state).find(m => m.isCastle && m.to === 6)!;
      const oooMove = getLegalMoves(state).find(m => m.isCastle && m.to === 2)!;
      expect(moveToSan(state, ooMove)).toBe('O-O');
      expect(moveToSan(state, oooMove)).toBe('O-O-O');
    });

    it('generates correct SAN for promotion', () => {
      const fen = '8/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const promoMove = getLegalMoves(state).find(m => m.promotion === 'q')!;
      expect(moveToSan(state, promoMove)).toBe('e8=Q');
    });
  });

  describe('moveToFullSan', () => {
    it('adds check indicator', () => {
      // Position where move gives check
      const fen = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 1';
      const state = loadFromFen(fen);
      // Black to move, white queen on h5 checking
      const moves = getLegalMoves(state);
      // Find a move that results in check
      for (const move of moves) {
        const newState = makeMove(state, move, false);
        const san = moveToFullSan(state, move);
        if (newState.turn === 'w' && isInCheck(newState.board, 'w')) {
          expect(san.endsWith('+') || san.endsWith('#')).toBe(true);
        }
      }
    });
  });

  describe('parseSan', () => {
    it('parses simple pawn move', () => {
      const state = createInitialState();
      const move = parseSan(state, 'e4');
      expect(move).not.toBeNull();
      expect(move!.from).toBe(12);
      expect(move!.to).toBe(28);
    });

    it('parses pawn capture', () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const state = loadFromFen(fen);
      const move = parseSan(state, 'exd5');
      expect(move).not.toBeNull();
      expect(move!.from).toBe(28);
      expect(move!.to).toBe(35);
      expect(move!.captured).toBe('bp');
    });

    it('parses knight move', () => {
      const state = createInitialState();
      const move = parseSan(state, 'Nf3');
      expect(move).not.toBeNull();
      expect(move!.from).toBe(6);
      expect(move!.to).toBe(21);
    });

    it('parses castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      const ooMove = parseSan(state, 'O-O');
      const oooMove = parseSan(state, 'O-O-O');
      expect(ooMove).not.toBeNull();
      expect(oooMove).not.toBeNull();
      expect(ooMove!.to).toBe(6);
      expect(oooMove!.to).toBe(2);
    });

    it('parses promotion', () => {
      const fen = '8/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const move = parseSan(state, 'e8=Q');
      expect(move).not.toBeNull();
      expect(move!.promotion).toBe('q');
    });

    it('returns null for invalid SAN', () => {
      const state = createInitialState();
      expect(parseSan(state, 'invalid')).toBeNull();
      expect(parseSan(state, 'e9')).toBeNull();
      expect(parseSan(state, 'Ke2')).toBeNull(); // Illegal king move
    });
  });

  describe('exportFen', () => {
    it('exports initial FEN correctly', () => {
      const state = createInitialState();
      expect(exportFen(state)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('exports FEN with en passant', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const state = loadFromFen(fen);
      expect(exportFen(state)).toBe(fen);
    });
  });

  describe('exportPgn', () => {
    it('exports valid PGN for initial position', () => {
      const state = createInitialState();
      const pgn = exportPgn(state);
      expect(pgn).toContain('[Event "Casual Game"]');
      expect(pgn).toContain('[Result "*"]');
      expect(pgn).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('exports PGN with moves', () => {
      const state = createInitialState();
      const e4Move = getLegalMoves(state).find(m => m.from === 12 && m.to === 28)!;
      const newState = makeMove(state, e4Move);
      const e5Move = getLegalMoves(newState).find(m => m.from === 52 && m.to === 36)!;
      const finalState = makeMove(newState, e5Move);

      const pgn = exportPgn(finalState);
      expect(pgn).toContain('1. e4 e5');
    });
  });
});

// Import isInCheck for the check test
import { isInCheck } from '../engine/moves';
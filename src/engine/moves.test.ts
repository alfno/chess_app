import { describe, it, expect } from 'vitest';
import { createInitialState, loadFromFen } from '../engine/board';
import { getLegalMoves, makeMove, isInCheck, isSquareAttacked, undoMove, generatePseudoLegalMoves } from '../engine/moves';
import { INITIAL_FEN } from '../engine/types';

describe('moves', () => {
  describe('generatePseudoLegalMoves', () => {
    it('generates 20 moves from starting position', () => {
      const state = createInitialState();
      const moves = generatePseudoLegalMoves(state);
      expect(moves).toHaveLength(20);
    });

    it('generates correct number of moves for Kiwipete position', () => {
      const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      const moves = generatePseudoLegalMoves(state);
      expect(moves).toHaveLength(48);
    });
  });

  describe('getLegalMoves', () => {
    it('returns 20 legal moves from starting position', () => {
      const state = createInitialState();
      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(20);
    });

    it('filters out moves that leave king in check', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      for (const move of moves) {
        const newState = makeMove(state, move, false);
        expect(isInCheck(newState.board, newState.turn)).toBe(false);
      }
    });
  });

  describe('makeMove', () => {
    it('makes a simple pawn move', () => {
      const state = createInitialState();
      const moves = getLegalMoves(state);
      const e4Move = moves.find(m => m.from === 12 && m.to === 28)!; // e2-e4
      const newState = makeMove(state, e4Move);
      expect(newState.board[28]).toBe('wp');
      expect(newState.board[12]).toBeNull();
      expect(newState.turn).toBe('b');
      expect(newState.fullmoveNumber).toBe(1);
    });

    it('makes a capture', () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      const captureMove = moves.find(m => m.from === 28 && m.to === 35 && m.captured)!; // exd5 (e4=28, d5=35)
      const newState = makeMove(state, captureMove);
      expect(newState.board[35]).toBe('wp');
      expect(newState.board[28]).toBeNull();
      expect(newState.halfmoveClock).toBe(0);
    });

    it('handles en passant', () => {
      // White pawn on e5 (36), black pawn on d5 (35) just moved d7-d5
      // En passant square is d6 (43)
      const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      const epMove = moves.find(m => m.isEnPassant)!;
      const newState = makeMove(state, epMove);
      expect(newState.board[43]).toBe('wp'); // White pawn on d6
      expect(newState.board[36]).toBeNull(); // e5 empty
      expect(newState.board[35]).toBeNull(); // Captured black pawn on d5 removed
    });

    it('handles kingside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      const castleMove = moves.find(m => m.isCastle && m.to === 6)!; // e1-g1
      const newState = makeMove(state, castleMove);
      expect(newState.board[6]).toBe('wk'); // King on g1
      expect(newState.board[5]).toBe('wr'); // Rook on f1
      expect(newState.board[4]).toBeNull(); // e1 empty
      expect(newState.board[7]).toBeNull(); // h1 empty
    });

    it('handles queenside castling', () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      const castleMove = moves.find(m => m.isCastle && m.to === 2)!; // e1-c1
      const newState = makeMove(state, castleMove);
      expect(newState.board[2]).toBe('wk'); // King on c1
      expect(newState.board[3]).toBe('wr'); // Rook on d1
      expect(newState.board[4]).toBeNull(); // e1 empty
      expect(newState.board[0]).toBeNull(); // a1 empty
    });

    it('handles promotion to queen', () => {
      const fen = '8/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const state = loadFromFen(fen);
      const moves = getLegalMoves(state);
      const promoMove = moves.find(m => m.promotion === 'q')!;
      const newState = makeMove(state, promoMove);
      expect(newState.board[60]).toBe('wq'); // Queen on e8
    });

    it('updates halfmove clock correctly', () => {
      const state = createInitialState();
      const e4Move = getLegalMoves(state).find(m => m.from === 12 && m.to === 28)!;
      let newState = makeMove(state, e4Move);
      expect(newState.halfmoveClock).toBe(0); // Pawn move resets

      const e5Move = getLegalMoves(newState).find(m => m.from === 52 && m.to === 36)!;
      newState = makeMove(newState, e5Move);
      expect(newState.halfmoveClock).toBe(0); // Pawn move resets

      const nf3Move = getLegalMoves(newState).find(m => m.from === 6 && m.to === 21)!;
      newState = makeMove(newState, nf3Move);
      expect(newState.halfmoveClock).toBe(1); // Non-pawn, non-capture increments
    });

    it('updates fullmove number after black move', () => {
      const state = createInitialState();
      const e4Move = getLegalMoves(state).find(m => m.from === 12 && m.to === 28)!;
      let newState = makeMove(state, e4Move);
      expect(newState.fullmoveNumber).toBe(1);

      const e5Move = getLegalMoves(newState).find(m => m.from === 52 && m.to === 36)!;
      newState = makeMove(newState, e5Move);
      expect(newState.fullmoveNumber).toBe(2);
    });
  });

  describe('isInCheck', () => {
    it('detects check on black king', () => {
      // White queen on e7 checking black king on e8
      const fen = 'rnbqkbnr/pppp1Qpp/8/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 1';
      const state = loadFromFen(fen);
      expect(isInCheck(state.board, 'b')).toBe(true);
    });

    it('returns false when not in check', () => {
      const state = createInitialState();
      expect(isInCheck(state.board, 'w')).toBe(false);
      expect(isInCheck(state.board, 'b')).toBe(false);
    });
  });

  describe('isSquareAttacked', () => {
    it('detects pawn attacks', () => {
      // White pawn on e5 (36) attacks d6 (43) and f6 (45)
      const fen = '8/8/8/3pP3/8/8/8/8 w - - 0 1';
      const state = loadFromFen(fen);
      expect(isSquareAttacked(state.board, 43, 'w')).toBe(true); // d6
      expect(isSquareAttacked(state.board, 45, 'w')).toBe(true); // f6
      expect(isSquareAttacked(state.board, 36, 'w')).toBe(false); // e5 (not attacked by pawn)
    });

    it('detects knight attacks', () => {
      const fen = '8/8/8/8/4N3/8/8/8 w - - 0 1';
      const state = loadFromFen(fen);
      // Knight on e4 (28) attacks: c3 (18), c5 (34), d2 (11), d6 (43), f2 (13), f6 (45), g3 (22), g5 (38)
      expect(isSquareAttacked(state.board, 18, 'w')).toBe(true); // c3
      expect(isSquareAttacked(state.board, 34, 'w')).toBe(true); // c5
      expect(isSquareAttacked(state.board, 11, 'w')).toBe(true); // d2
      expect(isSquareAttacked(state.board, 43, 'w')).toBe(true); // d6
      expect(isSquareAttacked(state.board, 13, 'w')).toBe(true); // f2
      expect(isSquareAttacked(state.board, 45, 'w')).toBe(true); // f6
      expect(isSquareAttacked(state.board, 22, 'w')).toBe(true); // g3
      expect(isSquareAttacked(state.board, 38, 'w')).toBe(true); // g5
    });
  });

  describe('undoMove', () => {
    it('restores previous position', () => {
      const state = createInitialState();
      const moves = getLegalMoves(state);
      const e4Move = moves.find(m => m.from === 12 && m.to === 28)!;
      const newState = makeMove(state, e4Move);

      const undone = undoMove(newState);
      expect(undone).not.toBeNull();
      if (!undone) throw new Error('undo failed');

      expect(undone!.board).toEqual(state.board);
      expect(undone!.turn).toBe(state.turn);
      expect(undone!.moveHistory).toHaveLength(0);
    });

    it('returns null for initial position', () => {
      const state = createInitialState();
      expect(undoMove(state)).toBeNull();
    });

    it('restores position after multiple moves', () => {
      const state = createInitialState();
      const e4Move = getLegalMoves(state).find(m => m.from === 12 && m.to === 28)!;
      let currentState = makeMove(state, e4Move);
      const e5Move = getLegalMoves(currentState).find(m => m.from === 52 && m.to === 36)!;
      currentState = makeMove(currentState, e5Move);

      // Undo both moves
      const afterOneUndo = undoMove(currentState);
      expect(afterOneUndo).not.toBeNull();

      const afterTwoUndo = undoMove(afterOneUndo!);
      expect(afterTwoUndo).not.toBeNull();
      expect(afterTwoUndo!.board).toEqual(state.board);
    });
  });
});
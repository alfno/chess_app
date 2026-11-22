import { describe, it, expect } from 'vitest';
import {
  parseFen,
  parsePieces,
  parseCastle,
  parseEnPassant,
  buildFen,
  createInitialState,
  loadFromFen,
  cloneState,
  getPiece,
  findKing,
  countPieces,
  getPieces,
} from '../engine/board';
import { INITIAL_FEN } from '../engine/types';

describe('board', () => {
  describe('parseFen', () => {
    it('parses initial FEN correctly', () => {
      const parts = parseFen(INITIAL_FEN);
      expect(parts.pieces).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      expect(parts.turn).toBe('w');
      expect(parts.castle).toBe('KQkq');
      expect(parts.enPassant).toBe('-');
      expect(parts.halfmove).toBe(0);
      expect(parts.fullmove).toBe(1);
    });

    it('parses FEN with en passant', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const parts = parseFen(fen);
      expect(parts.enPassant).toBe('e3');
      expect(parts.turn).toBe('b');
    });

    it('throws on invalid FEN', () => {
      expect(() => parseFen('invalid')).toThrow();
      expect(() => parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq')).toThrow();
    });
  });

  describe('parsePieces', () => {
    it('parses starting position correctly', () => {
      const board = parsePieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      // White pieces on rank 1
      expect(board[0]).toBe('wr'); // a1
      expect(board[1]).toBe('wn'); // b1
      expect(board[2]).toBe('wb'); // c1
      expect(board[3]).toBe('wq'); // d1
      expect(board[4]).toBe('wk'); // e1
      expect(board[5]).toBe('wb'); // f1
      expect(board[6]).toBe('wn'); // g1
      expect(board[7]).toBe('wr'); // h1
      // White pawns on rank 2
      for (let i = 8; i < 16; i++) {
        expect(board[i]).toBe('wp');
      }
      // Empty middle
      for (let i = 16; i < 48; i++) {
        expect(board[i]).toBeNull();
      }
      // Black pawns on rank 7
      for (let i = 48; i < 56; i++) {
        expect(board[i]).toBe('bp');
      }
      // Black pieces on rank 8
      expect(board[56]).toBe('br'); // a8
      expect(board[57]).toBe('bn'); // b8
      expect(board[58]).toBe('bb'); // c8
      expect(board[59]).toBe('bq'); // d8
      expect(board[60]).toBe('bk'); // e8
      expect(board[61]).toBe('bb'); // f8
      expect(board[62]).toBe('bn'); // g8
      expect(board[63]).toBe('br'); // h8
    });

    it('parses empty squares correctly', () => {
      const board = parsePieces('8/8/8/8/8/8/8/8');
      for (const piece of board) {
        expect(piece).toBeNull();
      }
    });

    it('parses numbers as empty squares', () => {
      const board = parsePieces('4k3/8/8/8/8/8/8/4K3');
      expect(board[60]).toBe('bk'); // e8
      expect(board[4]).toBe('wk'); // e1
    });
  });

  describe('parseCastle', () => {
    it('parses all castle rights', () => {
      const rights = parseCastle('KQkq');
      expect(rights.wK).toBe(true);
      expect(rights.wQ).toBe(true);
      expect(rights.bK).toBe(true);
      expect(rights.bQ).toBe(true);
    });

    it('parses partial castle rights', () => {
      const rights = parseCastle('Kq');
      expect(rights.wK).toBe(true);
      expect(rights.wQ).toBe(false);
      expect(rights.bK).toBe(false);
      expect(rights.bQ).toBe(true);
    });

    it('parses no castle rights', () => {
      const rights = parseCastle('-');
      expect(rights.wK).toBe(false);
      expect(rights.wQ).toBe(false);
      expect(rights.bK).toBe(false);
      expect(rights.bQ).toBe(false);
    });
  });

  describe('parseEnPassant', () => {
    it('returns null for no en passant', () => {
      expect(parseEnPassant('-')).toBeNull();
    });

    it('parses en passant square', () => {
      expect(parseEnPassant('e3')).toBe(20); // e3
      expect(parseEnPassant('d6')).toBe(43); // d6 (rank 6 = index 5, file d = 3, 5*8+3=43)
    });
  });

  describe('buildFen', () => {
    it('rebuilds initial FEN from state', () => {
      const state = createInitialState();
      const fen = buildFen(state);
      expect(fen).toBe(INITIAL_FEN);
    });

    it('rebuilds FEN with en passant', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const state = loadFromFen(fen);
      const rebuilt = buildFen(state);
      expect(rebuilt).toBe(fen);
    });
  });

  describe('createInitialState', () => {
    it('creates correct initial state', () => {
      const state = createInitialState();
      expect(state.turn).toBe('w');
      expect(state.castleRights.wK).toBe(true);
      expect(state.castleRights.wQ).toBe(true);
      expect(state.castleRights.bK).toBe(true);
      expect(state.castleRights.bQ).toBe(true);
      expect(state.enPassantSquare).toBeNull();
      expect(state.halfmoveClock).toBe(0);
      expect(state.fullmoveNumber).toBe(1);
      expect(state.moveHistory).toHaveLength(0);
      expect(state.positionHistory).toHaveLength(1);
    });
  });

  describe('loadFromFen', () => {
    it('loads position from FEN', () => {
      const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      const state = loadFromFen(fen);
      expect(state.turn).toBe('w');
      expect(state.castleRights.wK).toBe(true);
      expect(state.castleRights.wQ).toBe(true);
      expect(state.castleRights.bK).toBe(true);
      expect(state.castleRights.bQ).toBe(true);
    });
  });

  describe('cloneState', () => {
    it('creates independent copy', () => {
      const state = createInitialState();
      const cloned = cloneState(state);
      expect(cloned).not.toBe(state);
      expect(cloned.board).not.toBe(state.board);
      expect(cloned.castleRights).not.toBe(state.castleRights);
      expect(cloned.moveHistory).not.toBe(state.moveHistory);
      expect(cloned.positionHistory).not.toBe(state.positionHistory);

      // Modify clone
      cloned.board[0] = null;
      expect(state.board[0]).toBe('wr');
    });
  });

  describe('getPiece', () => {
    it('returns piece at square', () => {
      const state = createInitialState();
      expect(getPiece(state.board, 0)).toBe('wr');
      expect(getPiece(state.board, 4)).toBe('wk');
      expect(getPiece(state.board, 60)).toBe('bk');
    });

    it('returns null for empty squares', () => {
      const state = createInitialState();
      expect(getPiece(state.board, 16)).toBeNull();
    });

    it('returns null for invalid squares', () => {
      const state = createInitialState();
      expect(getPiece(state.board, -1)).toBeNull();
      expect(getPiece(state.board, 64)).toBeNull();
    });
  });

  describe('findKing', () => {
    it('finds white king', () => {
      const state = createInitialState();
      expect(findKing(state.board, 'w')).toBe(4); // e1
    });

    it('finds black king', () => {
      const state = createInitialState();
      expect(findKing(state.board, 'b')).toBe(60); // e8
    });
  });

  describe('countPieces', () => {
    it('counts pieces correctly', () => {
      const state = createInitialState();
      expect(countPieces(state.board, 'w', 'p')).toBe(8);
      expect(countPieces(state.board, 'b', 'p')).toBe(8);
      expect(countPieces(state.board, 'w', 'n')).toBe(2);
      expect(countPieces(state.board, 'b', 'k')).toBe(1);
    });
  });

  describe('getPieces', () => {
    it('returns all pieces of a color', () => {
      const state = createInitialState();
      const white = getPieces(state.board, 'w');
      const black = getPieces(state.board, 'b');
      expect(white).toHaveLength(16);
      expect(black).toHaveLength(16);
    });
  });
});
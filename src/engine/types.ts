/**
 * Core type definitions for the chess engine.
 * Zero dependencies, pure TypeScript.
 */

/** Piece color */
export type Color = 'w' | 'b';

/** Piece type */
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/** Full piece with color */
export type Piece = `${Color}${PieceType}`;

/** Square index 0-63 (a1=0, h1=7, a8=56, h8=63) */
export type Square = number;

/** Castle rights bitmask */
export interface CastleRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

/** Move representation */
export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isCastle: boolean;
  isEnPassant: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  san: string;
}

/** Game state */
export interface GameState {
  board: (Piece | null)[];
  turn: Color;
  castleRights: CastleRights;
  enPassantSquare: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  moveHistory: Move[];
  positionHistory: string[];
}

/** Game result */
export type GameResult =
  | { type: 'ongoing' }
  | { type: 'checkmate'; winner: Color }
  | { type: 'stalemate' }
  | { type: 'draw50' }
  | { type: 'drawRepetition' }
  | { type: 'drawInsufficientMaterial' }
  | { type: 'drawAgreed' };

/** FEN components */
export interface FenParts {
  pieces: string;
  turn: Color;
  castle: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
}

/** Square constants */
export const SQUARES = {
  a1: 0, b1: 1, c1: 2, d1: 3, e1: 4, f1: 5, g1: 6, h1: 7,
  a2: 8, b2: 9, c2: 10, d2: 11, e2: 12, f2: 13, g2: 14, h2: 15,
  a3: 16, b3: 17, c3: 18, d3: 19, e3: 20, f3: 21, g3: 22, h3: 23,
  a4: 24, b4: 25, c4: 26, d4: 27, e4: 28, f4: 29, g4: 30, h4: 31,
  a5: 32, b5: 33, c5: 34, d5: 35, e5: 36, f5: 37, g5: 38, h5: 39,
  a6: 40, b6: 41, c6: 42, d6: 43, e6: 44, f6: 45, g6: 46, h6: 47,
  a7: 48, b7: 49, c7: 50, d7: 51, e7: 52, f7: 53, g7: 54, h7: 55,
  a8: 56, b8: 57, c8: 58, d8: 59, e8: 60, f8: 61, g8: 62, h8: 63,
} as const;

/** File and rank helpers */
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

/** Direction offsets for 0x88 board representation */
export const DIRS = {
  N: 8, S: -8, E: 1, W: -1,
  NE: 9, NW: 7, SE: -7, SW: -9,
  NNE: 17, NNW: 15, SSE: -15, SSW: -17,
  ENE: 10, ESE: -6, WNW: 6, WSW: -10,
} as const;

/** Initial FEN */
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Piece values for evaluation */
export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

/** Piece char mapping */
export const PIECE_CHARS: Record<Piece, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

/** Unicode piece symbols (fallback) */
export const UNICODE_PIECES: Record<Piece, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

/** Helper to get opponent color */
export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

/** Check if square is valid */
export function isValidSquare(sq: number): sq is Square {
  return sq >= 0 && sq < 64;
}

/** Get file (0-7) from square */
export function fileOf(sq: Square): number {
  return sq % 8;
}

/** Get rank (0-7) from square */
export function rankOf(sq: Square): number {
  return Math.floor(sq / 8);
}

/** Square to algebraic notation (e.g., 0 -> 'a1') */
export function squareToAlg(sq: Square): string {
  const file = FILES[fileOf(sq)];
  const rank = RANKS[rankOf(sq)];
  if (!file || !rank) throw new Error(`Invalid square: ${sq}`);
  return file + rank;
}

/** Algebraic notation to square (e.g., 'a1' -> 0) */
export function algToSquare(alg: string): Square | null {
  if (alg.length !== 2) return null;
  const file = FILES.indexOf(alg[0] as (typeof FILES)[number]);
  const rank = RANKS.indexOf(alg[1] as (typeof RANKS)[number]);
  if (file === -1 || rank === -1) return null;
  return (rank * 8 + file) as Square;
}
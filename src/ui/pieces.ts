/**
 * Unicode Chess Piece Generator
 * Uses Unicode chess glyphs with variation selector U+FE0E (text style) to avoid emoji rendering
 * No external dependencies, no images needed
 */

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

/** Unicode chess glyphs with variation selector U+FE0E (text presentation) */
const UNICODE_PIECES: Record<Color, Record<PieceType, string>> = {
  w: {
    p: '♙\uFE0E', // White pawn
    n: '♘\uFE0E', // White knight
    b: '♗\uFE0E', // White bishop
    r: '♖\uFE0E', // White rook
    q: '♕\uFE0E', // White queen
    k: '♔\uFE0E', // White king
  },
  b: {
    p: '♟\uFE0E', // Black pawn
    n: '♞\uFE0E', // Black knight
    b: '♝\uFE0E', // Black bishop
    r: '♜\uFE0E', // Black rook
    q: '♛\uFE0E', // Black queen
    k: '♚\uFE0E', // Black king
  },
};

/** Get Unicode chess piece character with variation selector for text presentation */
export function getPieceSvg(type: PieceType, color: Color): string {
  return UNICODE_PIECES[color][type];
}

/** Get all piece characters for reference */
export function getAllPieces(): Record<string, string> {
  const result: Record<string, string> = {};
  const types: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors: Color[] = ['w', 'b'];

  for (const color of colors) {
    for (const type of types) {
      result[`${color}${type}`] = UNICODE_PIECES[color][type];
    }
  }
  return result;
}
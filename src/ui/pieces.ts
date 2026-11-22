/**
 * Unicode Chess Piece Generator
 * Uses solid Unicode chess glyphs (same for both colors), colored via CSS
 * No external dependencies, no images needed
 */

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

/** Unicode chess glyphs - solid versions (same for both colors) */
const UNICODE_PIECES: Record<PieceType, string> = {
  p: '♟\uFE0E', // Pawn (FE0E: force text presentation, never emoji)
  n: '♞\uFE0E', // Knight
  b: '♝\uFE0E', // Bishop
  r: '♜\uFE0E', // Rook
  q: '♛\uFE0E', // Queen
  k: '♚\uFE0E', // King
};

/** Get Unicode chess piece character (same glyph for both colors, CSS handles color) */
export function getPieceSvg(type: PieceType, _color: Color): string {
  return UNICODE_PIECES[type];
}

/** Get all piece characters for reference */
export function getAllPieces(): Record<string, string> {
  const result: Record<string, string> = {};
  const types: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors: Color[] = ['w', 'b'];

  for (const color of colors) {
    for (const type of types) {
      result[`${color}${type}`] = UNICODE_PIECES[type];
    }
  }
  return result;
}
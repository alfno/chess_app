/**
 * SVG Piece Generator
 * Creates inline SVG pieces for the chess board
 * No external dependencies, no images needed
 */

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

/** SVG path data for each piece (from Wikimedia/standard chess fonts) */
const PIECE_PATHS: Record<PieceType, string> = {
  p: 'M22.5 45.5c0-2.2 1.8-4 4-4h21c2.2 0 4 1.8 4 4v11c0 2.2-1.8 4-4 4h-21c-2.2 0-4-1.8-4-4v-11zm-4 0c0 3.3 2.7 6 6 6h21c3.3 0 6-2.7 6-6v-11c0-3.3-2.7-6-6-6h-21c-3.3 0-6 2.7-6 6v11z',
  n: 'M42 51c0 2.2-1.8 4-4 4H16c-2.2 0-4-1.8-4-4v-9.5c0-1.1.9-2 2-2h4V25c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14.5h4c1.1 0 2 .9 2 2V51zm-4-44.5c0-2.2-1.8-4-4-4H20c-2.2 0-4 1.8-4 4v9.5c0 1.1-.9 2-2 2h-4v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10.5h4c1.1 0 2-.9 2-2V6.5z',
  b: 'M46.5 46.5c0 1.1-.9 2-2 2h-5l-4 4-4-4h-5c-1.1 0-2-.9-2-2v-6l8-8v6h16v-6l8 8v6zm-18-24L26 16l-6 6.5V46h12V22.5z',
  r: 'M46 50.5c0 1.1-.9 2-2 2h-36c-1.1 0-2-.9-2-2v-36c0-1.1.9-2 2-2h36c1.1 0 2 .9 2 2v36zm-4-42.5c0-1.1-.9-2-2-2H20c-1.1 0-2 .9-2 2v36c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2v-36z',
  q: 'M46.5 46.5c0 1.1-.9 2-2 2h-5l-4 4-4-4h-5c-1.1 0-2-.9-2-2v-6l8-8v6h16v-6l8 8v6zm-8-24c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-6zm0-10c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-6z',
  k: 'M46.5 46.5c0 1.1-.9 2-2 2h-5l-4 4-4-4h-5c-1.1 0-2-.9-2-2v-6l8-8v6h16v-6l8 8v6zm-6-32.5c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-6zm0-10c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-6z'
};

/** ViewBox for all pieces: 0 0 48 48 */
const VIEWBOX = '0 0 48 48';

/** Generate SVG string for a piece */
export function generatePieceSvg(type: PieceType, color: Color): string {
  const path = PIECE_PATHS[type];
  const isWhite = color === 'w';

  // White piece: white fill with dark stroke
  // Black piece: dark fill with light stroke
  const fill = isWhite ? '#ffffff' : '#1a1a1a';
  const stroke = isWhite ? '#1a1a1a' : '#ffffff';
  const strokeWidth = isWhite ? '1.5' : '1';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
</svg>`;
}

/** Generate all piece SVGs at once */
export function generateAllPieceSvgs(): Record<string, string> {
  const result: Record<string, string> = {};
  const types: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors: Color[] = ['w', 'b'];

  for (const color of colors) {
    for (const type of types) {
      result[`${color}${type}`] = generatePieceSvg(type, color);
    }
  }
  return result;
}

/** Get data URI for a piece (for CSS background-image) */
export function getPieceDataUri(type: PieceType, color: Color): string {
  const svg = generatePieceSvg(type, color);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Pre-generated SVG cache */
let svgCache: Record<string, string> | null = null;

/** Get cached SVG or generate */
export function getPieceSvg(type: PieceType, color: Color): string {
  if (!svgCache) {
    svgCache = generateAllPieceSvgs();
  }
  const svg = svgCache[`${color}${type}`];
  if (!svg) throw new Error(`Missing SVG for ${color}${type}`);
  return svg;
}
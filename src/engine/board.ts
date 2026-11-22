import {
  type Piece,
  type Square,
  type Color,
  type CastleRights,
  type GameState,
  type FenParts,
  INITIAL_FEN,
  PIECE_CHARS,
  opposite,
  isValidSquare,
  fileOf,
  rankOf,
  squareToAlg,
  algToSquare,
} from './types';

/** Create empty board */
export function createEmptyBoard(): (Piece | null)[] {
  return new Array(64).fill(null);
}

/** Parse FEN string into FenParts */
export function parseFen(fen: string): FenParts {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) {
    throw new Error(`Invalid FEN: expected 6 parts, got ${parts.length}`);
  }
  const [pieces, turn, castle, enPassant, halfmove, fullmove] = parts;
  if (!pieces || !turn || !castle || !enPassant || !halfmove || !fullmove) {
    throw new Error('Invalid FEN: missing parts');
  }
  return {
    pieces,
    turn: turn as Color,
    castle,
    enPassant,
    halfmove: parseInt(halfmove, 10),
    fullmove: parseInt(fullmove, 10),
  };
}

/** Parse piece placement from FEN */
export function parsePieces(piecesFen: string): (Piece | null)[] {
  const board = createEmptyBoard();
  let sq = 56; // Start at a8 (rank 8)

  for (const ch of piecesFen) {
    if (ch === '/') {
      sq -= 16; // Move to next rank (down 2 ranks in 0x88)
      continue;
    }
    const num = parseInt(ch, 10);
    if (!isNaN(num)) {
      sq += num; // Empty squares
      continue;
    }
    const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
    const pieceType = ch.toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
    const piece = `${color}${pieceType}` as Piece;
    board[sq] = piece;
    sq++;
  }
  return board;
}

/** Parse castle rights from FEN */
export function parseCastle(castleFen: string): CastleRights {
  return {
    wK: castleFen.includes('K'),
    wQ: castleFen.includes('Q'),
    bK: castleFen.includes('k'),
    bQ: castleFen.includes('q'),
  };
}

/** Parse en passant square from FEN */
export function parseEnPassant(enPassantFen: string): Square | null {
  if (enPassantFen === '-') return null;
  return algToSquare(enPassantFen);
}

/** Build FEN from game state */
export function buildFen(state: GameState): string {
  // Piece placement
  let pieces = '';
  for (let rank = 7; rank >= 0; rank--) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const sq = (rank * 8 + file) as Square;
      const piece = state.board[sq];
      if (piece === null) {
        empty++;
      } else {
        if (empty > 0) {
          pieces += empty;
          empty = 0;
        }
        // piece is non-null here due to the else branch
        const p = piece as Piece;
        // Use standard FEN letters, not Unicode
        const pieceType = p[1] as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
        const fenChar = pieceType.toUpperCase();
        pieces += p[0] === 'w' ? fenChar : fenChar.toLowerCase();
      }
    }
    if (empty > 0) pieces += empty;
    if (rank > 0) pieces += '/';
  }

  // Castle rights
  let castle = '';
  if (state.castleRights.wK) castle += 'K';
  if (state.castleRights.wQ) castle += 'Q';
  if (state.castleRights.bK) castle += 'k';
  if (state.castleRights.bQ) castle += 'q';
  if (!castle) castle = '-';

  // En passant
  const ep = state.enPassantSquare !== null ? squareToAlg(state.enPassantSquare) : '-';

  return `${pieces} ${state.turn} ${castle} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`;
}

/** Create initial game state */
export function createInitialState(): GameState {
  const parts = parseFen(INITIAL_FEN);
  return {
    board: parsePieces(parts.pieces),
    turn: parts.turn,
    castleRights: parseCastle(parts.castle),
    enPassantSquare: parseEnPassant(parts.enPassant),
    halfmoveClock: parts.halfmove,
    fullmoveNumber: parts.fullmove,
    moveHistory: [],
    positionHistory: [buildFen({
      board: parsePieces(parts.pieces),
      turn: parts.turn,
      castleRights: parseCastle(parts.castle),
      enPassantSquare: parseEnPassant(parts.enPassant),
      halfmoveClock: parts.halfmove,
      fullmoveNumber: parts.fullmove,
      moveHistory: [],
      positionHistory: [],
    })],
  };
}

/** Load state from FEN */
export function loadFromFen(fen: string): GameState {
  const parts = parseFen(fen);
  const board = parsePieces(parts.pieces);
  const castleRights = parseCastle(parts.castle);
  const enPassantSquare = parseEnPassant(parts.enPassant);
  const state: GameState = {
    board,
    turn: parts.turn,
    castleRights,
    enPassantSquare,
    halfmoveClock: parts.halfmove,
    fullmoveNumber: parts.fullmove,
    moveHistory: [],
    positionHistory: [],
  };
  state.positionHistory.push(buildFen(state));
  return state;
}

/** Clone game state */
export function cloneState(state: GameState): GameState {
  return {
    board: [...state.board],
    turn: state.turn,
    castleRights: { ...state.castleRights },
    enPassantSquare: state.enPassantSquare,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    moveHistory: [...state.moveHistory],
    positionHistory: [...state.positionHistory],
  };
}

/** Get piece at square */
export function getPiece(board: (Piece | null)[], sq: Square): Piece | null {
  return isValidSquare(sq) ? (board[sq] ?? null) : null;
}

/** Set piece at square */
export function setPiece(board: (Piece | null)[], sq: Square, piece: Piece | null): void {
  if (isValidSquare(sq)) board[sq] = piece;
}

/** Find king square */
export function findKing(board: (Piece | null)[], color: Color): Square {
  const king = `${color}k` as Piece;
  const idx = board.indexOf(king);
  return idx >= 0 ? idx as Square : -1;
}

/** Count pieces of type */
export function countPieces(board: (Piece | null)[], color: Color, type: string): number {
  const prefix = `${color}${type}`;
  return board.filter(p => p?.startsWith(prefix)).length;
}

/** Get all pieces of a color */
export function getPieces(board: (Piece | null)[], color: Color): { sq: Square; piece: Piece }[] {
  const result: { sq: Square; piece: Piece }[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece[0] === color) {
      result.push({ sq: sq as Square, piece });
    }
  }
  return result;
}
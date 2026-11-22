import {
  type Piece,
  type Square,
  type Color,
  type Move,
  type GameState,
  type CastleRights,
  DIRS,
  opposite,
  isValidSquare,
  fileOf,
  rankOf,
} from './types';
import { getPiece, findKing, getPieces, cloneState, createInitialState } from './board';

/** Ray directions for sliding pieces */
const RAY_DIRS = {
  b: [DIRS.NE, DIRS.NW, DIRS.SE, DIRS.SW],
  r: [DIRS.N, DIRS.S, DIRS.E, DIRS.W],
  q: [DIRS.N, DIRS.S, DIRS.E, DIRS.W, DIRS.NE, DIRS.NW, DIRS.SE, DIRS.SW],
} as const;

/** Knight move offsets */
const KNIGHT_OFFSETS = [
  DIRS.NNE, DIRS.NNW, DIRS.SSE, DIRS.SSW,
  DIRS.ENE, DIRS.ESE, DIRS.WNW, DIRS.WSW,
] as const;

/** King move offsets */
const KING_OFFSETS = [
  DIRS.N, DIRS.S, DIRS.E, DIRS.W,
  DIRS.NE, DIRS.NW, DIRS.SE, DIRS.SW,
] as const;

/** Pawn move directions by color */
const PAWN_DIRS = {
  w: { forward: DIRS.N, double: 16, captures: [DIRS.NE, DIRS.NW], promotionRank: 7 },
  b: { forward: DIRS.S, double: -16, captures: [DIRS.SE, DIRS.SW], promotionRank: 0 },
} as const;

/** Check if square is attacked by a color */
export function isSquareAttacked(board: (Piece | null)[], sq: Square, byColor: Color): boolean {
  // Pawn attacks - pawns attack forward diagonally from their perspective
  // So we check if a pawn of byColor could be on the squares that attack sq
  const pawnDirs = PAWN_DIRS[byColor];
  for (const capDir of pawnDirs.captures) {
    // A pawn on (sq - capDir) would attack sq
    const pawnSq = sq - capDir;
    if (isValidSquare(pawnSq)) {
      const piece = getPiece(board, pawnSq);
      if (piece === `${byColor}p`) return true;
    }
  }

  // Knight attacks
  for (const offset of KNIGHT_OFFSETS) {
    const targetSq = sq + offset;
    if (isValidSquare(targetSq) && isValidKnightJump(sq, targetSq)) {
      const piece = getPiece(board, targetSq);
      if (piece === `${byColor}n`) return true;
    }
  }

  // King attacks (adjacent squares)
  for (const offset of KING_OFFSETS) {
    const targetSq = sq + offset;
    if (isValidSquare(targetSq) && isValidKingMove(sq, targetSq)) {
      const piece = getPiece(board, targetSq);
      if (piece === `${byColor}k`) return true;
    }
  }

  // Sliding piece attacks (bishop, rook, queen)
  for (const [pieceType, dirs] of Object.entries(RAY_DIRS)) {
    for (const dir of dirs) {
      let targetSq = sq + dir;
      while (isValidSquare(targetSq) && isValidRayStep(sq, targetSq, dir)) {
        const piece = getPiece(board, targetSq);
        if (piece) {
          if (piece === `${byColor}${pieceType}` || piece === `${byColor}q`) {
            return true;
          }
          break; // Blocked by any piece
        }
        targetSq += dir;
      }
    }
  }

  return false;
}

/** Check if a knight move is valid (doesn't wrap around board edges) */
function isValidKnightJump(from: Square, to: Square): boolean {
  const fromFile = fileOf(from);
  const toFile = fileOf(to);
  const fileDiff = Math.abs(fromFile - toFile);
  const rankDiff = Math.abs(rankOf(from) - rankOf(to));
  return (fileDiff === 1 && rankDiff === 2) || (fileDiff === 2 && rankDiff === 1);
}

/** Check if a king move is valid (adjacent, no wrapping) */
function isValidKingMove(from: Square, to: Square): boolean {
  const fromFile = fileOf(from);
  const toFile = fileOf(to);
  return Math.abs(fromFile - toFile) <= 1 && Math.abs(rankOf(from) - rankOf(to)) <= 1;
}

/** Check if a ray step is valid (no wrapping across edges) */
function isValidRayStep(from: Square, to: Square, dir: number): boolean {
  const fromFile = fileOf(from);
  const toFile = fileOf(to);
  const fromRank = rankOf(from);
  const toRank = rankOf(to);

  if (dir === DIRS.N || dir === DIRS.S) return fromFile === toFile;
  if (dir === DIRS.E || dir === DIRS.W) return fromRank === toRank;
  if (dir === DIRS.NE || dir === DIRS.SW) return toFile - fromFile === toRank - fromRank;
  if (dir === DIRS.NW || dir === DIRS.SE) return toFile - fromFile === fromRank - toRank;
  return true;
}

/** Check if pawn capture is valid (file change of 1) */
function isValidPawnCapture(from: Square, to: Square): boolean {
  return Math.abs(fileOf(from) - fileOf(to)) === 1;
}

/** Create a move object */
function createMove(
  from: Square,
  to: Square,
  piece: Piece,
  captured: Piece | null,
  promotion: 'q' | 'r' | 'b' | 'n' | undefined,
  isCastle: boolean,
  isEnPassant: boolean
): Move {
  return {
    from,
    to,
    piece,
    captured: captured ?? undefined,
    promotion,
    isCastle,
    isEnPassant,
    isCheck: false,
    isCheckmate: false,
    san: '',
  };
}

/** Generate pseudo-legal moves for a piece at square */
function generatePieceMoves(board: (Piece | null)[], sq: Square, piece: Piece, state: GameState): Move[] {
  const color = piece[0] as Color;
  const type = piece[1] as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  const moves: Move[] = [];

  switch (type) {
    case 'p':
      moves.push(...generatePawnMoves(board, sq, color, state));
      break;
    case 'n':
      moves.push(...generateKnightMoves(board, sq, color));
      break;
    case 'b':
      moves.push(...generateSlidingMoves(board, sq, color, RAY_DIRS.b));
      break;
    case 'r':
      moves.push(...generateSlidingMoves(board, sq, color, RAY_DIRS.r));
      break;
    case 'q':
      moves.push(...generateSlidingMoves(board, sq, color, RAY_DIRS.q));
      break;
    case 'k':
      moves.push(...generateKingMoves(board, sq, color, state));
      break;
  }

  return moves;
}

/** Generate pawn moves */
function generatePawnMoves(board: (Piece | null)[], sq: Square, color: Color, state: GameState): Move[] {
  const moves: Move[] = [];
  const dirs = PAWN_DIRS[color];
  const forwardSq = sq + dirs.forward;

  // Single push
  if (isValidSquare(forwardSq) && getPiece(board, forwardSq) === null) {
    if (rankOf(forwardSq) === dirs.promotionRank) {
      // Promotions
      for (const promo of ['q', 'r', 'b', 'n'] as const) {
        moves.push(createMove(sq, forwardSq, `${color}p`, null, promo, false, false));
      }
    } else {
      moves.push(createMove(sq, forwardSq, `${color}p`, null, undefined, false, false));

      // Double push from starting rank
      const startRank = color === 'w' ? 1 : 6;
      if (rankOf(sq) === startRank) {
        const doubleSq = sq + dirs.double;
        if (isValidSquare(doubleSq) && getPiece(board, doubleSq) === null) {
          moves.push(createMove(sq, doubleSq, `${color}p`, null, undefined, false, false));
        }
      }
    }
  }

  // Captures
  for (const capDir of dirs.captures) {
    const capSq = sq + capDir;
    if (!isValidSquare(capSq) || !isValidPawnCapture(sq, capSq)) continue;

    const target = getPiece(board, capSq);
    if (target && target[0] !== color) {
      if (rankOf(capSq) === dirs.promotionRank) {
        for (const promo of ['q', 'r', 'b', 'n'] as const) {
          moves.push(createMove(sq, capSq, `${color}p`, target, promo, false, false));
        }
      } else {
        moves.push(createMove(sq, capSq, `${color}p`, target, undefined, false, false));
      }
    }

    // En passant
    if (state.enPassantSquare === capSq) {
      moves.push(createMove(sq, capSq, `${color}p`, null, undefined, false, true));
    }
  }

  return moves;
}

/** Generate knight moves */
function generateKnightMoves(board: (Piece | null)[], sq: Square, color: Color): Move[] {
  const moves: Move[] = [];
  for (const offset of KNIGHT_OFFSETS) {
    const targetSq = sq + offset;
    if (!isValidSquare(targetSq) || !isValidKnightJump(sq, targetSq)) continue;
    const target = getPiece(board, targetSq);
    if (!target || target[0] !== color) {
      moves.push(createMove(sq, targetSq, `${color}n`, target ?? null, undefined, false, false));
    }
  }
  return moves;
}

/** Generate sliding moves (bishop, rook, queen) */
function generateSlidingMoves(board: (Piece | null)[], sq: Square, color: Color, dirs: readonly number[]): Move[] {
  const moves: Move[] = [];
  const piece = getPiece(board, sq);
  const pieceChar = piece?.[1] ?? 'q';
  const pieceType = `${color}${pieceChar}` as Piece;

  for (const dir of dirs) {
    let targetSq = sq + dir;
    while (isValidSquare(targetSq) && isValidRayStep(sq, targetSq, dir)) {
      const target = getPiece(board, targetSq);
      if (target) {
        if (target[0] !== color) {
          moves.push(createMove(sq, targetSq, pieceType, target, undefined, false, false));
        }
        break;
      }
      moves.push(createMove(sq, targetSq, pieceType, null, undefined, false, false));
      targetSq += dir;
    }
  }
  return moves;
}

/** Generate king moves (including castling) */
function generateKingMoves(board: (Piece | null)[], sq: Square, color: Color, state: GameState): Move[] {
  const moves: Move[] = [];
  const piece = `${color}k` as Piece;

  // Normal king moves
  for (const offset of KING_OFFSETS) {
    const targetSq = sq + offset;
    if (!isValidSquare(targetSq) || !isValidKingMove(sq, targetSq)) continue;
    const target = getPiece(board, targetSq);
    if (!target || target[0] !== color) {
      moves.push(createMove(sq, targetSq, piece, target ?? null, undefined, false, false));
    }
  }

  // Castling
  if (!isInCheck(board, color)) {
    const rights = state.castleRights;
    const backRank = color === 'w' ? 0 : 7;
    const kingSq = (backRank * 8 + 4) as Square; // e1/e8

    if (sq === kingSq) {
      // Kingside
      if ((color === 'w' ? rights.wK : rights.bK) &&
          getPiece(board, kingSq + 1) === null &&
          getPiece(board, kingSq + 2) === null &&
          !isSquareAttacked(board, kingSq + 1, opposite(color)) &&
          !isSquareAttacked(board, kingSq + 2, opposite(color))) {
        moves.push(createMove(kingSq, kingSq + 2, piece, null, undefined, true, false));
      }

      // Queenside
      if ((color === 'w' ? rights.wQ : rights.bQ) &&
          getPiece(board, kingSq - 1) === null &&
          getPiece(board, kingSq - 2) === null &&
          getPiece(board, kingSq - 3) === null &&
          !isSquareAttacked(board, kingSq - 1, opposite(color)) &&
          !isSquareAttacked(board, kingSq - 2, opposite(color))) {
        moves.push(createMove(kingSq, kingSq - 2, piece, null, undefined, true, false));
      }
    }
  }

  return moves;
}

/** Generate all pseudo-legal moves for a position */
export function generatePseudoLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const pieces = getPieces(state.board, state.turn);

  for (const { sq, piece } of pieces) {
    moves.push(...generatePieceMoves(state.board, sq, piece, state));
  }

  return moves;
}

/** Check if a color is in check */
export function isInCheck(board: (Piece | null)[], color: Color): boolean {
  const kingSq = findKing(board, color);
  if (kingSq < 0) return false;
  return isSquareAttacked(board, kingSq, opposite(color));
}

/** Filter pseudo-legal moves to only legal moves (king not in check after move) */
export function filterLegalMoves(state: GameState, pseudoMoves: Move[]): Move[] {
  return pseudoMoves.filter(move => {
    const newState = makeMove(state, move, false);
    return !isInCheck(newState.board, state.turn);
  });
}

/** Make a move on the board (returns new state) */
export function makeMove(state: GameState, move: Move, updateHistory = true): GameState {
  const newState = cloneState(state);
  const { from, to, piece, captured, promotion, isCastle, isEnPassant } = move;
  const color = piece[0] as Color;

  // Handle en passant capture
  if (isEnPassant) {
    const epPawnSq = color === 'w' ? to - 8 : to + 8;
    newState.board[epPawnSq] = null;
  }

  // Move piece
  newState.board[from] = null;
  newState.board[to] = promotion ? `${color}${promotion}` : piece;

  // Handle castling
  if (isCastle) {
    const backRank = color === 'w' ? 0 : 7;
    if (to === (backRank * 8 + 6)) { // Kingside
      const rookFrom = (backRank * 8 + 7) as Square;
      const rookTo = (backRank * 8 + 5) as Square;
      newState.board[rookFrom] = null;
      newState.board[rookTo] = `${color}r`;
    } else if (to === (backRank * 8 + 2)) { // Queenside
      const rookFrom = (backRank * 8 + 0) as Square;
      const rookTo = (backRank * 8 + 3) as Square;
      newState.board[rookFrom] = null;
      newState.board[rookTo] = `${color}r`;
    }
  }

  // Update castle rights
  newState.castleRights = updateCastleRights(newState.castleRights, from, to, piece, captured ?? null);

  // Update en passant square
  newState.enPassantSquare = computeEnPassantSquare(from, to, piece);

  // Update clocks
  if (piece[1] === 'p' || captured) {
    newState.halfmoveClock = 0;
  } else {
    newState.halfmoveClock++;
  }

  if (color === 'b') newState.fullmoveNumber++;

  // Switch turn
  newState.turn = opposite(color);

  if (updateHistory) {
    newState.moveHistory.push(move);
    newState.positionHistory.push(buildPositionKey(newState));
  }

  return newState;
}

/** Update castle rights after a move */
function updateCastleRights(
  rights: CastleRights,
  from: Square,
  to: Square,
  piece: Piece,
  captured: Piece | null
): CastleRights {
  const newRights = { ...rights };
  const color = piece[0] as Color;

  // King moves
  if (piece[1] === 'k') {
    if (color === 'w') { newRights.wK = false; newRights.wQ = false; }
    else { newRights.bK = false; newRights.bQ = false; }
  }

  // Rook moves from starting squares
  if (piece[1] === 'r') {
    if (from === 0) newRights.wQ = false; // a1
    if (from === 7) newRights.wK = false; // h1
    if (from === 56) newRights.bQ = false; // a8
    if (from === 63) newRights.bK = false; // h8
  }

  // Rook captured on starting squares
  if (captured && captured[1] === 'r') {
    if (to === 0) newRights.wQ = false;
    if (to === 7) newRights.wK = false;
    if (to === 56) newRights.bQ = false;
    if (to === 63) newRights.bK = false;
  }

  return newRights;
}

/** Compute en passant square after a move */
function computeEnPassantSquare(from: Square, to: Square, piece: Piece): Square | null {
  if (piece[1] !== 'p') return null;
  const diff = to - from;
  if (diff === 16 || diff === -16) {
    // Double pawn push - en passant square is behind the pawn
    return (from + to) / 2 as Square;
  }
  return null;
}

/** Build position key for repetition detection (without clocks) */
function buildPositionKey(state: GameState): string {
  return `${buildBoardKey(state.board)} ${state.turn} ${buildCastleKey(state.castleRights)} ${state.enPassantSquare ?? '-'}`;
}

function buildBoardKey(board: (Piece | null)[]): string {
  return board.map(p => p ?? '.').join('');
}

function buildCastleKey(rights: CastleRights): string {
  let s = '';
  if (rights.wK) s += 'K';
  if (rights.wQ) s += 'Q';
  if (rights.bK) s += 'k';
  if (rights.bQ) s += 'q';
  return s || '-';
}

/** Undo a move - rebuilds state from move history */
export function undoMove(state: GameState): GameState | null {
  if (state.moveHistory.length === 0) return null;

  // Create fresh state and replay all moves except the last
  let newState = createInitialState();
  const movesToReplay = state.moveHistory.slice(0, -1);
  for (const m of movesToReplay) {
    newState = makeMove(newState, m, true);
  }
  return newState;
}

/** Get all legal moves for current position */
export function getLegalMoves(state: GameState): Move[] {
  const pseudo = generatePseudoLegalMoves(state);
  return filterLegalMoves(state, pseudo);
}
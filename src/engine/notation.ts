import {
  type Move,
  type GameState,
  type Square,
  type Piece,
  type Color,
  squareToAlg,
  algToSquare,
  fileOf,
  rankOf,
} from './types';
import { getPiece, findKing } from './board';
import { makeMove, isInCheck, getLegalMoves, isSquareAttacked } from './moves';
import { createInitialState } from './board';
import { getGameResult } from './rules';

/** Piece symbols for SAN */
const PIECE_SYMBOLS: Record<string, string> = {
  p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K',
};

/** Convert move to SAN (Standard Algebraic Notation) */
export function moveToSan(state: GameState, move: Move): string {
  const { piece, from, to, promotion, isCastle, isEnPassant, captured } = move;
  const pieceType = piece[1];

  // Castling
  if (isCastle) {
    return to > from ? 'O-O' : 'O-O-O';
  }

  const symbol = PIECE_SYMBOLS[pieceType];
  const toAlg = squareToAlg(to);
  let san = '';

  // Pawn moves
  if (pieceType === 'p') {
    if (captured || isEnPassant) {
      san += squareToAlg(from)[0]; // file
      san += 'x';
    }
    san += toAlg;
    if (promotion) {
      san += '=' + PIECE_SYMBOLS[promotion];
    }
  } else {
    // Piece moves - check for disambiguation
    const ambiguous = findAmbiguousMoves(state, move);
    if (ambiguous.file) san += squareToAlg(from)[0];
    if (ambiguous.rank) san += squareToAlg(from)[1];
    if (captured) san += 'x';
    san = symbol + san + toAlg;
  }

  return san;
}

/** Find if move needs disambiguation */
function findAmbiguousMoves(state: GameState, move: Move): { file: boolean; rank: boolean } {
  const { piece, from, to } = move;
  const pieceType = piece[1];
  const color = piece[0] as Color;

  let file = false;
  let rank = false;

  // Find other pieces of same type and color that can move to the same square
  const legalMoves = getLegalMoves(state);
  for (const m of legalMoves) {
    if (m === move) continue;
    if (m.piece === piece && m.to === to) {
      if (fileOf(m.from) !== fileOf(from)) file = true;
      if (rankOf(m.from) !== rankOf(from)) rank = true;
    }
  }

  return { file, rank };
}

/** Add check/checkmate indicators to SAN */
export function addCheckIndicators(san: string, stateAfterMove: GameState): string {
  const inCheck = isInCheck(stateAfterMove.board, stateAfterMove.turn);
  if (inCheck) {
    const legalMoves = getLegalMoves(stateAfterMove);
    if (legalMoves.length === 0) return san + '#';
    return san + '+';
  }
  return san;
}

/** Full SAN generation with check indicators */
export function moveToFullSan(state: GameState, move: Move): string {
  const san = moveToSan(state, move);
  const newState = makeMove(state, move, false);
  return addCheckIndicators(san, newState);
}

/** Parse SAN string to move */
export function parseSan(state: GameState, san: string): Move | null {
  const cleanSan = san.replace(/[+#]/g, '').trim();
  if (!cleanSan) return null;

  // Castling
  if (cleanSan === 'O-O' || cleanSan === '0-0') {
    return findCastlingMove(state, true);
  }
  if (cleanSan === 'O-O-O' || cleanSan === '0-0-0') {
    return findCastlingMove(state, false);
  }

  // Parse piece symbol
  let pieceType = 'p';
  let sanRest = cleanSan;
  const firstChar = cleanSan[0];
  if (firstChar && firstChar.match(/[NBRQK]/)) {
    pieceType = firstChar.toLowerCase() as 'n' | 'b' | 'r' | 'q' | 'k';
    sanRest = cleanSan.slice(1);
  }

  // Parse capture indicator
  const isCapture = sanRest.includes('x');
  if (isCapture) sanRest = sanRest.replace('x', '');

  // Parse promotion
  let promotion: 'q' | 'r' | 'b' | 'n' | undefined;
  const promoMatch = sanRest.match(/=([NBRQ])/);
  if (promoMatch) {
    promotion = promoMatch[1].toLowerCase() as 'q' | 'r' | 'b' | 'n';
    sanRest = sanRest.replace(/=([NBRQ])/, '');
  }

  // Parse destination square
  const destMatch = sanRest.match(/([a-h][1-8])/);
  if (!destMatch) return null;
  const toAlg = destMatch[1];
  const to = algToSquare(toAlg);
  if (to === null) return null;

  // Parse disambiguation (file/rank)
  let fromFile: number | null = null;
  let fromRank: number | null = null;
  const disambig = sanRest.replace(toAlg, '').replace(/=([NBRQ])/, '');
  for (const ch of disambig) {
    const fileIdx = 'abcdefgh'.indexOf(ch);
    if (fileIdx >= 0) fromFile = fileIdx;
    const rankIdx = '12345678'.indexOf(ch);
    if (rankIdx >= 0) fromRank = rankIdx;
  }

  // Find matching legal move
  const legalMoves = getLegalMoves(state);
  for (const move of legalMoves) {
    if (move.to !== to) continue;
    if (move.piece[1] !== pieceType) continue;
    if (move.promotion !== promotion) continue;
    if (isCapture !== !!move.captured && !move.isEnPassant) continue;

    // Check disambiguation
    if (fromFile !== null && fileOf(move.from) !== fromFile) continue;
    if (fromRank !== null && rankOf(move.from) !== fromRank) continue;

    return move;
  }

  return null;
}

/** Find castling move */
function findCastlingMove(state: GameState, kingside: boolean): Move | null {
  const legalMoves = getLegalMoves(state);
  for (const move of legalMoves) {
    if (!move.isCastle) continue;
    const kingFile = fileOf(move.from);
    const destFile = fileOf(move.to);
    if (kingside && destFile > kingFile) return move;
    if (!kingside && destFile < kingFile) return move;
  }
  return null;
}

/** Export game to PGN format */
export function exportPgn(state: GameState, options?: {
  white?: string;
  black?: string;
  event?: string;
  site?: string;
  date?: string;
  result?: string;
}): string {
  const lines: string[] = [];

  // Tags
  lines.push(`[Event "${options?.event ?? 'Casual Game'}"]`);
  lines.push(`[Site "${options?.site ?? 'Local'}"]`);
  lines.push(`[Date "${options?.date ?? new Date().toISOString().split('T')[0]}"]`);
  lines.push(`[Round "1"]`);
  lines.push(`[White "${options?.white ?? 'White'}"]`);
  lines.push(`[Black "${options?.black ?? 'Black'}"]`);
  
  const result = getGameResult(state);
  let resultStr = '*';
  if (result.type === 'checkmate') resultStr = result.winner === 'w' ? '1-0' : '0-1';
  else if (result.type !== 'ongoing') resultStr = '1/2-1/2';
  lines.push(`[Result "${resultStr}"]`);
  
  lines.push(`[FEN "${exportFen(state)}"]`);
  lines.push('');

  // Moves
  let moveText = '';
  for (let i = 0; i < state.moveHistory.length; i++) {
    const move = state.moveHistory[i];
    if (!move) continue;
    const moveNumber = Math.floor(i / 2) + 1;
    const san = move.san || moveToFullSan(replayStateToMove(state, i), move);

    if (i % 2 === 0) {
      moveText += `${moveNumber}. ${san} `;
    } else {
      moveText += `${san} `;
    }
  }
  moveText += resultStr;
  lines.push(moveText);

  return lines.join('\n');
}

/** Replay state up to a specific move index */
function replayStateToMove(state: GameState, moveIndex: number): GameState {
  const initial = createInitialState();
  for (let i = 0; i <= moveIndex; i++) {
    const m = state.moveHistory[i];
    if (m) makeMove(initial, m, true);
  }
  return initial;
}

/** Export current position as FEN */
export function exportFen(state: GameState): string {
  let pieces = '';
  for (let rank = 7; rank >= 0; rank--) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const sq = (rank * 8 + file) as Square;
      const piece = state.board[sq];
      if (piece === null) {
        empty++;
      } else {
        if (empty > 0) { pieces += empty; empty = 0; }
        const ch = piece[0] === 'w' ? piece[1].toUpperCase() : piece[1];
        pieces += ch;
      }
    }
    if (empty > 0) pieces += empty;
    if (rank > 0) pieces += '/';
  }

  let castle = '';
  if (state.castleRights.wK) castle += 'K';
  if (state.castleRights.wQ) castle += 'Q';
  if (state.castleRights.bK) castle += 'k';
  if (state.castleRights.bQ) castle += 'q';
  if (!castle) castle = '-';

  const ep = state.enPassantSquare !== null ? squareToAlg(state.enPassantSquare) : '-';

  return `${pieces} ${state.turn} ${castle} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`;
}
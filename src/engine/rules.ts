import { type GameState, type GameResult, type Move, type Color } from './types';
import { getLegalMoves, isInCheck, makeMove } from './moves';

/** Check if the game is over and return the result */
export function getGameResult(state: GameState): GameResult {
  const legalMoves = getLegalMoves(state);
  const inCheck = isInCheck(state.board, state.turn);

  // Checkmate
  if (legalMoves.length === 0 && inCheck) {
    return { type: 'checkmate', winner: state.turn === 'w' ? 'b' : 'w' };
  }

  // Insufficient material (check before stalemate)
  if (isInsufficientMaterial(state.board)) {
    return { type: 'drawInsufficientMaterial' };
  }

  // Stalemate
  if (legalMoves.length === 0 && !inCheck) {
    return { type: 'stalemate' };
  }

  // 50-move rule
  if (state.halfmoveClock >= 100) {
    return { type: 'draw50' };
  }

  // Threefold repetition
  if (isThreefoldRepetition(state)) {
    return { type: 'drawRepetition' };
  }

  return { type: 'ongoing' };
}

/** Check for threefold repetition */
export function isThreefoldRepetition(state: GameState): boolean {
  const currentKey = buildPositionKey(state);
  let count = 0;
  for (const key of state.positionHistory) {
    if (key === currentKey) count++;
    if (count >= 3) return true;
  }
  return false;
}

export function buildPositionKey(state: GameState): string {
  return `${buildBoardKey(state.board)} ${state.turn} ${buildCastleKey(state.castleRights)} ${state.enPassantSquare ?? '-'}`;
}

function buildBoardKey(board: (string | null)[]): string {
  return board.map(p => p ?? '.').join('');
}

function buildCastleKey(rights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): string {
  let s = '';
  if (rights.wK) s += 'K';
  if (rights.wQ) s += 'Q';
  if (rights.bK) s += 'k';
  if (rights.bQ) s += 'q';
  return s || '-';
}

/** Check for insufficient mating material */
export function isInsufficientMaterial(board: (string | null)[]): boolean {
  const whitePieces: string[] = [];
  const blackPieces: string[] = [];

  for (const piece of board) {
    if (piece && piece.length >= 2) {
      if (piece[0] === 'w') whitePieces.push(piece[1]);
      else blackPieces.push(piece[1]);
    }
  }

  // King vs King
  if (whitePieces.length === 1 && blackPieces.length === 1) return true;

  // King vs King + Bishop
  if (whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('b')) return true;
  if (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('b')) return true;

  // King vs King + Knight
  if (whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('n')) return true;
  if (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('n')) return true;

  // King + Bishop vs King + Bishop (same color bishops)
  if (whitePieces.length === 2 && blackPieces.length === 2 &&
      whitePieces.includes('b') && blackPieces.includes('b') &&
      !whitePieces.includes('n') && !whitePieces.includes('r') && !whitePieces.includes('q') &&
      !blackPieces.includes('n') && !blackPieces.includes('r') && !blackPieces.includes('q')) {
    return true;
  }

  return false;
}

/** Check if a move gives check */
export function doesMoveGiveCheck(state: GameState, move: Move): boolean {
  const newState = makeMove(state, move, false);
  return isInCheck(newState.board, newState.turn);
}

/** Check if a move is checkmate */
export function isCheckmateMove(state: GameState, move: Move): boolean {
  const newState = makeMove(state, move, false);
  const legalMoves = getLegalMoves(newState);
  return legalMoves.length === 0 && isInCheck(newState.board, newState.turn);
}

/** Get game status as human-readable string */
export function getGameStatusString(result: GameResult): string {
  switch (result.type) {
    case 'ongoing': return 'Ongoing';
    case 'checkmate': return `Checkmate - ${result.winner === 'w' ? 'White' : 'Black'} wins`;
    case 'stalemate': return 'Stalemate - Draw';
    case 'draw50': return 'Draw - 50-move rule';
    case 'drawRepetition': return 'Draw - Threefold repetition';
    case 'drawInsufficientMaterial': return 'Draw - Insufficient material';
    case 'drawAgreed': return 'Draw - Agreed';
  }
}

/** Validate if a move is legal in the current position */
export function isLegalMove(state: GameState, move: Move): boolean {
  const legalMoves = getLegalMoves(state);
  return legalMoves.some(m => movesEqual(m, move));
}

function movesEqual(a: Move, b: Move): boolean {
  return a.from === b.from &&
         a.to === b.to &&
         a.promotion === b.promotion;
}
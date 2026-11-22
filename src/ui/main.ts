import { newGame, getLegalMoves, makeMove, undoMove, type GameState, type Move, type Color, loadFromFen, findKing, isInCheck, isSquareAttacked, getGameResult } from '../engine';
import { exportFen, exportPgn } from '../engine/notation';
import { getPieceSvg } from './pieces';

// ========================================
// State
// ========================================
let gameState = newGame();
let selectedSquare: number | null = null;
let legalMovesForSelected: Move[] = [];
let draggedPiece: HTMLElement | null = null;
let dragStartSquare: number | null = null;
let isDragging = false;
let moveHistoryIndex = 0; // 0 = initial position, 1 = after 1 move, etc.
let gameStates: GameState[] = [gameState]; // gameStates[0] = initial position

// ========================================
// DOM Elements
// ========================================
const boardEl = document.getElementById('board')!;
const moveListEl = document.getElementById('move-list')!;
const turnIndicatorEl = document.getElementById('turn-indicator')!;
const checkIndicatorEl = document.getElementById('check-indicator')!;
const gameResultEl = document.getElementById('game-result')!;
const fenInputEl = document.getElementById('fen-input') as HTMLInputElement;
const modeSelectEl = document.getElementById('mode-select') as HTMLSelectElement;
const themeToggleEl = document.getElementById('theme-toggle')!;
const flipBoardEl = document.getElementById('flip-board')!;
const btnUndoEl = document.getElementById('btn-undo') as HTMLButtonElement;
const btnRedoEl = document.getElementById('btn-redo') as HTMLButtonElement;
const btnLoadFenEl = document.getElementById('btn-load-fen')!;
const btnExportFenEl = document.getElementById('btn-export-fen')!;
const btnExportPgnEl = document.getElementById('btn-export-pgn')!;

// ========================================
// Constants
// ========================================
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
let boardFlipped = false;

// ========================================
// Square <-> Algebraic conversion
// ========================================
function squareToAlg(sq: number): string {
  const file = FILES[sq % 8];
  const rank = RANKS[Math.floor(sq / 8)];
  return file + rank;
}

function algToSquare(alg: string): number | null {
  if (alg.length !== 2) return null;
  const file = FILES.indexOf(alg[0]);
  const rank = RANKS.indexOf(alg[1]);
  if (file === -1 || rank === -1) return null;
  return rank * 8 + file;
}

// ========================================
// Board Rendering - Coordinates INSIDE squares (Lichess style)
// ========================================
function renderBoard(): void {
  boardEl.innerHTML = '';

  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      // White perspective (boardFlipped=false): rank 7 at top (black back rank), rank 0 at bottom (white back rank)
      // Black perspective (boardFlipped=true): rank 0 at top (white back rank), rank 7 at bottom (black back rank)
      const displayRank = boardFlipped ? 7 - rank : rank;
      const displayFile = boardFlipped ? 7 - file : file;
      const sq = displayRank * 8 + displayFile;

      const squareEl = document.createElement('div');
      squareEl.className = `square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      squareEl.dataset.square = String(sq);
      squareEl.setAttribute('role', 'gridcell');
      squareEl.setAttribute('aria-label', squareToAlg(sq));

      // Coordinate label INSIDE square (Lichess style)
            const coordEl = document.createElement('div');
            coordEl.className = 'coord';

            // File letter (a-h) on bottom rank, Rank number (1-8) on left file
            const isWhitePerspective = !boardFlipped;
            const bottomRank = isWhitePerspective ? 0 : 7;
            const leftFile = isWhitePerspective ? 0 : 7;

            // File letter (bottom-right of square)
            if (displayRank === bottomRank) {
              const fileEl = document.createElement('span');
              fileEl.className = 'file';
              fileEl.textContent = FILES[displayFile]!;
              coordEl.appendChild(fileEl);
            }
            // Rank number (top-left of square)
            if (displayFile === leftFile) {
              const rankEl = document.createElement('span');
              rankEl.className = 'rank';
              rankEl.textContent = RANKS[displayRank]!;
              coordEl.appendChild(rankEl);
            }

            squareEl.appendChild(coordEl);

      // Piece
      const piece = gameState.board[sq];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece[0] === 'w' ? 'white' : 'black'}`;
        pieceEl.textContent = getPieceSvg(piece[1] as 'p'|'n'|'b'|'r'|'q'|'k', piece[0] as 'w'|'b');
        pieceEl.draggable = true;
        pieceEl.dataset.square = String(sq);
        squareEl.appendChild(pieceEl);
      }

      // Highlights
      if (sq === selectedSquare) {
        squareEl.classList.add('selected');
      }
      if (legalMovesForSelected.some(m => m.to === sq)) {
        const isCapture = gameState.board[sq] !== null || legalMovesForSelected.some(m => m.to === sq && m.isEnPassant);
        const indicator = document.createElement('div');
        indicator.className = `legal-move${isCapture ? ' capture' : ''}`;
        squareEl.appendChild(indicator);
      }

      // Last move highlight
      const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) {
        squareEl.classList.add('last-move');
      }

      // Check highlight
      if (isInCheck(gameState.board, gameState.turn)) {
        const kingSq = findKing(gameState.board, gameState.turn);
        if (kingSq === sq) {
          squareEl.classList.add('check');
        }
      }

      // Click handler
      squareEl.addEventListener('click', () => handleSquareClick(sq));

      // Drag handlers
      squareEl.addEventListener('dragover', handleDragOver);
      squareEl.addEventListener('drop', (e) => handleDrop(e, sq));
      squareEl.addEventListener('dragleave', handleDragLeave);

      boardEl.appendChild(squareEl);
    }
  }

  updateUI();
}

// ========================================
// Move List Rendering
// ========================================
function renderMoveList(): void {
  moveListEl.innerHTML = '';

  for (let i = 0; i < gameState.moveHistory.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = gameState.moveHistory[i];
    const blackMove = gameState.moveHistory[i + 1];

    const row = document.createElement('div');
    row.className = 'move-row';
    if (i === moveHistoryIndex || i + 1 === moveHistoryIndex) {
      row.classList.add('current');
    }

    row.innerHTML = `
      <span class="move-number">${moveNumber}.</span>
      <span class="move-white" data-move-index="${i}">${whiteMove.san || ''}</span>
      <span class="move-black" data-move-index="${i + 1}">${blackMove?.san || ''}</span>
    `;

    row.querySelectorAll('.move-white, .move-black').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-move-index')!, 10);
        jumpToMove(idx);
      });
    });

    moveListEl.appendChild(row);
  }

  moveListEl.scrollTop = moveListEl.scrollHeight;
}

// ========================================
// UI Updates
// ========================================
function updateUI(): void {
  // Turn indicator
  turnIndicatorEl.textContent = `${gameState.turn === 'w' ? 'White' : 'Black'} to move`;
  turnIndicatorEl.className = `turn-indicator ${gameState.turn}`;

  // Check indicator
  const inCheck = isInCheck(gameState.board, gameState.turn);
  checkIndicatorEl.classList.toggle('hidden', !inCheck);

  // Game result
  const result = getGameResult(gameState);
  if (result.type !== 'ongoing') {
    gameResultEl.textContent = getGameStatusString(result);
    gameResultEl.classList.remove('hidden');
  } else {
    gameResultEl.classList.add('hidden');
  }

  // Undo/Redo buttons
  btnUndoEl.disabled = moveHistoryIndex === 0;
  btnRedoEl.disabled = moveHistoryIndex >= gameStates.length - 1;

  // Move list
  renderMoveList();
}

// ========================================
// Game Logic Helpers
// ========================================
function getGameStatusString(result: { type: string; winner?: Color }): string {
  switch (result.type) {
    case 'checkmate': return `Checkmate - ${result.winner === 'w' ? 'White' : 'Black'} wins`;
    case 'stalemate': return 'Stalemate - Draw';
    case 'draw50': return 'Draw - 50-move rule';
    case 'drawRepetition': return 'Draw - Threefold repetition';
    case 'drawInsufficientMaterial': return 'Draw - Insufficient material';
    default: return 'Ongoing';
  }
}

// ========================================
// Event Handlers
// ========================================
function handleSquareClick(sq: number): void {
  const piece = gameState.board[sq];

  // If selecting own piece
  if (piece && piece[0] === gameState.turn) {
    selectedSquare = sq;
    legalMovesForSelected = getLegalMoves(gameState).filter(m => m.from === sq);
    renderBoard();
    return;
  }

  // If clicking a legal move destination
  if (selectedSquare !== null) {
    const move = legalMovesForSelected.find(m => m.to === sq);
    if (move) {
      playMove(move);
      return;
    }
  }

  // Deselect
  selectedSquare = null;
  legalMovesForSelected = [];
  renderBoard();
}

function playMove(move: Move): void {
  // Add SAN
  move.san = generateSan(gameState, move);
  gameState = makeMove(gameState, move);

  // Trim future states if we're in the past
  gameStates = gameStates.slice(0, moveHistoryIndex + 1);
  gameStates.push(gameState);
  moveHistoryIndex = gameStates.length - 1;

  selectedSquare = null;
  legalMovesForSelected = [];
  renderBoard();
}

function generateSan(state: GameState, move: Move): string {
  // Simplified SAN generation
  const piece = move.piece[1];
  const to = squareToAlg(move.to);
  let san = '';

  if (move.isCastle) {
    return move.to > move.from ? 'O-O' : 'O-O-O';
  }

  if (piece !== 'p') {
    san += piece.toUpperCase();
  } else if (move.captured || move.isEnPassant) {
    san += squareToAlg(move.from)[0];
  }

  if (move.captured || move.isEnPassant) san += 'x';
  san += to;

  if (move.promotion) san += '=' + move.promotion.toUpperCase();

  // Check/checkmate indicators
  const newState = makeMove(state, move, false);
  if (isInCheck(newState.board, newState.turn)) {
    const legalMoves = getLegalMoves(newState);
    san += legalMoves.length === 0 ? '#' : '+';
  }

  return san;
}

function jumpToMove(index: number): void {
  if (index < 0 || index >= gameStates.length) return;
  moveHistoryIndex = index;
  gameState = gameStates[index];
  selectedSquare = null;
  legalMovesForSelected = [];
  renderBoard();
}

// Undo/Redo
function handleUndo(): void {
  if (moveHistoryIndex > 0) {
    moveHistoryIndex--;
    gameState = gameStates[moveHistoryIndex];
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
  }
}

function handleRedo(): void {
  if (moveHistoryIndex < gameStates.length - 1) {
    moveHistoryIndex++;
    gameState = gameStates[moveHistoryIndex];
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
  }
}

// FEN handling
function handleLoadFen(): void {
  const fen = fenInputEl.value.trim();
  if (!fen) return;
  try {
    gameState = loadFromFen(fen);
    gameStates = [gameState];
    moveHistoryIndex = 0;
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
    fenInputEl.value = '';
  } catch (e) {
    alert('Invalid FEN: ' + (e as Error).message);
  }
}

function handleExportFen(): void {
  const fen = exportFen(gameState);
  fenInputEl.value = fen;
  fenInputEl.select();
  document.execCommand('copy');
  alert('FEN copied to clipboard!');
}

function handleExportPgn(): void {
  const pgn = exportPgn(gameState);
  navigator.clipboard.writeText(pgn).then(() => alert('PGN copied to clipboard!'));
}

// Theme
function toggleTheme(): void {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeToggleEl.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function loadTheme(): void {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggleEl.textContent = saved === 'dark' ? '☀️' : '🌙';
}

// Board flip
function flipBoard(): void {
  boardFlipped = !boardFlipped;
  renderBoard();
}

// Drag and Drop
function handleDragStart(e: DragEvent, sq: number): void {
  const piece = gameState.board[sq];
  if (!piece || piece[0] !== gameState.turn) {
    e.preventDefault();
    return;
  }

  isDragging = true;
  dragStartSquare = sq;
  selectedSquare = sq;
  legalMovesForSelected = getLegalMoves(gameState).filter(m => m.from === sq);

  const pieceEl = e.target as HTMLElement;
  pieceEl.classList.add('dragging');
  draggedPiece = pieceEl;

  e.dataTransfer!.effectAllowed = 'move';
  e.dataTransfer!.setData('text/plain', String(sq));

  renderBoard();
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';
}

function handleDragLeave(_e: DragEvent): void {
  // Could add visual feedback
}

function handleDrop(e: DragEvent, targetSq: number): void {
  e.preventDefault();
  if (!isDragging || dragStartSquare === null) return;

  const move = legalMovesForSelected.find(m => m.to === targetSq);
  if (move) {
    playMove(move);
  }

  cleanupDrag();
}

function handleDragEnd(): void {
  cleanupDrag();
}

function cleanupDrag(): void {
  isDragging = false;
  draggedPiece = null;
  dragStartSquare = null;
  // Don't clear selectedSquare here - let click handle it
}

// Keyboard navigation
function handleKeyDown(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement) return;

  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown':
      e.preventDefault();
      handleArrowKey(e.key);
      break;
    case 'Enter':
    case ' ':
      if (selectedSquare !== null) {
        // Select the first legal move? Or just confirm selection
      }
      break;
    case 'Escape':
      selectedSquare = null;
      legalMovesForSelected = [];
      renderBoard();
      break;
    case 'z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        flipBoard();
      }
      break;
  }
}

function handleArrowKey(key: string): void {
  if (selectedSquare === null) {
    // Start from king or a1
    const kingSq = findKing(gameState.board, gameState.turn);
    selectedSquare = kingSq >= 0 ? kingSq : 0;
  } else {
    const file = selectedSquare % 8;
    const rank = Math.floor(selectedSquare / 8);
    let newFile = file;
    let newRank = rank;

    switch (key) {
      case 'ArrowLeft': newFile = Math.max(0, file - 1); break;
      case 'ArrowRight': newFile = Math.min(7, file + 1); break;
      case 'ArrowUp': newRank = Math.min(7, rank + 1); break;
      case 'ArrowDown': newRank = Math.max(0, rank - 1); break;
    }

    selectedSquare = newRank * 8 + newFile;
  }

  legalMovesForSelected = getLegalMoves(gameState).filter(m => m.from === selectedSquare);
  renderBoard();
}

// ========================================
// Initialization
// ========================================
function init(): void {
  loadTheme();

  // Event listeners
  themeToggleEl.addEventListener('click', toggleTheme);
  flipBoardEl.addEventListener('click', flipBoard);
  btnUndoEl.addEventListener('click', handleUndo);
  btnRedoEl.addEventListener('click', handleRedo);
  btnLoadFenEl.addEventListener('click', handleLoadFen);
  btnExportFenEl.addEventListener('click', handleExportFen);
  btnExportPgnEl.addEventListener('click', handleExportPgn);
  fenInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLoadFen();
  });
  modeSelectEl.addEventListener('change', () => {
    // Mode change handling - AI will be added later
    console.log('Mode:', modeSelectEl.value);
  });

  // Drag events on pieces
  boardEl.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('piece')) {
      const sq = parseInt(target.dataset.square!, 10);
      handleDragStart(e, sq);
    }
  });
  boardEl.addEventListener('dragend', cleanupDrag);

  document.addEventListener('keydown', handleKeyDown);

  // Initial render
  renderBoard();
  console.log('Chess App initialized');
}

// Start
init();
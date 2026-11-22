import { loadFromFen, createInitialState, buildFen } from './board';
import { getLegalMoves, makeMove, isInCheck, isSquareAttacked } from './moves';
import { exportFen } from './notation';
import { getGameResult, buildPositionKey } from './rules';

console.log('=== CORRECTED SQUARE NUMBERS ===');
console.log('a1=0, b1=1, c1=2, d1=3, e1=4, f1=5, g1=6, h1=7');
console.log('a2=8, b2=9, c2=10, d2=11, e2=12, f2=13, g2=14, h2=15');
console.log('a3=16, b3=17, c3=18, d3=19, e3=20, f3=21, g3=22, h3=23');
console.log('a4=24, b4=25, c4=26, d4=27, e4=28, f4=29, g4=30, h4=31');
console.log('a5=32, b5=33, c5=34, d5=35, e5=36, f5=37, g5=38, h5=39');
console.log('a6=40, b6=41, c6=42, d6=43, e6=44, f6=45, g6=46, h6=47');
console.log('a7=48, b7=49, c7=50, d7=51, e7=52, f7=53, g7=54, h7=55');
console.log('a8=56, b8=57, c8=58, d8=59, e8=60, f8=61, g8=62, h8=63\n');

console.log('=== FOOL\'S MATE (correct squares) ===');
let state = createInitialState();

// 1. f3 (f2=13 -> f3=21)
let moves = getLegalMoves(state);
let f3 = moves.find(m => m.from === 13 && m.to === 21);
console.log('1. f3 (13->21) found:', !!f3);
if (f3) state = makeMove(state, f3);
console.log('After 1. f3:', exportFen(state), 'Turn:', state.turn);

// 1... e5 (e7=52 -> e5=36)
moves = getLegalMoves(state);
let e5 = moves.find(m => m.from === 52 && m.to === 36);
console.log('1... e5 (52->36) found:', !!e5);
if (e5) state = makeMove(state, e5);
console.log('After 1... e5:', exportFen(state), 'Turn:', state.turn);

// 2. g4 (g2=14 -> g4=30)
moves = getLegalMoves(state);
let g4 = moves.find(m => m.from === 14 && m.to === 30);
console.log('2. g4 (14->30) found:', !!g4);
if (g4) state = makeMove(state, g4);
console.log('After 2. g4:', exportFen(state), 'Turn:', state.turn);

// 2... Qh4# (d8=59 -> h4=31)
moves = getLegalMoves(state);
let qh4 = moves.find(m => m.from === 59 && m.to === 31);
console.log('2... Qh4 (59->31) found:', !!qh4);
if (qh4) state = makeMove(state, qh4);
console.log('After 2... Qh4#:', exportFen(state), 'Turn:', state.turn);
console.log('Legal moves:', getLegalMoves(state).length);
console.log('In check:', isInCheck(state.board, state.turn));

const resultA = getGameResult(state);
console.log('Result:', resultA.type, resultA.type === 'checkmate' ? `(${resultA.winner} wins)` : '');

console.log('\n=== THREEFOLD REPETITION (correct squares) ===');
state = createInitialState();
// Nf3: g1(6) -> f3(21)
// Nf6: g8(62) -> f6(45)
// Ng1: f3(21) -> g1(6)
// Ng8: f6(45) -> g8(62)
const sequence = [
  [6, 21],   // Nf3
  [62, 45],  // Nf6
  [21, 6],   // Ng1
  [45, 62],  // Ng8
  [6, 21],   // Nf3
  [62, 45],  // Nf6
  [21, 6],   // Ng1
  [45, 62],  // Ng8
];

for (let i = 0; i < sequence.length; i++) {
  moves = getLegalMoves(state);
  const move = moves.find(m => m.from === sequence[i][0] && m.to === sequence[i][1]);
  console.log(`Move ${i+1}: ${sequence[i][0]}->${sequence[i][1]} found:`, !!move);
  if (move) state = makeMove(state, move);
}
console.log('Position history length:', state.positionHistory.length);
const key = buildPositionKey(state);
const count = state.positionHistory.filter(k => k === key).length;
console.log('Current position count:', count);

const resultE = getGameResult(state);
console.log('Result:', resultE.type);

console.log('\n=== CASTLING THROUGH CHECK (proper test position) ===');
// Position where black bishop on a6 attacks f1, and white wants to castle kingside
// Need: white king e1(4), white rooks a1(0)/h1(7), black bishop a6(40) attacking f1(5)
// Clear path: a6(40)->b5(33)->c4(26)->d3(19)->e2(12)->f1(5)
// e2 must be empty. So remove white pawn from e2.
state = loadFromFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3KBNR w KQkq - 0 1');
state.board[40] = 'bb'; // black bishop on a6
state.board[12] = null; // remove white pawn from e2
console.log('FEN:', exportFen(state));
console.log('f1 (5) attacked by black:', isSquareAttacked(state.board, 5, 'b'));
console.log('g1 (6) attacked by black:', isSquareAttacked(state.board, 6, 'b'));
console.log('e1 (4) attacked by black:', isSquareAttacked(state.board, 4, 'b'));

moves = getLegalMoves(state);
const castleMoves = moves.filter(m => m.isCastle);
console.log('Castle moves available:', castleMoves.length);
for (const m of castleMoves) {
  console.log('  Castle:', m.from, '->', m.to, m.to === 6 ? 'O-O' : 'O-O-O');
}

// Also test queenside: b1(1), c1(2), d1(3) should be checked
console.log('b1 (1) attacked:', isSquareAttacked(state.board, 1, 'b'));
console.log('c1 (2) attacked:', isSquareAttacked(state.board, 2, 'b'));
console.log('d1 (3) attacked:', isSquareAttacked(state.board, 3, 'b'));
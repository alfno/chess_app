import { loadFromFen, createInitialState, buildFen } from './board';
import { getLegalMoves, makeMove, isInCheck, isSquareAttacked } from './moves';
import { exportFen } from './notation';
import { getGameResult, buildPositionKey } from './rules';

console.log('=== SKENARIO UJI MESIN ATURAN ===\n');

// (a) 1. f3 e5 2. g4 Qh4# → skakmat
console.log('--- (a) Fool\'s Mate: 1. f3 e5 2. g4 Qh4# ---');
let state = createInitialState();

// 1. f3 (f2=13 -> f3=21)
let moves = getLegalMoves(state);
let f3 = moves.find(m => m.from === 13 && m.to === 21);
if (f3) state = makeMove(state, f3);

// 1... e5 (e7=52 -> e5=36)
moves = getLegalMoves(state);
let e5 = moves.find(m => m.from === 52 && m.to === 36);
if (e5) state = makeMove(state, e5);

// 2. g4 (g2=14 -> g4=30)
moves = getLegalMoves(state);
let g4 = moves.find(m => m.from === 14 && m.to === 30);
if (g4) state = makeMove(state, g4);

// 2... Qh4# (d8=59 -> h4=31)
moves = getLegalMoves(state);
let qh4 = moves.find(m => m.from === 59 && m.to === 31);
if (qh4) state = makeMove(state, qh4);

const resultA = getGameResult(state);
console.log('FEN:', exportFen(state));
console.log('Turn:', state.turn, '| Legal moves:', getLegalMoves(state).length, '| In check:', isInCheck(state.board, state.turn));
console.log('Result:', resultA.type, resultA.type === 'checkmate' ? `(${resultA.winner} wins)` : '');
console.log('Expected: checkmate (black wins)');
console.log('Status:', resultA.type === 'checkmate' && resultA.winner === 'b' ? 'PASS ✓' : 'FAIL ✗\n');

// (b) FEN 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1 → pat
console.log('--- (b) Stalemate: 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1 ---');
state = loadFromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
console.log('FEN:', exportFen(state));
console.log('Turn:', state.turn, '| Legal moves:', getLegalMoves(state).length, '| In check:', isInCheck(state.board, state.turn));
const resultB = getGameResult(state);
console.log('Result:', resultB.type);
console.log('Expected: stalemate');
console.log('Status:', resultB.type === 'stalemate' ? 'PASS ✓' : 'FAIL ✗\n');

// (c) FEN 8/8/8/4k3/8/8/4K3/8 w - - 0 1 → remis material kurang
console.log('--- (c) Insufficient Material: K vs K ---');
state = loadFromFen('8/8/8/4k3/8/8/4K3/8 w - - 0 1');
console.log('FEN:', exportFen(state));
console.log('Turn:', state.turn, '| Legal moves:', getLegalMoves(state).length, '| In check:', isInCheck(state.board, state.turn));
const resultC = getGameResult(state);
console.log('Result:', resultC.type);
console.log('Expected: drawInsufficientMaterial');
console.log('Status:', resultC.type === 'drawInsufficientMaterial' ? 'PASS ✓' : 'FAIL ✗\n');

// (d) halfmove clock 100 → remis 50 langkah
console.log('--- (d) 50-move rule: halfmoveClock = 100 ---');
state = createInitialState();
state.halfmoveClock = 100;
console.log('Halfmove clock:', state.halfmoveClock);
const resultD = getGameResult(state);
console.log('Result:', resultD.type);
console.log('Expected: draw50');
console.log('Status:', resultD.type === 'draw50' ? 'PASS ✓' : 'FAIL ✗\n');

// (e) pengulangan tiga kali dengan kuda bolak-balik → remis
console.log('--- (e) Threefold repetition: knight back-and-forth (3x) ---');
state = createInitialState();
const sequence = [
  [6, 21],   // Nf3
  [62, 45],  // Nf6
  [21, 6],   // Ng1
  [45, 62],  // Ng8
  [6, 21],   // Nf3
  [62, 45],  // Nf6
  [21, 6],   // Ng1
  [45, 62],  // Ng8
  [6, 21],   // Nf3 (3rd time)
  [62, 45],  // Nf6
  [21, 6],   // Ng1
  [45, 62],  // Ng8 (3rd repetition)
];

for (let i = 0; i < sequence.length; i++) {
  moves = getLegalMoves(state);
  const move = moves.find(m => m.from === sequence[i][0] && m.to === sequence[i][1]);
  if (move) state = makeMove(state, move);
}
console.log('Position history length:', state.positionHistory.length);
const key = buildPositionKey(state);
const count = state.positionHistory.filter(k => k === key).length;
console.log('Current position count:', count);
const resultE = getGameResult(state);
console.log('Result:', resultE.type);
console.log('Expected: drawRepetition');
console.log('Status:', resultE.type === 'drawRepetition' ? 'PASS ✓' : 'FAIL ✗\n');

// (f) rokade lewat kotak yang diserang → ditolak
console.log('--- (f) Castling through attacked square: O-O rejected ---');
// Position: black bishop on a6(40) attacks f1(5), e2 pawn removed
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
const ooRejected = castleMoves.length === 1 && castleMoves[0].to === 2;
console.log('Expected: O-O rejected (f1 attacked), only O-O-O allowed');
console.log('Status:', ooRejected ? 'PASS ✓' : 'FAIL ✗\n');

// Summary
console.log('=== RINGKASAN ===');
const results = [
  { name: '(a) Fool\'s Mate', pass: resultA.type === 'checkmate' && resultA.winner === 'b' },
  { name: '(b) Stalemate', pass: resultB.type === 'stalemate' },
  { name: '(c) Insufficient Material', pass: resultC.type === 'drawInsufficientMaterial' },
  { name: '(d) 50-move rule', pass: resultD.type === 'draw50' },
  { name: '(e) Threefold repetition', pass: resultE.type === 'drawRepetition' },
  { name: '(f) Castling through check', pass: ooRejected },
];

for (const r of results) {
  console.log(`${r.name}: ${r.pass ? 'PASS ✓' : 'FAIL ✗'}`);
}
const allPass = results.every(r => r.pass);
console.log(`\nOverall: ${allPass ? 'ALL PASS ✓' : 'SOME FAIL ✗'}`);
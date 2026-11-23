# ♟️ Chess App

A complete chess application built in **pure TypeScript with zero runtime dependencies**: a fully rules-correct engine, a responsive web UI, and a built-in AI opponent that runs in a Web Worker so the interface never freezes.

## Features

### Engine (`src/engine/`)
- Full legal move generation: castling, en passant, promotion, pins, checks
- Checkmate, stalemate, 50-move rule, threefold repetition, insufficient material
- FEN import/export and PGN export, SAN move notation
- Verified with perft tests against known node counts

### UI (`src/ui/`)
- Click-to-move **and** drag-and-drop, with legal-move dots and capture rings
- Coordinates rendered inside the board (Lichess style): rank numbers top-left, file letters bottom-right
- Undo/redo with full move history navigation, keyboard shortcuts
- Light/dark themes, board flip, live FEN editing

### AI Opponent (`src/ai/`)
- **Negamax with alpha-beta pruning + iterative deepening**
- Move ordering: captures first (MVV-LVA), promotions weighted, best move from the previous iteration searched first
- Evaluation: material + piece-square tables
- 4 difficulty levels — from instant depth-1 up to depth 6 with a **2 s per-move cap**
- Runs in a **Web Worker**; the UI thread stays responsive at all times
- The AI only ever plays moves returned by the engine's `getLegalMoves()`, and every result is re-validated before it is applied — an illegal move is impossible by construction
- Plays as White or Black, with an "AI is thinking…" indicator and clean cancellation on undo / new game

## Tech Stack

| Layer | Tools |
|---|---|
| Language | TypeScript (strict) |
| Build / Dev | Vite |
| Unit tests | Vitest — 118 tests (engine + AI search) |
| E2E tests | Playwright — 40 tests (UI, board rendering, AI via real Web Worker) |

## Getting Started

```bash
npm install
npm run dev        # start dev server on port 5173
```

```bash
npm test           # engine + AI unit tests
npx playwright test # browser e2e tests
```

## Testing Highlights

- **Mate-in-1 search**: back-rank `Ra8#` and Scholar's mate `Qxf7#` must be found by every level except the easiest
- **AI vs random mover**: 20 full games, zero illegal moves (hard legality gate on every ply), AI must win the majority
- **Board rendering**: square colors verified per square (a1 dark, h1 light, …) in both themes and both orientations
- **AI cancellation**: pending AI replies are dropped cleanly on undo/new game — verified end-to-end in the browser

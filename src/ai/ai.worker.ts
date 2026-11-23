/**
 * AI Web Worker - keeps the UI thread free while searching.
 * Protocol:
 *   main -> worker: { type: 'search', id, fen, level }
 *   worker -> main: { type: 'result', id, move: { from, to, promotion } | null }
 *
 * The main thread cancels a pending search by terminating this worker
 * (a sync search loop cannot process an in-band 'stop' message anyway),
 * and ignores any result whose id is stale.
 */
import { loadFromFen } from '../engine';
import { findBestMove, AI_LEVELS } from './search';

interface SearchRequest {
  type: 'search';
  id: number;
  fen: string;
  level: number;
}

const ctx = self as unknown as {
  addEventListener: (type: 'message', cb: (e: MessageEvent) => void) => void;
  postMessage: (msg: unknown) => void;
};

ctx.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data as SearchRequest;
  if (msg?.type !== 'search') return;

  try {
    const state = loadFromFen(msg.fen);
    const level = AI_LEVELS[msg.level] ?? AI_LEVELS[1]!;
    const move = findBestMove(state, level);
    ctx.postMessage({
      type: 'result',
      id: msg.id,
      move: move
        ? { from: move.from, to: move.to, promotion: move.promotion ?? null }
        : null,
    });
  } catch (err) {
    ctx.postMessage({ type: 'result', id: msg.id, move: null, error: String(err) });
  }
});

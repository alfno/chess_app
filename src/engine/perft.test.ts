import { describe, it, expect } from 'vitest';
import { loadFromFen } from '../engine/board';
import { perft, runStandardPerftTests, PERFT_POSITIONS } from '../engine/perft';

describe('perft', () => {
  describe('standard positions depth 1', () => {
    it('start position depth 1 = 20', () => {
      const state = loadFromFen(PERFT_POSITIONS.start.fen);
      expect(perft(state, 1)).toBe(20);
    });

    it('kiwipete position depth 1 = 48', () => {
      const state = loadFromFen(PERFT_POSITIONS.kiwipete.fen);
      expect(perft(state, 1)).toBe(48);
    });

    it('position 3 depth 1 = 14', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos3.fen);
      expect(perft(state, 1)).toBe(14);
    });

    it('position 4 depth 1 = 6', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos4.fen);
      expect(perft(state, 1)).toBe(6);
    });

    it('position 5 depth 1 = 44', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos5.fen);
      expect(perft(state, 1)).toBe(44);
    });
  });

  describe('standard positions depth 2', () => {
    it('start position depth 2 = 400', () => {
      const state = loadFromFen(PERFT_POSITIONS.start.fen);
      expect(perft(state, 2)).toBe(400);
    });

    it('kiwipete position depth 2 = 2039', () => {
      const state = loadFromFen(PERFT_POSITIONS.kiwipete.fen);
      expect(perft(state, 2)).toBe(2039);
    });

    it('position 3 depth 2 = 191', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos3.fen);
      expect(perft(state, 2)).toBe(191);
    });

    it('position 4 depth 2 = 264', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos4.fen);
      expect(perft(state, 2)).toBe(264);
    });

    it('position 5 depth 2 = 1486', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos5.fen);
      expect(perft(state, 2)).toBe(1486);
    });
  });

  describe('standard positions depth 3', () => {
    it('start position depth 3 = 8902', () => {
      const state = loadFromFen(PERFT_POSITIONS.start.fen);
      expect(perft(state, 3)).toBe(8902);
    });

    it('kiwipete position depth 3 = 97862', () => {
      const state = loadFromFen(PERFT_POSITIONS.kiwipete.fen);
      expect(perft(state, 3)).toBe(97862);
    });

    it('position 3 depth 3 = 2812', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos3.fen);
      expect(perft(state, 3)).toBe(2812);
    });

    it('position 4 depth 3 = 9467', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos4.fen);
      expect(perft(state, 3)).toBe(9467);
    });

    it('position 5 depth 3 = 62379', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos5.fen);
      expect(perft(state, 3)).toBe(62379);
    });
  });

  describe('standard positions depth 4', () => {
    it('start position depth 4 = 197281', () => {
      const state = loadFromFen(PERFT_POSITIONS.start.fen);
      expect(perft(state, 4)).toBe(197281);
    });

    it('kiwipete position depth 4 = 4085603', () => {
      const state = loadFromFen(PERFT_POSITIONS.kiwipete.fen);
      expect(perft(state, 4)).toBe(4085603);
    });

    it('position 3 depth 4 = 43238', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos3.fen);
      expect(perft(state, 4)).toBe(43238);
    });

    it('position 4 depth 4 = 422333', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos4.fen);
      expect(perft(state, 4)).toBe(422333);
    });

    it('position 5 depth 4 = 2103487', () => {
      const state = loadFromFen(PERFT_POSITIONS.pos5.fen);
      expect(perft(state, 4)).toBe(2103487);
    });
  });

  describe('runStandardPerftTests', () => {
    it('runs all standard tests and returns results', () => {
      const results = runStandardPerftTests();
      expect(results.length).toBe(20); // 5 positions × 4 depths

      // All should pass
      const failed = results.filter(r => !r.passed);
      if (failed.length > 0) {
        console.log('Failed tests:', failed);
      }
      expect(failed.length).toBe(0);
    }, 60000);
  });
});
import { describe, it, expect } from 'vitest';
import {
  squareToAlg,
  algToSquare,
  fileOf,
  rankOf,
  opposite,
  isValidSquare,
  INITIAL_FEN,
  type Square,
  type Color,
  type Piece,
} from '../engine/types';

describe('types', () => {
  describe('squareToAlg', () => {
    it('converts a1 (0) correctly', () => {
      expect(squareToAlg(0 as Square)).toBe('a1');
    });
    it('converts h1 (7) correctly', () => {
      expect(squareToAlg(7 as Square)).toBe('h1');
    });
    it('converts a8 (56) correctly', () => {
      expect(squareToAlg(56 as Square)).toBe('a8');
    });
    it('converts h8 (63) correctly', () => {
      expect(squareToAlg(63 as Square)).toBe('h8');
    });
    it('converts e4 (28) correctly', () => {
      expect(squareToAlg(28 as Square)).toBe('e4');
    });
  });

  describe('algToSquare', () => {
    it('converts a1 to 0', () => {
      expect(algToSquare('a1')).toBe(0);
    });
    it('converts h8 to 63', () => {
      expect(algToSquare('h8')).toBe(63);
    });
    it('converts e4 to 28', () => {
      expect(algToSquare('e4')).toBe(28);
    });
    it('returns null for invalid squares', () => {
      expect(algToSquare('i1')).toBeNull();
      expect(algToSquare('a9')).toBeNull();
      expect(algToSquare('z0')).toBeNull();
      expect(algToSquare('a')).toBeNull();
      expect(algToSquare('')).toBeNull();
    });
  });

  describe('fileOf/rankOf', () => {
    it('returns correct file and rank', () => {
      expect(fileOf(0)).toBe(0); // a1
      expect(rankOf(0)).toBe(0);
      expect(fileOf(7)).toBe(7); // h1
      expect(rankOf(7)).toBe(0);
      expect(fileOf(56)).toBe(0); // a8
      expect(rankOf(56)).toBe(7);
      expect(fileOf(28)).toBe(4); // e4
      expect(rankOf(28)).toBe(3);
    });
  });

  describe('opposite', () => {
    it('returns opposite color', () => {
      expect(opposite('w')).toBe('b');
      expect(opposite('b')).toBe('w');
    });
  });

  describe('isValidSquare', () => {
    it('returns true for valid squares', () => {
      expect(isValidSquare(0)).toBe(true);
      expect(isValidSquare(63)).toBe(true);
      expect(isValidSquare(32)).toBe(true);
    });
    it('returns false for invalid squares', () => {
      expect(isValidSquare(-1)).toBe(false);
      expect(isValidSquare(64)).toBe(false);
      expect(isValidSquare(100)).toBe(false);
    });
  });

  describe('INITIAL_FEN', () => {
    it('matches standard starting position', () => {
      expect(INITIAL_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
  });
});
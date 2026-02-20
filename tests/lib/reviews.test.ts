import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getValidTransitions,
} from '@/lib/reviews';
import type { ReviewStatus } from '@/lib/reviews';

describe('Review State Machine', () => {
  describe('isValidTransition', () => {
    // ── Valid transitions ──
    it('pending → approved is valid', () => {
      expect(isValidTransition('pending', 'approved')).toBe(true);
    });

    it('pending → rejected is valid', () => {
      expect(isValidTransition('pending', 'rejected')).toBe(true);
    });

    it('pending → flagged is valid', () => {
      expect(isValidTransition('pending', 'flagged')).toBe(true);
    });

    it('flagged → approved is valid', () => {
      expect(isValidTransition('flagged', 'approved')).toBe(true);
    });

    it('flagged → rejected is valid', () => {
      expect(isValidTransition('flagged', 'rejected')).toBe(true);
    });

    // ── Invalid transitions ──
    it('approved → rejected is INVALID (final state)', () => {
      expect(isValidTransition('approved', 'rejected')).toBe(false);
    });

    it('approved → pending is INVALID', () => {
      expect(isValidTransition('approved', 'pending')).toBe(false);
    });

    it('rejected → approved is INVALID (final state)', () => {
      expect(isValidTransition('rejected', 'approved')).toBe(false);
    });

    it('rejected → flagged is INVALID', () => {
      expect(isValidTransition('rejected', 'flagged')).toBe(false);
    });

    it('approved → flagged is INVALID', () => {
      expect(isValidTransition('approved', 'flagged')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('pending has 3 valid next states', () => {
      const transitions = getValidTransitions('pending');
      expect(transitions).toHaveLength(3);
      expect(transitions).toContain('approved');
      expect(transitions).toContain('rejected');
      expect(transitions).toContain('flagged');
    });

    it('flagged has 2 valid next states', () => {
      const transitions = getValidTransitions('flagged');
      expect(transitions).toHaveLength(2);
      expect(transitions).toContain('approved');
      expect(transitions).toContain('rejected');
    });

    it('approved has 0 valid transitions (final state)', () => {
      expect(getValidTransitions('approved')).toHaveLength(0);
    });

    it('rejected has 0 valid transitions (final state)', () => {
      expect(getValidTransitions('rejected')).toHaveLength(0);
    });
  });

  describe('State Machine completeness', () => {
    const allStates: ReviewStatus[] = ['pending', 'approved', 'rejected', 'flagged'];

    it('every state has a defined transitions array', () => {
      for (const state of allStates) {
        const transitions = getValidTransitions(state);
        expect(Array.isArray(transitions)).toBe(true);
      }
    });

    it('no state can transition to itself', () => {
      for (const state of allStates) {
        expect(isValidTransition(state, state)).toBe(false);
      }
    });

    it('final states (approved, rejected) have no outgoing transitions', () => {
      expect(getValidTransitions('approved')).toEqual([]);
      expect(getValidTransitions('rejected')).toEqual([]);
    });

    it('all transitions lead to valid states', () => {
      for (const state of allStates) {
        const next = getValidTransitions(state);
        for (const target of next) {
          expect(allStates).toContain(target);
        }
      }
    });
  });
});

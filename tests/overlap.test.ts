import { describe, it, expect } from 'vitest';

import { overlapRatio } from '@/app/lib/graph/overlap';

describe('overlapRatio', () => {
  it('is zero for disjoint paths', () => {
    expect(overlapRatio([1, 2, 3], [4, 5, 6])).toBe(0);
  });
  it('is > 0 for overlapping edges', () => {
    expect(overlapRatio([1, 2, 3], [3, 2, 1])).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { computeStreak } from '../../src/modules/users/users.service.js';

const day = (offset: number) => new Date(Date.now() - offset * 86_400_000);

describe('computeStreak', () => {
  it('returns zeros for no activity', () => {
    expect(computeStreak([])).toEqual({ current: 0, longest: 0, activeDays: 0 });
  });

  it('counts a streak that includes today', () => {
    const result = computeStreak([day(0), day(1), day(2), day(5), day(6)]);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.activeDays).toBe(5);
  });

  it('keeps the streak alive if the last activity was yesterday', () => {
    expect(computeStreak([day(1), day(2)]).current).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const result = computeStreak([day(2), day(3), day(4), day(5)]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(4);
  });
});

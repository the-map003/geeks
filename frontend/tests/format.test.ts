import { describe, expect, it } from 'vitest';
import { compactNumber, formatPrice, initials, percent, pluralize, timeAgo } from '../app/utils/format';

describe('format helpers', () => {
  it('compacts numbers', () => {
    expect(compactNumber(999)).toBe('999');
    expect(compactNumber(1500)).toBe('1.5k');
    expect(compactNumber(25600)).toBe('26k');
    expect(compactNumber(1_200_000)).toBe('1.2M');
  });
  it('formats prices', () => {
    expect(formatPrice('0', true)).toBe('Free');
    expect(formatPrice('49.00', false)).toBe('$49');
  });
  it('computes percentages safely', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(1, 0)).toBe(0);
  });
  it('derives initials', () => {
    expect(initials('Asha Student')).toBe('AS');
    expect(initials('mira')).toBe('M');
  });
  it('pluralizes', () => {
    expect(pluralize(1, 'lesson')).toBe('1 lesson');
    expect(pluralize(3, 'lesson')).toBe('3 lessons');
  });
  it('renders relative time', () => {
    expect(timeAgo(new Date())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000))).toBe('3 hours ago');
  });
});

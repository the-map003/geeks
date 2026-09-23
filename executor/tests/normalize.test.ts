import { describe, expect, it } from 'vitest';
import { normalizeOutput, outputsMatch } from '../src/types.js';

describe('output comparison', () => {
  it('ignores trailing whitespace and trailing newlines', () => {
    expect(outputsMatch('1 2 3  \n\n', '1 2 3')).toBe(true);
    expect(outputsMatch('a\r\nb\r\n', 'a\nb')).toBe(true);
  });
  it('is sensitive to content differences', () => {
    expect(outputsMatch('1 2 3', '1 2 4')).toBe(false);
    expect(outputsMatch('true', 'True')).toBe(false);
  });
  it('preserves leading whitespace', () => {
    expect(normalizeOutput('  x')).toBe('  x');
  });
});

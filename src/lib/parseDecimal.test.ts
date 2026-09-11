import { parseDecimal } from './parseDecimal';

describe('parseDecimal', () => {
  it('accepts a dot or a comma as decimal separator', () => {
    expect(parseDecimal('78.5')).toBe(78.5);
    expect(parseDecimal('78,5')).toBe(78.5);
  });

  it('keeps a value typed with a trailing separator', () => {
    expect(parseDecimal('78.')).toBe(78);
  });

  it('treats empty, invalid and non-positive input as not filled in (0)', () => {
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal('abc')).toBe(0);
    expect(parseDecimal('0')).toBe(0);
  });
});

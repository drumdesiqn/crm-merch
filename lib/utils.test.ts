import { describe, it, expect } from 'vitest';
import { cn, formatDateShort, parseLocalDate } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatDateShort', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-06-21T12:00:00.000Z');
    const formatted = formatDateShort(date);
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });
});

describe('parseLocalDate', () => {
  it('parses ISO date string correctly', () => {
    const dateStr = '2024-06-21T12:00:00.000Z';
    const parsed = parseLocalDate(dateStr);
    expect(parsed).toBeInstanceOf(Date);
  });

  it('handles date with time offset', () => {
    const dateStr = '2024-06-21T14:00:00.000+02:00';
    const parsed = parseLocalDate(dateStr);
    expect(parsed).toBeInstanceOf(Date);
  });
});

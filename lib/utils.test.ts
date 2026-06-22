import { describe, it, expect } from 'vitest';
import { cn, formatDateShort, parseLocalDate, escapeHtml } from './utils';
import { validate, NoteSchema, ChatSchema, MailAnalyzeSchema, PatchVisitSchema } from './validation';

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

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('does not double-escape', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});

describe('NoteSchema validation', () => {
  it('accepts valid content', () => {
    const result = validate(NoteSchema, { content: 'Hello world' });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = validate(NoteSchema, { content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content over 2000 chars', () => {
    const result = validate(NoteSchema, { content: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe('ChatSchema validation', () => {
  it('accepts valid messages', () => {
    const result = validate(ChatSchema, {
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty messages array', () => {
    const result = validate(ChatSchema, { messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = validate(ChatSchema, {
      messages: [{ role: 'admin', content: 'Hello' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects messages over 10000 chars', () => {
    const result = validate(ChatSchema, {
      messages: [{ role: 'user', content: 'x'.repeat(10001) }],
    });
    expect(result.success).toBe(false);
  });
});

describe('MailAnalyzeSchema validation', () => {
  it('accepts valid content', () => {
    const result = validate(MailAnalyzeSchema, { content: 'Some mail content' });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = validate(MailAnalyzeSchema, { content: '' });
    expect(result.success).toBe(false);
  });
});

describe('PatchVisitSchema validation', () => {
  it('accepts id + status', () => {
    const result = validate(PatchVisitSchema, { id: 'abc123', status: 'done' });
    expect(result.success).toBe(true);
  });

  it('accepts id + remarks', () => {
    const result = validate(PatchVisitSchema, { id: 'abc123', remarks: 'Some remarks' });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = validate(PatchVisitSchema, { status: 'done' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = validate(PatchVisitSchema, { id: 'abc123', status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

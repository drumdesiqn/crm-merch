import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  it('allows the first request', () => {
    const result = checkRateLimit('test:1', 5, 60 * 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over the limit', () => {
    const key = 'test:2';
    checkRateLimit(key, 2, 60 * 1000);
    checkRateLimit(key, 2, 60 * 1000);
    const result = checkRateLimit(key, 2, 60 * 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets the counter after the window expires', async () => {
    const key = 'test:3';
    checkRateLimit(key, 1, 5);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const result = checkRateLimit(key, 1, 5);
    expect(result.allowed).toBe(true);
  });

  it('tracks different keys independently', () => {
    checkRateLimit('test:a', 1, 60 * 1000);
    const result = checkRateLimit('test:b', 1, 60 * 1000);
    expect(result.allowed).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApi } from './client-api';

describe('fetchApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    } as Response);
    const result = await fetchApi('/api/test');
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null on server error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as Response);
    const result = await fetchApi('/api/test', { suppressToast: true });
    expect(result).toBeNull();
  });

  it('returns null on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response);

    const result = await fetchApi('/api/test', { suppressAuthRedirect: true });
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await fetchApi('/api/test', { suppressToast: true });
    expect(result).toBeNull();
  });
});

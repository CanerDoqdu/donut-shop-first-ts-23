import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeFetch, FetchError } from '@/lib/safe-fetch';

// ─── Test helpers ───────────────────────────────────────────

function mockFetchResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

describe('safeFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────

  it('returns parsed JSON on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ id: 1, name: 'Test' }),
    ));

    const result = await safeFetch<{ id: number; name: string }>('/api/test');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.error).toBeNull();
  });

  it('sends x-request-source header when source provided', async () => {
    const mockFn = vi.fn().mockResolvedValue(mockFetchResponse({ ok: true }));
    vi.stubGlobal('fetch', mockFn);

    await safeFetch('/api/test', { source: 'checkout' });
    const calledHeaders = mockFn.mock.calls[0][1].headers;
    expect(calledHeaders.get('x-request-source')).toBe('checkout');
  });

  // ── Error handling ──────────────────────────────────────

  it('returns error on 4xx without retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ error: 'Not found' }, { status: 404 }),
    ));

    const result = await safeFetch('/api/test');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe('Not found');
  });

  it('retries on 500 for GET requests', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce(mockFetchResponse({ error: 'Server error' }, { status: 500 }))
      .mockResolvedValueOnce(mockFetchResponse({ error: 'Server error' }, { status: 500 }))
      .mockResolvedValueOnce(mockFetchResponse({ success: true }));

    vi.stubGlobal('fetch', mockFn);

    const result = await safeFetch<{ success: boolean }>('/api/test', { retries: 2 });
    expect(result.ok).toBe(true);
    expect(result.data?.success).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry POST requests by default', async () => {
    const mockFn = vi.fn().mockResolvedValue(
      mockFetchResponse({ error: 'Server error' }, { status: 500 }),
    );
    vi.stubGlobal('fetch', mockFn);

    const result = await safeFetch('/api/test', { method: 'POST' });
    expect(result.ok).toBe(false);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  // ── Timeout ─────────────────────────────────────────────

  it('returns timeout error when request exceeds timeout', async () => {
    const controller = new AbortController();
    // Simulate immediate abort (timeout fires instantly)
    vi.stubGlobal('fetch', vi.fn().mockImplementation(
      (_url: string, init: RequestInit) => {
        // The combinedSignal should eventually be aborted by timeout
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      },
    ));

    const promise = safeFetch('/api/test', { timeout: 50, retries: 0 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Request timed out');
  });

  // ── Abort ───────────────────────────────────────────────

  it('returns abort error when external signal fires', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }));

    const result = await safeFetch('/api/test', { signal: controller.signal, retries: 0 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Request aborted');
  });

  // ── Non-JSON response ───────────────────────────────────

  it('handles non-JSON response gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('OK', { status: 200 }),
    ));

    const result = await safeFetch('/api/test');
    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });

  // ── Network error ───────────────────────────────────────

  it('returns network error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await safeFetch('/api/test', { retries: 0 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Failed to fetch');
  });

  // ── FetchError class ───────────────────────────────────

  it('FetchError has correct properties', () => {
    const err = new FetchError('test error', 500, 'E_INTERNAL', true);
    expect(err.message).toBe('test error');
    expect(err.status).toBe(500);
    expect(err.code).toBe('E_INTERNAL');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('FetchError');
  });
});

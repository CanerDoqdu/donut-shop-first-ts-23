import { describe, it, expect, vi } from 'vitest';
import { withTimeout, fetchWithTimeout, retryWithBackoff } from '@/lib/fetch-with-timeout';

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000, 'test');
    expect(result).toBe(42);
  });

  it('rejects when promise exceeds timeout', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 5000));
    await expect(withTimeout(slow, 50, 'slow-op')).rejects.toThrow(
      'slow-op timed out after 50ms',
    );
  });

  it('rejects with original error if promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('boom'));
    await expect(withTimeout(failing, 5000, 'test')).rejects.toThrow('boom');
  });
});

describe('fetchWithTimeout', () => {
  it('calls fetch with abort signal', async () => {
    const mockResponse = new Response('ok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const res = await fetchWithTimeout('http://example.com', { timeoutMs: 5000 });
    expect(res).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toBe('http://example.com');
    expect(callArgs[1]?.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });
});

describe('retryWithBackoff', () => {
  it('succeeds on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxAttempts: 3, timeoutMs: 1000 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('ok');

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      timeoutMs: 1000,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws last error after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      retryWithBackoff(fn, { maxAttempts: 2, baseDelayMs: 10, timeoutMs: 1000 }),
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

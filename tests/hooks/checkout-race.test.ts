import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckoutSubmit } from '@/hooks/use-checkout-submit';
import type { CheckoutPayload } from '@/hooks/use-checkout-submit';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/idempotency', () => ({
  getOrCreateIdempotencyKey: vi.fn(() => 'idem-key-123'),
  clearIdempotencyKey: vi.fn(),
  rotateIdempotencyKey: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    withContext: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockPayload: CheckoutPayload = {
  items: [{ id: 'donut-1', quantity: 2 }],
  customerEmail: 'test@example.com',
  customerName: 'Test User',
  customerAddress: '123 Donut Street',
  locale: 'en',
};

// ── Helpers ──────────────────────────────────────────────────

function mockFetch(
  status: number,
  body: Record<string, unknown>,
  delay = 0,
) {
  return vi.fn(
    () =>
      new Promise<Response>((resolve) =>
        setTimeout(
          () =>
            resolve(
              new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
              }),
            ),
          delay,
        ),
      ),
  );
}

// ── Tests ────────────────────────────────────────────────────

describe('useCheckoutSubmit', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('submits checkout and returns result', async () => {
    global.fetch = mockFetch(200, {
      url: 'https://checkout.stripe.com/session-1',
      orderId: 'order-abc',
    });

    const { result } = renderHook(() => useCheckoutSubmit());

    let checkoutResult: unknown;
    await act(async () => {
      checkoutResult = await result.current.submit(mockPayload);
    });

    expect(checkoutResult).toEqual({
      url: 'https://checkout.stripe.com/session-1',
      orderId: 'order-abc',
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deduplicates concurrent double-click calls', async () => {
    global.fetch = mockFetch(
      200,
      { url: 'https://checkout.stripe.com/s1', orderId: 'ord-1' },
      50, // slow response
    );

    const { result } = renderHook(() => useCheckoutSubmit());

    let p1: Promise<unknown>;
    let p2: Promise<unknown>;

    await act(async () => {
      // Double-click: two rapid submit calls
      p1 = result.current.submit(mockPayload);
      p2 = result.current.submit(mockPayload);

      // Both resolve to the same value
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual(r2);
    });

    // Only 1 fetch call made
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('sets isSubmitting during flight', async () => {
    global.fetch = mockFetch(200, { url: 'u', orderId: 'o' }, 30);

    const { result } = renderHook(() => useCheckoutSubmit());

    expect(result.current.isSubmitting).toBe(false);

    let submitPromise: Promise<unknown>;
    act(() => {
      submitPromise = result.current.submit(mockPayload);
    });

    // Should be submitting immediately after calling
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      await submitPromise!;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('handles 409 conflict with orderId (replay-safe)', async () => {
    global.fetch = mockFetch(409, {
      orderId: 'existing-order-99',
      error: 'Duplicate checkout request',
    });

    const { result } = renderHook(() => useCheckoutSubmit());

    let checkoutResult: unknown;
    await act(async () => {
      checkoutResult = await result.current.submit(mockPayload);
    });

    // Treated as success — existing order returned
    expect(checkoutResult).toEqual({
      url: '',
      orderId: 'existing-order-99',
    });
    expect(result.current.error).toBeNull();
  });

  it('handles 409 conflict without orderId (throws)', async () => {
    global.fetch = mockFetch(409, { error: 'Duplicate checkout request' });

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await expect(result.current.submit(mockPayload)).rejects.toThrow(
        'Duplicate checkout request',
      );
    });

    expect(result.current.error).toBe('Duplicate checkout request');
  });

  it('handles server error (500)', async () => {
    global.fetch = mockFetch(500, { error: 'Internal server error' });

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await expect(result.current.submit(mockPayload)).rejects.toThrow(
        'Internal server error',
      );
    });

    expect(result.current.error).toBe('Internal server error');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handles network error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')));

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await expect(result.current.submit(mockPayload)).rejects.toThrow(
        'Network failure',
      );
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('clears error with clearError', async () => {
    global.fetch = mockFetch(500, { error: 'Oops' });

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await result.current.submit(mockPayload).catch(() => {});
    });

    expect(result.current.error).toBe('Oops');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('allows retry after failure (inflight cleared)', async () => {
    let callCount = 0;

    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'fail' }), { status: 500 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ url: 'https://checkout.stripe.com/s2', orderId: 'ord-2' }),
          { status: 200 },
        ),
      );
    });

    const { result } = renderHook(() => useCheckoutSubmit());

    // First attempt: fails
    await act(async () => {
      await result.current.submit(mockPayload).catch(() => {});
    });

    expect(result.current.error).toBe('fail');

    // Second attempt: succeeds (inflight should be cleared)
    let retryResult: unknown;
    await act(async () => {
      retryResult = await result.current.submit(mockPayload);
    });

    expect(retryResult).toEqual({
      url: 'https://checkout.stripe.com/s2',
      orderId: 'ord-2',
    });
    expect(callCount).toBe(2);
  });

  it('sends idempotency key in header and body', async () => {
    global.fetch = mockFetch(200, { url: 'u', orderId: 'o' });

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await result.current.submit(mockPayload);
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/checkout');
    expect(options.headers['X-Idempotency-Key']).toBe('idem-key-123');

    const body = JSON.parse(options.body);
    expect(body.idempotencyKey).toBe('idem-key-123');
  });

  it('rotates idempotency key on success', async () => {
    const { rotateIdempotencyKey } = await import('@/lib/idempotency');

    global.fetch = mockFetch(200, { url: 'u', orderId: 'o' });

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await result.current.submit(mockPayload);
    });

    expect(rotateIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it('handles response with no JSON body gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    const { result } = renderHook(() => useCheckoutSubmit());

    await act(async () => {
      await expect(result.current.submit(mockPayload)).rejects.toThrow(
        'Checkout failed',
      );
    });

    expect(result.current.error).toBe('Checkout failed');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'classic-donut',
  name_tr: 'Klasik Donut',
  name_en: 'Classic Donut',
  description_tr: '',
  description_en: '',
  price: 5,
  image_url: '/donut.png',
  category: 'glazed',
  stock: 10,
  featured: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

function mockFetchJson(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/**
 * useAddToCart integration tests.
 *
 * Tests the real hook via renderHook with mocked fetch for stock validation.
 * Validates:
 *  1. Optimistic update: cart updates immediately before API responds
 *  2. Rollback on insufficient stock: cart reverts when stock < requested
 *  3. Rollback on server error (500): stock validation failed → revert
 *  4. Graceful degradation: network error keeps the optimistic update
 *  5. Dedup: rapid calls abort previous fetch via AbortController
 *  6. justAdded feedback: true for 1.5s after success
 *  7. Error messages: "out of stock" vs "Only N left"
 */

describe('useAddToCart', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset Zustand store between tests
    useCartStore.setState({ items: [], cartTimestamp: 0, generation: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Optimistic update ──────────────────────────────────

  it('adds item to cart immediately (optimistic)', async () => {
    const fetchMock = mockFetchJson({ stock: 10 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAddToCart());
    const product = makeProduct();

    act(() => {
      result.current.addToCart(product, 2);
    });

    // Cart updated BEFORE fetch resolves
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('p1');
    expect(items[0].quantity).toBe(2);
    expect(result.current.status).toBe('adding');
  });

  it('transitions to "added" when stock is sufficient', async () => {
    const fetchMock = mockFetchJson({ stock: 10 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 1);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('added');
    });
    expect(result.current.justAdded).toBe(true);
    expect(result.current.error).toBeNull();

    // Cart item kept
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('justAdded resets to false after 1.5s', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 10 }));

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 1);
    });

    await waitFor(() => expect(result.current.justAdded).toBe(true));

    // Advance past the 1.5s timer
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.justAdded).toBe(false);
  });

  // ── Rollback on insufficient stock ─────────────────────

  it('rolls back when server stock < requested (new product)', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 0 }));

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 2);
    });

    // Optimistic add happened
    expect(useCartStore.getState().items).toHaveLength(1);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    // Rollback: item removed entirely (previousQuantity was 0)
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(result.current.error).toBe('This product is out of stock');
  });

  it('rolls back to previous quantity when stock insufficient (existing product)', async () => {
    // Pre-populate cart with 3 of this product
    const product = makeProduct();
    useCartStore.getState().addItem(product, 3);
    expect(useCartStore.getState().items[0].quantity).toBe(3);

    // Server says only 3 in stock, but we're requesting 3 + 2 = 5
    vi.stubGlobal('fetch', mockFetchJson({ stock: 3 }));

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(product, 2);
    });

    // Optimistic: quantity bumped to 5
    expect(useCartStore.getState().items[0].quantity).toBe(5);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    // Rollback: quantity reverted to 3
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(result.current.error).toBe('Only 3 left in stock');
  });

  // ── Rollback on server error ───────────────────────────

  it('rolls back on 500 (stock validation failed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 })),
    );

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 1);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    // Rollback: item removed
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(result.current.error).toBe('Could not verify stock. Please try again.');
  });

  // ── Graceful degradation on network error ──────────────

  it('keeps optimistic update on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 1);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('added');
    });

    // Cart item kept (graceful degradation)
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  // ── Dedup: abort controller ────────────────────────────

  it('aborts previous fetch when addToCart is called rapidly', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      const currentCall = callCount;
      return new Promise<Response>((resolve, reject) => {
        // Check abort before resolving
        const timer = setTimeout(() => {
          if (init?.signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
          } else {
            resolve(new Response(JSON.stringify({ stock: 10 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
        }, currentCall === 1 ? 2000 : 100); // First call slow, second fast

        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAddToCart());
    const product = makeProduct();

    // First call
    act(() => {
      result.current.addToCart(product, 1);
    });

    // Second call immediately — should abort first
    act(() => {
      result.current.addToCart(product, 1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(result.current.status).toBe('added');
    });
  });

  // ── Error message variants ─────────────────────────────

  it('shows "out of stock" when server stock is 0', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 0 }));
    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 1);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('This product is out of stock');
    });
  });

  it('shows "Only N left" when server stock < requested', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 2 }));
    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct(), 5);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Only 2 left in stock');
    });
  });

  // ── Quantity accumulation ──────────────────────────────

  it('accumulates quantity when adding same product twice (stock OK)', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 50 }));
    const { result } = renderHook(() => useAddToCart());
    const product = makeProduct();

    act(() => {
      result.current.addToCart(product, 2);
    });

    await waitFor(() => expect(result.current.status).toBe('added'));

    act(() => {
      result.current.addToCart(product, 3);
    });

    await waitFor(() => expect(result.current.status).toBe('added'));

    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  // ── Default quantity ───────────────────────────────────

  it('defaults to quantity 1 when not specified', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stock: 10 }));
    const { result } = renderHook(() => useAddToCart());

    act(() => {
      result.current.addToCart(makeProduct());
    });

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  // ── Return shape ───────────────────────────────────────

  it('returns correct shape with initial state', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useAddToCart());

    expect(result.current).toEqual({
      status: 'idle',
      justAdded: false,
      error: null,
      addToCart: expect.any(Function),
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cross-tab cart sync tests.
 *
 * Validates that when another tab modifies cart in localStorage,
 * this tab's cart store picks up the changes via the 'storage' event.
 */

// We need to test the store module's behavior with storage events.
// Since the listener is registered at module level, we test the rehydration logic directly.

describe('cart-store cross-tab sync', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rehydrateFromStorage updates cart items from localStorage', async () => {
    // Mock localStorage
    const storedData = JSON.stringify({
      state: {
        items: [
          {
            product: { id: 'p1', slug: 'donut-1', name_tr: 'Test', name_en: 'Test', description_tr: '', description_en: '', price: 5, image_url: '', category: 'glazed', stock: 10, featured: false, created_at: '' },
            quantity: 3,
          },
        ],
        cartTimestamp: Date.now(),
        generation: 5,
      },
      version: 0,
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'donut-cart-storage' ? storedData : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');
    const store = useCartStore.getState();

    // Before rehydration — cart should be empty (default)
    // (Store just initialized with defaults in this test context)

    // Simulate cross-tab sync
    store.rehydrateFromStorage();

    // After rehydration
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe('p1');
    expect(state.items[0].quantity).toBe(3);
    expect(state.generation).toBe(5);
  });

  it('rehydrateFromStorage handles empty localStorage gracefully', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');
    const store = useCartStore.getState();

    // Should not throw
    store.rehydrateFromStorage();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
  });

  it('rehydrateFromStorage handles corrupt JSON gracefully', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'not-valid-json{{{'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');
    const store = useCartStore.getState();

    // Should not throw
    store.rehydrateFromStorage();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
  });

  it('generation counter increments on addItem', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');
    const initialGen = useCartStore.getState().generation;

    useCartStore.getState().addItem(
      { id: 'p1', slug: 'donut', name_tr: 'T', name_en: 'T', description_tr: '', description_en: '', price: 5, image_url: '', category: 'glazed', stock: 10, featured: false, created_at: '' },
      1,
    );

    expect(useCartStore.getState().generation).toBe(initialGen + 1);
  });

  it('generation counter increments on removeItem', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');

    // Add then remove
    useCartStore.getState().addItem(
      { id: 'p1', slug: 'donut', name_tr: 'T', name_en: 'T', description_tr: '', description_en: '', price: 5, image_url: '', category: 'glazed', stock: 10, featured: false, created_at: '' },
      1,
    );
    const genAfterAdd = useCartStore.getState().generation;

    useCartStore.getState().removeItem('p1');
    expect(useCartStore.getState().generation).toBe(genAfterAdd + 1);
  });

  it('generation counter increments on clearCart', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const { useCartStore } = await import('@/store/cart-store');
    const genBefore = useCartStore.getState().generation;

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().generation).toBe(genBefore + 1);
  });
});

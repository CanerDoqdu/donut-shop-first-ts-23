import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '@/lib/types';

interface CartStore {
  items: CartItem[];
  cartTimestamp: number;
  /** Generation counter — increments on every mutation for cross-tab diffing */
  generation: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  /** Rehydrate from localStorage (cross-tab sync) */
  rehydrateFromStorage: () => void;
}

const STORAGE_KEY = 'donut-cart-storage';

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      // Timestamp for cart creation/update
      cartTimestamp: 0,
      generation: 0,

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find(item => item.product.id === product.id);
        // Update timestamp on add
        const gen = get().generation + 1;
        set({ cartTimestamp: Date.now(), generation: gen });
        if (existingItem) {
          set({
            items: items.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity }] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.product.id !== productId),
          cartTimestamp: Date.now(),
          generation: get().generation + 1,
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
          cartTimestamp: Date.now(),
          generation: get().generation + 1,
        });
      },

      clearCart: () => {
        set({ items: [], cartTimestamp: Date.now(), generation: get().generation + 1 });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      rehydrateFromStorage: () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const state = parsed?.state;
          if (!state) return;
          set({
            items: state.items ?? [],
            cartTimestamp: state.cartTimestamp ?? Date.now(),
            generation: state.generation ?? 0,
          });
        } catch {
          // parse failed — silent
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Custom hydration to clear cart if expired
      onRehydrateStorage: (state) => {
        if (!state) return;
        const now = Date.now();
        const cartTimestamp = state.cartTimestamp || 0;
        // 2 days in ms
        const expireMs = 2 * 24 * 60 * 60 * 1000;
        if (now - cartTimestamp > expireMs) {
          // Clear cart if expired
          state.items = [];
          state.cartTimestamp = now;
        }
      },
    }
  )
);

// ─── Cross-tab sync listener ────────────────────────────────────
// When another tab modifies cart in localStorage, rehydrate this tab.
// This is a module-level listener — runs once when the store module loads.

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    // Rehydrate from the new localStorage value
    useCartStore.getState().rehydrateFromStorage();
  });
}

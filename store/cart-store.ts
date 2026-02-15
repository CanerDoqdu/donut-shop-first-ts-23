import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '@/lib/types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      // Timestamp for cart creation/update
      cartTimestamp: Date.now(),

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find(item => item.product.id === product.id);
        // Update timestamp on add
        set({ cartTimestamp: Date.now() });
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
        set({ items: get().items.filter(item => item.product.id !== productId) });
        set({ cartTimestamp: Date.now() });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({ cartTimestamp: Date.now() });
        set({
          items: get().items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [], cartTimestamp: Date.now() });
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
    }),
    {
      name: 'donut-cart-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
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

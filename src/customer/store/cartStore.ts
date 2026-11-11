/** Customer shopping cart — persisted to the device so it survives app restarts. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: number;
  name: string;
  slug: string;
  price: number;
  image?: string;
  maxQty: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((x) => x.productId === item.productId);
          const cap = item.maxQty || 99;
          if (existing) {
            return {
              items: s.items.map((x) =>
                x.productId === item.productId
                  ? { ...x, quantity: Math.min(x.quantity + qty, cap) }
                  : x,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(qty, cap) }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((x) => x.productId !== productId)
              : s.items.map((x) =>
                  x.productId === productId
                    ? { ...x, quantity: Math.min(qty, x.maxQty || 99) }
                    : x,
                ),
        })),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((x) => x.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'customer-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const cartCount = (items: CartItem[]) =>
  items.reduce((n, x) => n + x.quantity, 0);
export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((n, x) => n + x.price * x.quantity, 0);

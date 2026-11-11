import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Customer, Product, POSCart, POSCartItem, PaymentMethod, POSSale } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface POSState {
  cart: POSCart;
  selectedCustomer: Customer | null;
  paymentMethod: PaymentMethod;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  salesHistory: POSSale[];
  draftOrders: POSSale[];
}

interface POSActions {
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDiscount: (discount: number, type: 'percentage' | 'fixed') => void;
  setNotes: (notes: string) => void;
  calculateTotals: () => void;
  completeSale: () => POSSale;
  saveDraft: () => POSSale;
  loadDraft: (draftId: string) => void;
  deleteDraft: (draftId: string) => void;
  cancelSale: (saleId: string) => void;
  reset: () => void;
}

const emptyCart: POSCart = {
  items: [],
  customerId: undefined,
  customer: undefined,
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
};

const initialState: POSState = {
  cart: emptyCart,
  selectedCustomer: null,
  paymentMethod: 'cash',
  discount: 0,
  discountType: 'percentage',
  notes: '',
  salesHistory: [],
  draftOrders: [],
};

const generateReceiptNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.getTime().toString().slice(-6);
  return `RCP-${dateStr}-${timeStr}`;
};

const calculateItemTotal = (item: POSCartItem): POSCartItem => {
  const subtotal = (item.price || 0) * (item.quantity || 0);
  const discountAmount = item.discount || 0;
  const taxableAmount = subtotal - discountAmount;
  const taxRate = item.product?.taxRate ?? 0;
  const taxAmount = (taxableAmount * taxRate) / 100;
  return {
    ...item,
    tax: taxAmount,
    total: taxableAmount + taxAmount,
  };
};

export const usePOSStore = create<POSState & POSActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addToCart: (product, quantity = 1) => {
        const { cart } = get();
        const existingIndex = cart.items.findIndex(
          (item) => item.productId === product.id
        );

        let newItems: POSCartItem[];

        if (existingIndex >= 0) {
          newItems = cart.items.map((item, index) =>
            index === existingIndex
              ? calculateItemTotal({
                  ...item,
                  quantity: item.quantity + quantity,
                })
              : item
          );
        } else {
          const newItem: POSCartItem = calculateItemTotal({
            productId: product.id,
            product,
            quantity,
            price: product.price,
            discount: 0,
            tax: 0,
            total: 0,
          });
          newItems = [...cart.items, newItem];
        }

        set({ cart: { ...cart, items: newItems } });
        get().calculateTotals();
      },

      removeFromCart: (productId) => {
        const { cart } = get();
        const newItems = cart.items.filter(
          (item) => item.productId !== productId
        );
        set({ cart: { ...cart, items: newItems } });
        get().calculateTotals();
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        const { cart } = get();
        const newItems = cart.items.map((item) =>
          item.productId === productId
            ? calculateItemTotal({ ...item, quantity })
            : item
        );
        set({ cart: { ...cart, items: newItems } });
        get().calculateTotals();
      },

      clearCart: () => {
        set({ cart: emptyCart });
      },

      setCustomer: (customer) => {
        set({
          selectedCustomer: customer,
          cart: {
            ...get().cart,
            customerId: customer?.id,
            customer: customer ?? undefined,
          },
        });
      },

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

      setDiscount: (discount, discountType) => {
        set({ discount, discountType });
        get().calculateTotals();
      },

      setNotes: (notes) => set({ notes }),

      calculateTotals: () => {
        const { cart, discount, discountType } = get();

        const subtotal = cart.items.reduce(
          (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
          0
        );

        let discountAmount: number;
        if (discountType === 'percentage') {
          discountAmount = (subtotal * discount) / 100;
        } else {
          discountAmount = discount;
        }

        const taxableAmount = subtotal - discountAmount;
        const tax = cart.items.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
        const total = Math.round(taxableAmount + tax);

        set({
          cart: {
            ...cart,
            subtotal,
            discount: discountAmount,
            tax,
            total,
          },
        });
      },

      completeSale: () => {
        const { cart, selectedCustomer, paymentMethod, notes, salesHistory } = get();
        const sale: POSSale = {
          id: `sale-${Date.now()}`,
          receiptNumber: generateReceiptNumber(),
          items: cart.items,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          subtotal: cart.subtotal,
          discount: cart.discount,
          tax: cart.tax,
          total: cart.total,
          paymentMethod,
          status: 'completed',
          notes,
          createdAt: new Date().toISOString(),
        };
        set({
          salesHistory: [sale, ...salesHistory],
          cart: emptyCart,
          selectedCustomer: null,
          notes: '',
          discount: 0,
        });
        return sale;
      },

      saveDraft: () => {
        const { cart, selectedCustomer, paymentMethod, notes, draftOrders } = get();
        const draft: POSSale = {
          id: `draft-${Date.now()}`,
          receiptNumber: generateReceiptNumber(),
          items: cart.items,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          subtotal: cart.subtotal,
          discount: cart.discount,
          tax: cart.tax,
          total: cart.total,
          paymentMethod,
          status: 'draft',
          notes,
          createdAt: new Date().toISOString(),
        };
        set({
          draftOrders: [draft, ...draftOrders],
          cart: emptyCart,
          selectedCustomer: null,
          notes: '',
          discount: 0,
        });
        return draft;
      },

      loadDraft: (draftId: string) => {
        const { draftOrders } = get();
        const draft = draftOrders.find((d) => d.id === draftId);
        if (draft) {
          set({
            cart: {
              items: draft.items,
              customerId: draft.customerId,
              customer: undefined,
              subtotal: draft.subtotal,
              discount: draft.discount,
              tax: draft.tax,
              total: draft.total,
            },
            notes: draft.notes || '',
            draftOrders: draftOrders.filter((d) => d.id !== draftId),
          });
        }
      },

      deleteDraft: (draftId: string) => {
        const { draftOrders } = get();
        set({ draftOrders: draftOrders.filter((d) => d.id !== draftId) });
      },

      cancelSale: (saleId: string) => {
        const { salesHistory } = get();
        set({
          salesHistory: salesHistory.map((s) =>
            s.id === saleId ? { ...s, status: 'cancelled' } : s
          ),
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.CART,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cart: state.cart,
        selectedCustomer: state.selectedCustomer,
        salesHistory: state.salesHistory,
        draftOrders: state.draftOrders,
      }),
      merge: (persisted, current) => {
        const stored = (persisted || {}) as Partial<POSState>;
        return {
          ...current,
          ...stored,
          cart: stored.cart && Array.isArray(stored.cart.items) ? stored.cart : emptyCart,
        };
      },
    }
  )
);

// Selectors
export const selectCart = (state: POSState) => state.cart;
export const selectCartItems = (state: POSState) => state.cart.items;
export const selectCartTotal = (state: POSState) => state.cart.total;
export const selectCartItemCount = (state: POSState) =>
  state.cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
export const selectSelectedCustomer = (state: POSState) => state.selectedCustomer;

/**
 * Cart state store using Zustand — synced with backend.
 * Automatically handles customer sessions and keeps cart state synchronized.
 */
import { create } from "zustand";
import cartApi, { Cart, CartItem } from "@/lib/api/cart";
import { tokenStorage } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,

  fetchCart: async () => {
    const token = tokenStorage.getAccess();
    if (!token) return;
    set({ isLoading: true });
    try {
      const cart = await cartApi.get();
      set({ cart });
    } catch {
      // silent catch for unauthenticated initial load
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity) => {
    const token = tokenStorage.getAccess();
    if (!token) return;
    const cart = await cartApi.addItem(productId, quantity);
    set({ cart });
  },

  updateItem: async (itemId, quantity) => {
    const token = tokenStorage.getAccess();
    if (!token) return;
    const cart = await cartApi.updateItem(itemId, quantity);
    set({ cart });
  },

  removeItem: async (itemId) => {
    const token = tokenStorage.getAccess();
    if (!token) return;
    const cart = await cartApi.removeItem(itemId);
    set({ cart });
  },

  clearCart: async () => {
    try {
      await cartApi.clear();
    } catch {}
    set({ cart: null });
  },

  reset: () => set({ cart: null }),
}));

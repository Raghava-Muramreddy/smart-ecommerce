/**
 * Authentication state store using Zustand.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import authApi, { UserProfile } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/api/client";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  socialLogin: (auth0Token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          await authApi.login({ email, password });
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          await authApi.register({ name, email, password });
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        // Optimistically clear local state immediately
        set({ user: null, isAuthenticated: false });
        
        try {
          await authApi.logout();
        } catch (e) {
          console.error("Logout API request failed silently", e);
        }
      },

      fetchMe: async () => {
        const token = tokenStorage.getAccess();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
          tokenStorage.clear();
        }
      },

      socialLogin: async (auth0Token: string) => {
        await authApi.socialLogin(auth0Token);
        const user = await authApi.getMe();
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

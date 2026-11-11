import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setTenantSlug: (slug: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, token: string, refreshToken: string, tenantSlug: string) => void;
  logout: () => void;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  tenantSlug: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  _hasHydrated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (token, refreshToken) =>
        set({
          token,
          refreshToken,
        }),

      setTenantSlug: (tenantSlug) => set({ tenantSlug }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      login: (user, token, refreshToken, tenantSlug) =>
        set({
          user,
          token,
          refreshToken,
          tenantSlug,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      logout: () =>
        set({
          ...initialState,
          _hasHydrated: true,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: STORAGE_KEYS.USER,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
export const selectTenantSlug = (state: AuthState) => state.tenantSlug;
export const selectHasHydrated = (state: AuthState & { _hasHydrated: boolean }) => state._hasHydrated;

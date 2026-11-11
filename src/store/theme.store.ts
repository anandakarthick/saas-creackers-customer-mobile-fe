import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

// Theme config from API — mirrors the fields stored on the tenant's Theme row.
export interface ThemeConfig {
  primaryColor: string;      // accentColor  — main buttons, active states
  secondaryColor: string;    // actionTo / badgeBg — accent of accents
  sidebarColor: string;      // drawer bg (usually white)
  themeMode: 'light' | 'dark';
  // Richer palette from the backend Theme row (optional — fall back to derived palette).
  accentLight?: string;
  accentDark?: string;
  actionFrom?: string;
  actionTo?: string;
  badgeBg?: string;
  heroFrom?: string;
  heroVia?: string;
  heroTo?: string;
}

interface ThemeState {
  themeConfig: ThemeConfig | null;
  isThemeLoaded: boolean;
}

interface ThemeActions {
  setThemeConfig: (config: ThemeConfig) => void;
  resetTheme: () => void;
}

// Initial fallback shown briefly while the tenant's real theme loads
// from the DB via useTenantTheme. Each company's actual theme replaces
// this as soon as the /api/store/info call returns.
export const defaultThemeConfig: ThemeConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#6366f1',
  sidebarColor: '#FFFFFF',
  themeMode: 'light',
  accentLight: '#60a5fa',
  accentDark: '#2563eb',
  actionFrom: '#3b82f6',
  actionTo: '#6366f1',
  badgeBg: '#3b82f6',
};

const initialState: ThemeState = {
  themeConfig: null,
  isThemeLoaded: false,
};

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      ...initialState,

      setThemeConfig: (themeConfig) => set({ themeConfig, isThemeLoaded: true }),

      resetTheme: () => set({ themeConfig: null, isThemeLoaded: false }),
    }),
    {
      name: STORAGE_KEYS.THEME + '_config',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selectors
export const selectThemeConfig = (state: ThemeState) => state.themeConfig;
export const selectIsThemeLoaded = (state: ThemeState) => state.isThemeLoaded;

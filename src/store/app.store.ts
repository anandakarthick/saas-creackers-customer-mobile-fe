import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Branch } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface AppState {
  isLoading: boolean;
  isInitialized: boolean;
  currentBranch: Branch | null;
  isDarkMode: boolean;
  language: string;
  isOnline: boolean;
  lastSyncTime: string | null;
}

interface AppActions {
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setLanguage: (language: string) => void;
  setOnline: (isOnline: boolean) => void;
  setLastSyncTime: (time: string | null) => void;
  reset: () => void;
}

const initialState: AppState = {
  isLoading: false,
  isInitialized: false,
  currentBranch: null,
  isDarkMode: false,
  language: 'en',
  isOnline: true,
  lastSyncTime: null,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      ...initialState,

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      setCurrentBranch: (currentBranch) => set({ currentBranch }),

      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      setDarkMode: (isDarkMode) => set({ isDarkMode }),

      setLanguage: (language) => set({ language }),

      setOnline: (isOnline) => set({ isOnline }),

      setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.THEME,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        language: state.language,
        currentBranch: state.currentBranch,
      }),
    }
  )
);

// Selectors
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectIsInitialized = (state: AppState) => state.isInitialized;
export const selectCurrentBranch = (state: AppState) => state.currentBranch;
export const selectIsDarkMode = (state: AppState) => state.isDarkMode;
export const selectLanguage = (state: AppState) => state.language;
export const selectIsOnline = (state: AppState) => state.isOnline;

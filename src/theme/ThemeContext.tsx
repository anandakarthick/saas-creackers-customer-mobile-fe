import React, { createContext, useContext, useMemo } from 'react';
import { useThemeStore, defaultThemeConfig, ThemeConfig } from '@/store/theme.store';
import { generateColorPalette, isLightColor, ColorPalette } from '@/utils/colorUtils';

// Dynamic colors structure
export interface DynamicColors {
  primary: ColorPalette;
  secondary: ColorPalette;
  sidebar: {
    background: string;
    text: string;
  };
  // Keep static semantic colors
  accent: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  info: ColorPalette;
  // Neutral colors
  neutral: {
    0: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    1000: string;
  };
  // Background colors
  background: {
    default: string;
    paper: string;
    elevated: string;
    disabled: string;
  };
  // Surface colors
  surface: {
    default: string;
    variant: string;
    disabled: string;
  };
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  // Border colors
  border: {
    default: string;
    focus: string;
    error: string;
  };
  // Status colors
  status: {
    pending: string;
    processing: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    refunded: string;
  };
  // Stock status
  stock: {
    inStock: string;
    lowStock: string;
    outOfStock: string;
  };
}

export interface ThemeContextValue {
  colors: DynamicColors;
  themeConfig: ThemeConfig;
  isDarkMode: boolean;
}

// Static colors that don't change
const staticColors = {
  accent: {
    main: '#F97316',
    light: '#FB923C',
    dark: '#EA580C',
    contrast: '#FFFFFF',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrast: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrast: '#000000',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrast: '#FFFFFF',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrast: '#FFFFFF',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    1000: '#000000',
  },
  status: {
    pending: '#F59E0B',
    processing: '#3B82F6',
    shipped: '#8B5CF6',
    delivered: '#10B981',
    cancelled: '#EF4444',
    refunded: '#6B7280',
  },
  stock: {
    inStock: '#10B981',
    lowStock: '#F59E0B',
    outOfStock: '#EF4444',
  },
};

// Light mode colors
const lightModeColors = {
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    disabled: '#E2E8F0',
  },
  surface: {
    default: '#FFFFFF',
    variant: '#F1F5F9',
    disabled: '#E2E8F0',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    disabled: '#CBD5E1',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    focus: '#DC2626', // Will be overridden by primary
    error: '#EF4444',
  },
};

// Dark mode colors
const darkModeColors = {
  background: {
    default: '#0F172A',
    paper: '#1E293B',
    elevated: '#334155',
    disabled: '#475569',
  },
  surface: {
    default: '#1E293B',
    variant: '#334155',
    disabled: '#475569',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    disabled: '#64748B',
    inverse: '#0F172A',
  },
  border: {
    default: '#334155',
    focus: '#DC2626', // Will be overridden by primary
    error: '#EF4444',
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeConfig = useThemeStore((s) => s.themeConfig) ?? defaultThemeConfig;

  const value = useMemo<ThemeContextValue>(() => {
    const isDarkMode = themeConfig.themeMode === 'dark';
    const modeColors = isDarkMode ? darkModeColors : lightModeColors;

    // Generate dynamic color palettes.
    // Prefer the exact light/dark shades from the backend theme when
    // available — they match the web admin's palette precisely. Fall
    // back to auto-computed ±15% for tenants without a rich theme ref.
    const primaryColor = themeConfig.primaryColor || defaultThemeConfig.primaryColor;
    const secondaryColor = themeConfig.secondaryColor || defaultThemeConfig.secondaryColor;

    const basePrimary = generateColorPalette(primaryColor);
    const primaryPalette: ColorPalette = {
      main: primaryColor,
      light: themeConfig.accentLight || basePrimary.light,
      dark: themeConfig.accentDark || basePrimary.dark,
      contrast: basePrimary.contrast,
    };

    const baseSecondary = generateColorPalette(secondaryColor);
    const secondaryPalette: ColorPalette = {
      main: secondaryColor,
      light: baseSecondary.light,
      dark: baseSecondary.dark,
      contrast: baseSecondary.contrast,
    };

    // Determine sidebar colors — in dark mode, override to dark surface
    const sidebarBg = isDarkMode ? darkModeColors.background.paper : (themeConfig.sidebarColor || '#FFFFFF');
    const sidebarTextColor = isDarkMode
      ? darkModeColors.text.primary
      : isLightColor(themeConfig.sidebarColor || '#FFFFFF')
        ? '#0F172A'
        : '#FFFFFF';

    const colors: DynamicColors = {
      primary: primaryPalette,
      secondary: secondaryPalette,
      sidebar: {
        background: sidebarBg,
        text: sidebarTextColor,
      },
      ...staticColors,
      ...modeColors,
      border: {
        ...modeColors.border,
        focus: primaryColor,
      },
    };

    return {
      colors,
      themeConfig,
      isDarkMode,
    };
  }, [themeConfig]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export helper to get colors outside of React components (for StyleSheet)
// This returns the current theme config from the store
export const getThemeColors = (): DynamicColors => {
  const themeConfig = useThemeStore.getState().themeConfig ?? defaultThemeConfig;
  const isDarkMode = themeConfig.themeMode === 'dark';
  const modeColors = isDarkMode ? darkModeColors : lightModeColors;

  const primaryColor = themeConfig.primaryColor || defaultThemeConfig.primaryColor;
  const secondaryColor = themeConfig.secondaryColor || defaultThemeConfig.secondaryColor;

  const basePrimary = generateColorPalette(primaryColor);
  const primaryPalette: ColorPalette = {
    main: primaryColor,
    light: themeConfig.accentLight || basePrimary.light,
    dark: themeConfig.accentDark || basePrimary.dark,
    contrast: basePrimary.contrast,
  };
  const secondaryPalette = generateColorPalette(secondaryColor);

  const sidebarColor = themeConfig.sidebarColor || '#FFFFFF';
  const sidebarBg = isDarkMode ? darkModeColors.background.paper : sidebarColor;
  const sidebarTextColor = isDarkMode
    ? darkModeColors.text.primary
    : isLightColor(sidebarColor)
      ? '#0F172A'
      : '#FFFFFF';

  return {
    primary: primaryPalette,
    secondary: secondaryPalette,
    sidebar: {
      background: sidebarBg,
      text: sidebarTextColor,
    },
    ...staticColors,
    ...modeColors,
    border: {
      ...modeColors.border,
      focus: primaryColor,
    },
  };
};

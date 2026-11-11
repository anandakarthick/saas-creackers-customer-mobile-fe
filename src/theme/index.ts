import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

// React Native Paper MD3 Theme Configuration
const fontConfig = {
  displayLarge: typography.variants.h1,
  displayMedium: typography.variants.h2,
  displaySmall: typography.variants.h3,
  headlineLarge: typography.variants.h2,
  headlineMedium: typography.variants.h3,
  headlineSmall: typography.variants.h4,
  titleLarge: typography.variants.h4,
  titleMedium: typography.variants.h5,
  titleSmall: typography.variants.h6,
  bodyLarge: typography.variants.body1,
  bodyMedium: typography.variants.body2,
  bodySmall: typography.variants.caption,
  labelLarge: typography.variants.button,
  labelMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  labelSmall: typography.variants.overline,
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary.main,
    primaryContainer: colors.primary.light,
    secondary: colors.secondary.main,
    secondaryContainer: colors.secondary.light,
    tertiary: colors.accent.main,
    tertiaryContainer: colors.accent.light,
    surface: colors.surface.default,
    surfaceVariant: colors.surface.variant,
    surfaceDisabled: colors.surface.disabled,
    background: colors.background.default,
    error: colors.error.main,
    errorContainer: colors.error.light,
    onPrimary: colors.primary.contrast,
    onPrimaryContainer: colors.primary.dark,
    onSecondary: colors.secondary.contrast,
    onSecondaryContainer: colors.secondary.dark,
    onTertiary: colors.accent.contrast,
    onTertiaryContainer: colors.accent.dark,
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    onSurfaceDisabled: colors.text.disabled,
    onError: colors.error.contrast,
    onErrorContainer: colors.error.dark,
    onBackground: colors.text.primary,
    outline: colors.border.default,
    outlineVariant: colors.neutral[200],
    inverseSurface: colors.neutral[800],
    inverseOnSurface: colors.text.inverse,
    inversePrimary: colors.primary.light,
    elevation: {
      level0: 'transparent',
      level1: colors.surface.default,
      level2: colors.surface.default,
      level3: colors.surface.variant,
      level4: colors.surface.variant,
      level5: colors.surface.variant,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: borderRadius.md,
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  paper: paperTheme,
} as const;

export type AppTheme = typeof theme;

export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, shadows } from './spacing';
export { ThemeProvider, useTheme, getThemeColors, type DynamicColors, type ThemeContextValue } from './ThemeContext';

// Utility functions for color manipulation

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex || typeof hex !== 'string') return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex color
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Lighten a color by percentage
 */
export const lightenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex || '#3b82f6';

  const { r, g, b } = rgb;
  const amount = Math.round(255 * (percent / 100));

  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount)
  );
};

/**
 * Darken a color by percentage
 */
export const darkenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex || '#2563eb';

  const { r, g, b } = rgb;
  const amount = Math.round(255 * (percent / 100));

  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount)
  );
};

/**
 * Get luminance of a color (for determining contrast)
 */
export const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Determine if color is light or dark
 */
export const isLightColor = (hex: string): boolean => {
  return getLuminance(hex) > 0.5;
};

/**
 * Get contrast color (black or white) for text
 */
export const getContrastColor = (hex: string): string => {
  return isLightColor(hex) ? '#000000' : '#FFFFFF';
};

/**
 * Generate color palette from a base color
 */
export interface ColorPalette {
  main: string;
  light: string;
  dark: string;
  contrast: string;
}

export const generateColorPalette = (baseColor: string): ColorPalette => {
  const color = baseColor || '#3b82f6';
  return {
    main: color,
    light: lightenColor(color, 15),
    dark: darkenColor(color, 15),
    contrast: getContrastColor(color),
  };
};

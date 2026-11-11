import React from 'react';
import { StyleSheet, View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  outlined?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  outlined = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getVariantColors = () => {
    const variantColors = {
      default: { bg: colors.neutral[200], text: colors.neutral[700] },
      success: { bg: colors.success.light, text: colors.success.dark },
      warning: { bg: colors.warning.light, text: colors.warning.dark },
      error: { bg: colors.error.light, text: colors.error.dark },
      info: { bg: colors.info.light, text: colors.info.dark },
      primary: { bg: colors.primary.light, text: colors.primary.dark },
      secondary: { bg: colors.secondary.light, text: colors.secondary.dark },
    };
    return variantColors[variant];
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5] },
          text: { fontSize: 10 },
        };
      case 'large':
        return {
          container: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
          text: { fontSize: 14 },
        };
      default:
        return {
          container: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
          text: { fontSize: 12 },
        };
    }
  };

  const variantColors = getVariantColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        sizeStyles.container,
        outlined
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: variantColors.text }
          : { backgroundColor: variantColors.bg },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          { color: variantColors.text },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});

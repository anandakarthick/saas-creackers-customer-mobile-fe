import React from 'react';
import { StyleSheet, ViewStyle, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'elevated',
  padding = 'medium',
  style,
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.surface.default,
          borderWidth: 1,
          borderColor: colors.border.default,
        };
      case 'filled':
        return {
          backgroundColor: colors.surface.variant,
        };
      default:
        return {
          backgroundColor: colors.surface.default,
          ...shadows.md,
        };
    }
  };

  const getPaddingStyles = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: spacing[3] };
      case 'large':
        return { padding: spacing[5] };
      default:
        return { padding: spacing[4] };
    }
  };

  const cardStyles = [
    styles.card,
    getVariantStyles(),
    getPaddingStyles(),
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

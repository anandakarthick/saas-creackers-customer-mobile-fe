import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  labelStyle,
}) => {
  const { colors } = useTheme();

  const getButtonColor = () => {
    const colorMap = {
      primary: colors.primary.main,
      secondary: colors.secondary.main,
      error: colors.error.main,
      success: colors.success.main,
      warning: colors.warning.main,
    };
    return colorMap[color];
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { height: 36, paddingHorizontal: spacing[3] };
      case 'large':
        return { height: 52, paddingHorizontal: spacing[6] };
      default:
        return { height: 44, paddingHorizontal: spacing[4] };
    }
  };

  const getLabelSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  const buttonColor = getButtonColor();
  const sizeStyles = getSizeStyles();

  return (
    <PaperButton
      mode={variant === 'contained' ? 'contained' : variant === 'outlined' ? 'outlined' : 'text'}
      onPress={onPress}
      disabled={disabled || loading}
      icon={loading ? undefined : icon}
      buttonColor={variant === 'contained' ? buttonColor : undefined}
      textColor={variant === 'contained' ? colors.neutral[0] : buttonColor}
      style={[
        styles.button,
        sizeStyles,
        fullWidth && styles.fullWidth,
        variant === 'outlined' && { borderColor: buttonColor },
        style,
      ]}
      labelStyle={[
        styles.label,
        { fontSize: getLabelSize() },
        labelStyle,
      ]}
      contentStyle={[styles.content, sizeStyles]}
    >
      {loading ? <ActivityIndicator size="small" color={variant === 'contained' ? colors.neutral[0] : buttonColor} /> : children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    textTransform: 'none',
  },
});

import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

interface SafeAreaFABProps {
  icon: string;
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export const SafeAreaFAB: React.FC<SafeAreaFABProps> = ({
  style,
  icon,
  onPress,
  label,
  color,
  ...props
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const fabProps = {
    icon,
    onPress,
    ...props,
    style: [
      styles.fab,
      { bottom: spacing[4] + insets.bottom, backgroundColor: colors.primary.main },
      style,
    ],
    color: color ?? colors.neutral[0],
    ...(label ? { label } : {}),
  };

  return <FAB {...fabProps} />;
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing[4],
  },
});

import React from 'react';
import { StyleSheet, View, Text, Modal } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface.default }]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          {message && <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: spacing[4],
    fontSize: 14,
  },
});

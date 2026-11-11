import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { Button } from '@/components/common';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { colors } = useTheme();

  const getVariantColor = () => {
    switch (variant) {
      case 'danger':
        return colors.error.main;
      case 'warning':
        return colors.warning.main;
      default:
        return colors.primary.main;
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case 'danger':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      default:
        return 'help-circle';
    }
  };

  const variantColor = getVariantColor();
  const iconName = icon || getDefaultIcon();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.dialog, { backgroundColor: colors.surface.default }]}>
          <View style={[styles.iconContainer, { backgroundColor: variantColor + '20' }]}>
            <Icon name={iconName} size={32} color={variantColor} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
          <View style={styles.actions}>
            <Button
              variant="outlined"
              onPress={onCancel}
              style={styles.button}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              color={variant === 'danger' ? 'error' : variant === 'warning' ? 'warning' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  dialog: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing[3],
  },
  button: {
    flex: 1,
  },
});

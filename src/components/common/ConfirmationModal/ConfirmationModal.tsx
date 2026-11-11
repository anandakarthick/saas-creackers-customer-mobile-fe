import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'alert-circle-outline',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { colors } = useTheme();

  const iconColor = confirmVariant === 'danger' ? colors.error.main : colors.primary.main;
  const confirmButtonColor = confirmVariant === 'danger' ? colors.error.main : colors.primary.main;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.container, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <Icon name={icon} size={32} color={iconColor} />
            </View>

            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onCancel}
                style={[styles.cancelButton, { borderColor: colors.border.default }]}
                labelStyle={{ color: colors.text.primary }}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                mode="contained"
                onPress={onConfirm}
                style={[styles.confirmButton, { backgroundColor: confirmButtonColor }]}
                labelStyle={{ color: colors.neutral[0] }}
                loading={loading}
                disabled={loading}
              >
                {confirmText}
              </Button>
            </View>
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
  container: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 18,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});

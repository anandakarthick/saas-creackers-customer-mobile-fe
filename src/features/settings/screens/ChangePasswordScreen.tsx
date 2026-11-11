import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<PasswordFormData>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordFormData) => settingsApi.changePassword(data),
    onSuccess: () => {
      Alert.alert('Success', 'Password changed successfully');
      reset();
      navigation.goBack();
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.message || 'Failed to change password'),
  });

  const onSubmit = async (data: PasswordFormData) => {
    if (!data.currentPassword) {
      Alert.alert('Validation', 'Current password is required');
      return;
    }
    if (!data.newPassword || data.newPassword.length < 8) {
      Alert.alert('Validation', 'New password must be at least 8 characters');
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try { await mutation.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Change Password" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Update Password
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.text.secondary }]}>
              Choose a strong password with at least 8 characters.
            </Text>

            <FormInput
              name="currentPassword"
              control={control}
              label="Current Password *"
              placeholder="Enter current password"
              secureTextEntry
              leftIcon="lock-outline"
            />

            <FormInput
              name="newPassword"
              control={control}
              label="New Password *"
              placeholder="Enter new password"
              secureTextEntry
              leftIcon="lock-plus-outline"
            />

            <FormInput
              name="confirmPassword"
              control={control}
              label="Confirm New Password *"
              placeholder="Confirm new password"
              secureTextEntry
              leftIcon="lock-check-outline"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              labelStyle={{ color: colors.text.primary }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Update Password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: spacing[4],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});

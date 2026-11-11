import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore } from '@/store';
import { settingsApi } from '@/services/api';
import type { SettingsStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'ProfileEdit'>;

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
}

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: settingsApi.getProfile,
  });

  const { control, handleSubmit, reset } = useForm<ProfileFormData>({
    defaultValues: { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    const src = profile || currentUser;
    if (src) {
      reset({
        name: src.name || '',
        email: src.email || '',
        phone: src.phone || '',
      });
    }
  }, [profile, currentUser, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      settingsApi.updateProfile({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
      }),
    onSuccess: (updated: any) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      if (currentUser) {
        setUser({
          ...currentUser,
          name: updated.name ?? currentUser.name,
          email: updated.email ?? currentUser.email,
          phone: updated.phone ?? currentUser.phone,
        });
      }
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update profile'),
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (!data.email.trim()) { Alert.alert('Validation', 'Email is required'); return; }
    setIsSubmitting(true);
    try { await mutation.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Edit Profile" showBack />

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
              Personal Information
            </Text>

            <FormInput
              name="name"
              control={control}
              label="Full Name *"
              placeholder="Enter your name"
              leftIcon="account-outline"
            />

            <FormInput
              name="email"
              control={control}
              label="Email *"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="email-outline"
            />

            <FormInput
              name="phone"
              control={control}
              label="Phone Number"
              placeholder="+1234567890"
              keyboardType="phone-pad"
              leftIcon="phone-outline"
            />
          </View>

          {/* Read-only info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Account Info</Text>
            <View style={[styles.readOnlyRow, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.readOnlyLabel, { color: colors.text.secondary }]}>Role</Text>
              <Text style={[styles.readOnlyValue, { color: colors.text.primary }]}>
                {currentUser?.role?.name || '—'}
              </Text>
            </View>
            <View style={[styles.readOnlyRow, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.readOnlyLabel, { color: colors.text.secondary }]}>
                Member Since
              </Text>
              <Text style={[styles.readOnlyValue, { color: colors.text.primary }]}>
                {currentUser?.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString()
                  : '—'}
              </Text>
            </View>
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
              Save Changes
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
    marginBottom: spacing[4],
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  readOnlyLabel: {
    fontSize: 14,
  },
  readOnlyValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});

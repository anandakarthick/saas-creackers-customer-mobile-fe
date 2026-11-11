import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface EmailFormData {
  fromEmail: string;
  fromName: string;
  replyTo: string;
  emailEnabled: boolean;
}

export const EmailSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const { control, handleSubmit, reset } = useForm<EmailFormData>({
    defaultValues: {
      fromEmail: '',
      fromName: '',
      replyTo: '',
      emailEnabled: false,
    },
  });

  useEffect(() => {
    if (settings?.emailConfig) {
      reset({
        fromEmail: settings.emailConfig.fromEmail || '',
        fromName: settings.emailConfig.fromName || '',
        replyTo: settings.emailConfig.replyTo || '',
        emailEnabled: settings.emailConfig.emailEnabled ?? false,
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EmailFormData) =>
      settingsApi.updateSettings({
        ...settings,
        emailConfig: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Email settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update email settings'),
  });

  const onSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Email Settings" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Email Settings" showBack />

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
              Email Configuration
            </Text>

            <FormSwitch
              name="emailEnabled"
              control={control}
              label="Enable Email"
              description="Send emails for orders, notifications, etc."
            />

            <FormInput
              name="fromEmail"
              control={control}
              label="From Email"
              placeholder="noreply@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="email-outline"
            />

            <FormInput
              name="fromName"
              control={control}
              label="From Name"
              placeholder="Your Store Name"
              leftIcon="account-outline"
            />

            <FormInput
              name="replyTo"
              control={control}
              label="Reply-To Email"
              placeholder="support@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="email-sync-outline"
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
              Save Settings
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});

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
import { FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface NotificationFormData {
  emailNotifs: boolean;
  soundNotifs: boolean;
  popupNotifs: boolean;
  orderNotifs: boolean;
  lowStockAlerts: boolean;
}

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const { control, handleSubmit, reset } = useForm<NotificationFormData>({
    defaultValues: {
      emailNotifs: false,
      soundNotifs: false,
      popupNotifs: false,
      orderNotifs: false,
      lowStockAlerts: false,
    },
  });

  useEffect(() => {
    if (settings?.notifications) {
      const n = settings.notifications;
      reset({
        emailNotifs: n.emailNotifs ?? false,
        soundNotifs: n.soundNotifs ?? false,
        popupNotifs: n.popupNotifs ?? false,
        orderNotifs: n.orderNotifs ?? false,
        lowStockAlerts: n.lowStockAlerts ?? false,
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: NotificationFormData) =>
      settingsApi.updateSettings({
        ...settings,
        notifications: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Notification settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update notification settings'),
  });

  const onSubmit = async (data: NotificationFormData) => {
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
        <Header title="Notifications" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Notifications" showBack />

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
              Notification Preferences
            </Text>

            <FormSwitch
              name="emailNotifs"
              control={control}
              label="Email Notifications"
              description="Receive order and update emails"
            />

            <FormSwitch
              name="soundNotifs"
              control={control}
              label="Sound on New Orders"
              description="Play a sound when a new order arrives"
            />

            <FormSwitch
              name="popupNotifs"
              control={control}
              label="Popup Notifications"
              description="Show popup alerts for important events"
            />

            <FormSwitch
              name="orderNotifs"
              control={control}
              label="Order Notifications"
              description="Get notified for new and updated orders"
            />

            <FormSwitch
              name="lowStockAlerts"
              control={control}
              label="Low Stock Alerts"
              description="Alert when product stock runs low"
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

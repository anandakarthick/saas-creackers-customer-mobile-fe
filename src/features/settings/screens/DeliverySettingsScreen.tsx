import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface DeliveryFormData {
  enabled: boolean;
  deliveryCharge: string;
  timeEstimate: string;
  freeDeliveryEnabled: boolean;
  freeDeliveryAbove: string;
  description: string;
  minOrderEnabled: boolean;
  minOrderAmount: string;
  minOrderMessage: string;
}

export const DeliverySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const { control, handleSubmit, reset } = useForm<DeliveryFormData>({
    defaultValues: {
      enabled: false,
      deliveryCharge: '',
      timeEstimate: '',
      freeDeliveryEnabled: false,
      freeDeliveryAbove: '',
      description: '',
      minOrderEnabled: false,
      minOrderAmount: '',
      minOrderMessage: '',
    },
  });

  const freeDeliveryEnabled = useWatch({ control, name: 'freeDeliveryEnabled' });
  const minOrderEnabled = useWatch({ control, name: 'minOrderEnabled' });

  useEffect(() => {
    if (settings?.delivery) {
      const d = settings.delivery;
      reset({
        enabled: d.enabled ?? false,
        deliveryCharge: d.deliveryCharge?.toString() || '',
        timeEstimate: d.timeEstimate || '',
        freeDeliveryEnabled: d.freeDeliveryEnabled ?? false,
        freeDeliveryAbove: d.freeDeliveryAbove?.toString() || '',
        description: d.description || '',
        minOrderEnabled: d.minOrderEnabled ?? false,
        minOrderAmount: d.minOrderAmount?.toString() || '',
        minOrderMessage: d.minOrderMessage || '',
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: DeliveryFormData) =>
      settingsApi.updateSettings({
        ...settings,
        delivery: {
          enabled: data.enabled,
          deliveryCharge: data.deliveryCharge ? Number(data.deliveryCharge) : 0,
          timeEstimate: data.timeEstimate,
          freeDeliveryEnabled: data.freeDeliveryEnabled,
          freeDeliveryAbove: data.freeDeliveryAbove ? Number(data.freeDeliveryAbove) : 0,
          description: data.description,
          minOrderEnabled: data.minOrderEnabled,
          minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : 0,
          minOrderMessage: data.minOrderMessage,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Delivery settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update delivery settings'),
  });

  const onSubmit = async (data: DeliveryFormData) => {
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
        <Header title="Delivery Settings" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Delivery Settings" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* General */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Delivery
            </Text>

            <FormSwitch
              name="enabled"
              control={control}
              label="Enable Delivery"
              description="Allow customers to choose delivery"
            />

            <FormInput
              name="deliveryCharge"
              control={control}
              label="Delivery Charge"
              placeholder="0"
              keyboardType="numeric"
              leftIcon="currency-inr"
            />

            <FormInput
              name="timeEstimate"
              control={control}
              label="Estimated Delivery Time"
              placeholder="e.g. 30-45 mins"
              leftIcon="clock-outline"
            />

            <FormInput
              name="description"
              control={control}
              label="Description"
              placeholder="Delivery terms and info"
              multiline
              numberOfLines={3}
              leftIcon="text-box-outline"
            />
          </View>

          {/* Free Delivery */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Free Delivery
            </Text>

            <FormSwitch
              name="freeDeliveryEnabled"
              control={control}
              label="Enable Free Delivery"
              description="Waive delivery charge above a certain amount"
            />

            {freeDeliveryEnabled && (
              <FormInput
                name="freeDeliveryAbove"
                control={control}
                label="Free Delivery Above"
                placeholder="0"
                keyboardType="numeric"
                leftIcon="currency-inr"
              />
            )}
          </View>

          {/* Minimum Order */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Minimum Order
            </Text>

            <FormSwitch
              name="minOrderEnabled"
              control={control}
              label="Enable Minimum Order"
              description="Require a minimum order amount for delivery"
            />

            {minOrderEnabled && (
              <>
                <FormInput
                  name="minOrderAmount"
                  control={control}
                  label="Minimum Order Amount"
                  placeholder="0"
                  keyboardType="numeric"
                  leftIcon="currency-inr"
                />

                <FormInput
                  name="minOrderMessage"
                  control={control}
                  label="Message Below Minimum"
                  placeholder="e.g. Minimum order is ₹500"
                  leftIcon="message-alert-outline"
                />
              </>
            )}
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

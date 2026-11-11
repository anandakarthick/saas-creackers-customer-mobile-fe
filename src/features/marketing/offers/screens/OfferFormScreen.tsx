import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import type { OffersStackParamList } from '@/types/navigation';

interface OfferFormData {
  name: string;
  description: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

type NavigationProp = NativeStackNavigationProp<OffersStackParamList, 'OfferForm'>;
type RouteProps = RouteProp<OffersStackParamList, 'OfferForm'>;

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'Percentage (%)', value: 'PERCENTAGE' },
  { label: 'Fixed Amount', value: 'FIXED' },
];

export const OfferFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const offerId = route.params?.id;
  const isEdit = !!offerId;

  const { data: existingOffer } = useQuery({
    queryKey: ['offer', offerId],
    queryFn: () => marketingApi.getOffer(offerId!),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm<OfferFormData>({
    defaultValues: {
      name: '',
      description: '',
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      usageLimit: '',
      perUserLimit: '',
      isActive: true,
      startsAt: '',
      expiresAt: '',
    },
  });

  const discountType = watch('discountType');

  useEffect(() => {
    if (existingOffer) {
      reset({
        name: existingOffer.name || '',
        description: existingOffer.description || '',
        code: existingOffer.code || '',
        discountType: existingOffer.discountType || 'PERCENTAGE',
        discountValue: String(existingOffer.discountValue ?? ''),
        minOrderAmount: existingOffer.minOrderAmount ? String(existingOffer.minOrderAmount) : '',
        maxDiscount: existingOffer.maxDiscount ? String(existingOffer.maxDiscount) : '',
        usageLimit: existingOffer.usageLimit ? String(existingOffer.usageLimit) : '',
        perUserLimit: existingOffer.perUserLimit ? String(existingOffer.perUserLimit) : '',
        isActive: existingOffer.isActive ?? true,
        startsAt: existingOffer.startsAt ? existingOffer.startsAt.split('T')[0] : '',
        expiresAt: existingOffer.expiresAt ? existingOffer.expiresAt.split('T')[0] : '',
      });
    }
  }, [existingOffer, reset]);

  const mutation = useMutation({
    mutationFn: async (data: OfferFormData) => {
      const payload: any = {
        name: data.name.trim() || undefined,
        description: data.description.trim() || undefined,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        isActive: data.isActive,
      };

      if (!isEdit) {
        payload.code = data.code.trim().toUpperCase();
      }

      const minOrder = parseFloat(data.minOrderAmount);
      if (!isNaN(minOrder) && minOrder >= 0) payload.minOrderAmount = minOrder;

      const maxDisc = parseFloat(data.maxDiscount);
      if (!isNaN(maxDisc) && maxDisc >= 0) payload.maxDiscount = maxDisc;

      const usage = parseInt(data.usageLimit, 10);
      if (!isNaN(usage) && usage >= 0) payload.usageLimit = usage;

      const perUser = parseInt(data.perUserLimit, 10);
      if (!isNaN(perUser) && perUser >= 0) payload.perUserLimit = perUser;

      if (data.startsAt) payload.startsAt = data.startsAt;
      if (data.expiresAt) payload.expiresAt = data.expiresAt;

      if (isEdit) {
        return marketingApi.updateOffer(offerId!, payload);
      }
      return marketingApi.createOffer(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['coupons'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save offer'),
  });

  const onSubmit = async (data: OfferFormData) => {
    if (!isEdit && !data.code.trim()) {
      Alert.alert('Validation', 'Coupon code is required');
      return;
    }
    const dv = parseFloat(data.discountValue);
    if (isNaN(dv) || dv <= 0) {
      Alert.alert('Validation', 'Discount value must be greater than 0');
      return;
    }
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Offer' : 'Create Offer'} showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Basic Information
            </Text>

            <FormInput
              name="name"
              control={control}
              label="Offer Name"
              placeholder="Enter offer name"
            />

            <FormInput
              name="description"
              control={control}
              label="Description"
              placeholder="Enter offer description"
              multiline
              numberOfLines={3}
            />

            <FormInput
              name="code"
              control={control}
              label={isEdit ? 'Coupon Code (read-only)' : 'Coupon Code *'}
              placeholder="e.g., SAVE20"
              autoCapitalize="characters"
              editable={!isEdit}
            />

            <FormSwitch
              name="isActive"
              control={control}
              label="Active"
              description="Offer will be available for customers"
            />
          </View>

          {/* Discount Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Discount Settings
            </Text>

            <FormSelect
              name="discountType"
              control={control}
              label="Discount Type *"
              options={DISCOUNT_TYPE_OPTIONS}
              placeholder="Select discount type"
            />

            <FormInput
              name="discountValue"
              control={control}
              label={discountType === 'PERCENTAGE' ? 'Discount Percentage (%) *' : 'Discount Amount *'}
              placeholder={discountType === 'PERCENTAGE' ? 'e.g., 20' : 'e.g., 500'}
              keyboardType="decimal-pad"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="minOrderAmount"
                  control={control}
                  label="Min Order Amount"
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="maxDiscount"
                  control={control}
                  label="Max Discount"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  disabled={discountType === 'FIXED'}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="usageLimit"
                  control={control}
                  label="Usage Limit"
                  placeholder="0 = Unlimited"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="perUserLimit"
                  control={control}
                  label="Per User Limit"
                  placeholder="0 = Unlimited"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Validity Period */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Validity Period
            </Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="startsAt"
                  control={control}
                  label="Start Date"
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="expiresAt"
                  control={control}
                  label="Expiry Date"
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </View>

          {/* Submit Buttons */}
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
              {isEdit ? 'Update Offer' : 'Create Offer'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
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
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfField: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

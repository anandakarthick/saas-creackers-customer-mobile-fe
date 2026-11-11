import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import type { OffersStackParamList } from '@/types/navigation';

interface OfferFormData {
  title: string;
  description: string;
  code: string;
  offerType: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  usageLimit: number;
  applicableTo: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

type NavigationProp = NativeStackNavigationProp<OffersStackParamList, 'OfferForm'>;
type RouteProps = RouteProp<OffersStackParamList, 'OfferForm'>;

const OFFER_TYPE_OPTIONS = [
  { label: 'Percentage (All Products — Auto-applied)', value: 'PERCENTAGE' },
  { label: 'Fixed Amount (All Products — Auto-applied)', value: 'FIXED' },
  { label: 'Category Specific (Auto-applied)', value: 'CATEGORY' },
  { label: 'Product Specific (Auto-applied)', value: 'PRODUCT' },
  { label: 'Coupon Code (Customer enters at checkout)', value: 'COUPON' },
  { label: 'Flash Offer', value: 'FLASH' },
];

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'Percentage (%)', value: 'percentage' },
  { label: 'Fixed Amount (₹)', value: 'fixed' },
];

const APPLICABLE_OPTIONS = [
  { label: 'All Products', value: 'all' },
  { label: 'Specific Category', value: 'category' },
  { label: 'Specific Product', value: 'product' },
];

export const OfferFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['offer', id],
    queryFn: () => marketingApi.getOffer(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<OfferFormData>({
    defaultValues: {
      title: '',
      description: '',
      code: '',
      offerType: 'COUPON',
      discountType: 'percentage',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscount: 0,
      usageLimit: 0,
      applicableTo: 'all',
      startDate: '',
      endDate: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      const dtype = String(existing.discountType || 'PERCENTAGE').toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
      reset({
        title: existing.name || existing.title || '',
        description: existing.description || '',
        code: existing.code || '',
        offerType: existing.offerType || 'COUPON',
        discountType: dtype,
        discountValue: Number(existing.discountValue || 0),
        minOrderValue: Number(existing.minOrderAmount || existing.minOrderValue || 0),
        maxDiscount: Number(existing.maxDiscount || 0),
        usageLimit: Number(existing.usageLimit || 0),
        applicableTo: existing.offerType ? String(existing.offerType).toLowerCase() : 'all',
        startDate: existing.startsAt ? String(existing.startsAt).slice(0, 10) : '',
        endDate: existing.expiresAt ? String(existing.expiresAt).slice(0, 10) : '',
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: OfferFormData) => {
      const payload: any = {
        name: data.title.trim(),
        description: data.description || undefined,
        code: data.code.trim().toUpperCase(),
        offerType: data.offerType || 'COUPON',
        discountType: data.discountType === 'fixed' ? 'FIXED' : 'PERCENTAGE',
        discountValue: Number(data.discountValue) || 0,
        minOrderAmount: Number(data.minOrderValue) || 0,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : undefined,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
        startsAt: data.startDate || undefined,
        expiresAt: data.endDate || undefined,
        isActive: data.isActive,
      };
      return isEdit
        ? marketingApi.updateOffer(id as any, payload)
        : marketingApi.createOffer(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['offer', id] });
      qc.invalidateQueries({ queryKey: ['offers'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save offer'),
  });

  const onSubmit = async (data: OfferFormData) => {
    if (!data.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    // Code is required only for FLASH and COUPON types; auto-generated for others
    if (['FLASH', 'COUPON'].includes(data.offerType) && !data.code.trim()) {
      Alert.alert('Validation', 'Coupon code is required for this offer type'); return;
    }
    const dv = Number(data.discountValue);
    if (!dv || dv <= 0) {
      Alert.alert('Validation', 'Discount value must be greater than 0'); return;
    }
    // Percentage cannot exceed 100%
    const effDiscType = ['PERCENTAGE'].includes(data.offerType) ? 'percentage' : data.discountType;
    if (effDiscType === 'percentage' && dv > 100) {
      Alert.alert('Validation', 'Percentage discount cannot exceed 100%'); return;
    }
    // End date cannot be before start date
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      Alert.alert('Validation', 'End date cannot be before start date'); return;
    }
    // Numeric fields cannot be negative
    if (Number(data.minOrderValue) < 0) {
      Alert.alert('Validation', 'Minimum order value cannot be negative'); return;
    }
    if (data.maxDiscount && Number(data.maxDiscount) < 0) {
      Alert.alert('Validation', 'Maximum discount cannot be negative'); return;
    }
    if (data.usageLimit && Number(data.usageLimit) < 0) {
      Alert.alert('Validation', 'Usage limit cannot be negative'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Offer' : 'New Offer'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Offer Info" colors={colors}>
            <FormInput
              name="title"
              control={control}
              label="Offer Title *"
              placeholder="Diwali Sale"
            />
            <FormInput
              name="description"
              control={control}
              label="Description"
              multiline
              numberOfLines={2}
            />
            <FormInput
              name="code"
              control={control}
              label="Coupon Code *"
              autoCapitalize="characters"
              placeholder="SAVE20"
            />
            <FormSelect
              name="offerType"
              control={control}
              label="Offer Type *"
              options={OFFER_TYPE_OPTIONS}
            />
          </Section>

          <Section title="Discount" colors={colors}>
            <FormSelect
              name="discountType"
              control={control}
              label="Discount Type *"
              options={DISCOUNT_TYPE_OPTIONS}
            />
            <FormInput
              name="discountValue"
              control={control}
              label="Discount Value *"
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput
                  name="minOrderValue"
                  control={control}
                  label="Min Order Value (₹)"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <FormInput
                  name="maxDiscount"
                  control={control}
                  label="Max Discount (₹)"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Section>

          <Section title="Applicability" colors={colors}>
            <FormSelect
              name="applicableTo"
              control={control}
              label="Applies To"
              options={APPLICABLE_OPTIONS}
            />
            <FormInput
              name="usageLimit"
              control={control}
              label="Usage Limit"
              keyboardType="numeric"
              placeholder="0 for unlimited"
            />
          </Section>

          <Section title="Schedule" colors={colors}>
            <FormInput
              name="startDate"
              control={control}
              label="Start Date"
              placeholder="YYYY-MM-DD"
            />
            <FormInput
              name="endDate"
              control={control}
              label="End Date"
              placeholder="YYYY-MM-DD"
            />
            <FormSwitch name="isActive" control={control} label="Active" />
          </Section>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update' : 'Create Offer'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title,
  children,
  colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});

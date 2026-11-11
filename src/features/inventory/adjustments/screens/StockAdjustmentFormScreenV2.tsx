import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi, inventoryApi } from '@/services/api';
import type { StockAdjustmentsStackParamList } from '@/types/navigation';

interface AdjustmentFormData {
  productId: string;
  adjustmentType: 'add' | 'remove' | 'set';
  quantity: number;
  reason: string;
  notes: string;
}

type NavigationProp = NativeStackNavigationProp<
  StockAdjustmentsStackParamList,
  'StockAdjustmentForm'
>;
type RouteProps = RouteProp<StockAdjustmentsStackParamList, 'StockAdjustmentForm'>;

const TYPE_OPTIONS = [
  { label: 'Add Stock', value: 'add' },
  { label: 'Remove Stock', value: 'remove' },
  { label: 'Set Stock To', value: 'set' },
];

const REASON_OPTIONS = [
  { label: 'Damaged / Defective', value: 'damaged' },
  { label: 'Expired', value: 'expired' },
  { label: 'Lost / Stolen', value: 'lost' },
  { label: 'Stock Count Correction', value: 'count_correction' },
  { label: 'Returned from Customer', value: 'customer_return' },
  { label: 'Transfer In', value: 'transfer_in' },
  { label: 'Transfer Out', value: 'transfer_out' },
  { label: 'Other', value: 'other' },
];

export const StockAdjustmentFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const { control, handleSubmit } = useForm<AdjustmentFormData>({
    defaultValues: {
      productId: '',
      adjustmentType: 'add',
      quantity: 0,
      reason: 'count_correction',
      notes: '',
    },
  });

  const { data: productsRes } = useQuery<any>({
    queryKey: ['products', 'adjustment-picker'],
    queryFn: () => productsApi.getProducts({ page: 1, limit: 500 }),
  });
  const products: any[] = productsRes?.data || [];

  const productOptions = products.map((p: any) => ({
    label: `${p.name} (Stock: ${p.quantity ?? 0})`,
    value: String(p.id),
  }));

  const submit = useMutation({
    mutationFn: (data: AdjustmentFormData) => {
      const prod = products.find((p: any) => String(p.id) === data.productId);
      const current = Number(prod?.quantity || 0);
      const qty = Math.abs(Number(data.quantity) || 0);

      // Backend expects a signed quantity delta
      let delta = 0;
      if (data.adjustmentType === 'add') delta = qty;
      else if (data.adjustmentType === 'remove') delta = -qty;
      else if (data.adjustmentType === 'set') delta = qty - current;

      const payload = {
        productId: Number(data.productId),
        quantity: delta,
        type: 'ADJUSTMENT',
        reason: data.reason,
        notes: data.notes || undefined,
      };
      return inventoryApi.createStockAdjustment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustmentLogs'] });
      qc.invalidateQueries({ queryKey: ['inventoryLogs'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save adjustment'),
  });

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!data.productId) { Alert.alert('Validation', 'Select a product'); return; }
    if (!data.quantity || Number(data.quantity) === 0) {
      Alert.alert('Validation', 'Enter a quantity'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Stock Adjustment" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Product" colors={colors}>
            <FormSelect
              name="productId"
              control={control}
              label="Product *"
              options={productOptions}
              placeholder="Select product"
            />
          </Section>

          <Section title="Adjustment" colors={colors}>
            <FormSelect
              name="adjustmentType"
              control={control}
              label="Type *"
              options={TYPE_OPTIONS}
            />
            <FormInput
              name="quantity"
              control={control}
              label="Quantity *"
              keyboardType="numeric"
              placeholder="0"
            />
            <FormSelect
              name="reason"
              control={control}
              label="Reason *"
              options={REASON_OPTIONS}
            />
            <FormInput
              name="notes"
              control={control}
              label="Notes"
              multiline
              numberOfLines={3}
              placeholder="Extra details about this adjustment"
            />
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
              Save Adjustment
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
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});

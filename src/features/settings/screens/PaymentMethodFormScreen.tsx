import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { FormInput, FormSelect, FormSwitch } from '@/components/forms';
import { spacing, borderRadius } from '@/theme/spacing';
import { useTheme } from '@/theme';
import { paymentMethodsApi } from '@/services/api';
import type { SettingsStackParamList } from '@/types/navigation';

type RouteProps = RouteProp<SettingsStackParamList, 'PaymentMethodForm'>;

interface FormData {
  type: string;
  displayName: string;
  description: string;
  upiId: string;
  gpayNumber: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  razorpayKeyId: string;
  razorpaySecret: string;
  fixedCharge: string;
  percentCharge: string;
  minAmount: string;
  maxAmount: string;
  isActive: boolean;
}

const typeOptions = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
  { label: 'Bank Transfer', value: 'BANK' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Razorpay', value: 'RAZORPAY' },
  { label: 'Cash on Delivery', value: 'COD' },
];

export const PaymentMethodFormScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;

  const { data: existing } = useQuery({
    queryKey: ['payment-method', id],
    queryFn: () => paymentMethodsApi.getPaymentMethod(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      type: 'UPI', displayName: '', description: '',
      upiId: '', gpayNumber: '',
      bankName: '', accountHolder: '', accountNumber: '', ifscCode: '', branchName: '',
      razorpayKeyId: '', razorpaySecret: '',
      fixedCharge: '0', percentCharge: '0',
      minAmount: '0', maxAmount: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        type: existing.type || 'UPI',
        displayName: existing.displayName || '',
        description: existing.description || '',
        upiId: existing.upiId || '',
        gpayNumber: existing.gpayNumber || '',
        bankName: existing.bankName || '',
        accountHolder: existing.accountHolder || '',
        accountNumber: existing.accountNumber || '',
        ifscCode: existing.ifscCode || '',
        branchName: existing.branchName || '',
        razorpayKeyId: existing.razorpayKeyId || '',
        razorpaySecret: '',
        fixedCharge: String(existing.fixedCharge ?? 0),
        percentCharge: String(existing.percentCharge ?? 0),
        minAmount: String(existing.minAmount ?? 0),
        maxAmount: existing.maxAmount != null ? String(existing.maxAmount) : '',
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const currentType = watch('type');

  const submit = useMutation({
    mutationFn: (data: FormData) => {
      const payload: any = {
        type: data.type,
        displayName: data.displayName.trim(),
        description: data.description || undefined,
        isActive: data.isActive,
        fixedCharge: Number(data.fixedCharge) || 0,
        percentCharge: Number(data.percentCharge) || 0,
        minAmount: Number(data.minAmount) || 0,
        maxAmount: data.maxAmount ? Number(data.maxAmount) : null,
      };
      if (data.type === 'UPI') {
        payload.upiId = data.upiId || undefined;
      }
      if (data.type === 'BANK') {
        payload.bankName = data.bankName || undefined;
        payload.accountHolder = data.accountHolder || undefined;
        payload.accountNumber = data.accountNumber || undefined;
        payload.ifscCode = data.ifscCode || undefined;
        payload.branchName = data.branchName || undefined;
      }
      if (data.type === 'RAZORPAY') {
        payload.razorpayKeyId = data.razorpayKeyId || undefined;
        if (data.razorpaySecret) payload.razorpaySecret = data.razorpaySecret;
      }
      return isEdit
        ? paymentMethodsApi.updatePaymentMethod(id as any, payload)
        : paymentMethodsApi.createPaymentMethod(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: FormData) => {
    if (!data.displayName.trim()) { Alert.alert('Validation', 'Display name is required'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Payment Method' : 'New Payment Method'} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}>
          <Section title="Basic Info">
            <FormSelect name="type" control={control} label="Type *" options={typeOptions} />
            <FormInput name="displayName" control={control} label="Display Name *" placeholder="e.g. PhonePe UPI" />
            <FormInput name="description" control={control} label="Description" multiline />
          </Section>

          {currentType === 'UPI' && (
            <Section title="UPI Details">
              <FormInput name="upiId" control={control} label="UPI ID" placeholder="yourname@upi" />
            </Section>
          )}

          {currentType === 'BANK' && (
            <Section title="Bank Details">
              <FormInput name="bankName" control={control} label="Bank Name" />
              <FormInput name="accountHolder" control={control} label="Account Holder" />
              <FormInput name="accountNumber" control={control} label="Account Number" />
              <FormInput name="ifscCode" control={control} label="IFSC Code" />
              <FormInput name="branchName" control={control} label="Branch" />
            </Section>
          )}

          {currentType === 'RAZORPAY' && (
            <Section title="Razorpay Credentials">
              <FormInput name="razorpayKeyId" control={control} label="Key ID" />
              <FormInput name="razorpaySecret" control={control} label="Secret Key" placeholder={isEdit ? 'Leave blank to keep unchanged' : ''} />
            </Section>
          )}

          <Section title="Charges & Limits">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormInput name="fixedCharge" control={control} label="Fixed Fee (₹)" keyboardType="numeric" />
              </View>
              <View style={{ width: spacing[3] }} />
              <View style={{ flex: 1 }}>
                <FormInput name="percentCharge" control={control} label="Percent Fee (%)" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormInput name="minAmount" control={control} label="Min Amount" keyboardType="numeric" />
              </View>
              <View style={{ width: spacing[3] }} />
              <View style={{ flex: 1 }}>
                <FormInput name="maxAmount" control={control} label="Max Amount" keyboardType="numeric" />
              </View>
            </View>
          </Section>

          <Section title="Status">
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
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: { flexDirection: 'row' },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});

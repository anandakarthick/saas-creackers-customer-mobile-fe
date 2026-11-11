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
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { expensesApi } from '@/services/api';
import type { ExpensesStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<ExpensesStackParamList, 'ExpenseForm'>;
type RouteProps = RouteProp<ExpensesStackParamList, 'ExpenseForm'>;

interface ExpenseFormData {
  description: string;
  category: string;
  amount: string;
  taxAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: string;
  vendorName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  reference: string;
  notes: string;
}

const CATEGORIES = [
  { label: 'Rent', value: 'RENT' },
  { label: 'Utilities', value: 'UTILITIES' },
  { label: 'Salary', value: 'SALARY' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Logistics', value: 'LOGISTICS' },
  { label: 'Supplies', value: 'SUPPLIES' },
  { label: 'Travel', value: 'TRAVEL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Professional Fees', value: 'PROFESSIONAL_FEES' },
  { label: 'Tax', value: 'TAX' },
  { label: 'Miscellaneous', value: 'MISC' },
];

const PAYMENT_STATUS = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Pending', value: 'PENDING' },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
  { label: 'Cheque', value: 'CHEQUE' },
];

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title, children, colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

export const ExpenseFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['expense', id],
    queryFn: () => expensesApi.getExpense(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<ExpenseFormData>({
    defaultValues: {
      description: '', category: 'MISC', amount: '', taxAmount: '0',
      paymentMethod: 'CASH', paymentStatus: 'PENDING', paidAmount: '0',
      vendorName: '', invoiceNumber: '', date: '', dueDate: '',
      reference: '', notes: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        description: existing.description || '',
        category: existing.category || 'MISC',
        amount: String(existing.amount || ''),
        taxAmount: String(existing.taxAmount || '0'),
        paymentMethod: existing.paymentMethod || 'CASH',
        paymentStatus: existing.paymentStatus || 'PENDING',
        paidAmount: String(existing.paidAmount || '0'),
        vendorName: existing.vendorName || existing.supplierName || '',
        invoiceNumber: existing.invoiceNumber || '',
        date: existing.date || '',
        dueDate: existing.dueDate || '',
        reference: existing.reference || '',
        notes: existing.notes || '',
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      const payload: any = {
        description: data.description.trim(),
        category: data.category,
        amount: Number(data.amount) || 0,
        taxAmount: Number(data.taxAmount) || 0,
        paymentMethod: data.paymentMethod || undefined,
        paymentStatus: data.paymentStatus,
        paidAmount: Number(data.paidAmount) || 0,
        vendorName: data.vendorName.trim() || undefined,
        invoiceNumber: data.invoiceNumber.trim() || undefined,
        invoiceDate: data.date || undefined,
        dueDate: data.dueDate || undefined,
        reference: data.reference.trim() || undefined,
        notes: data.notes.trim() || undefined,
      };
      return isEdit
        ? expensesApi.updateExpense(id as any, payload)
        : expensesApi.createExpense(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['expense', id] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: ExpenseFormData) => {
    if (!data.description.trim()) { Alert.alert('Validation', 'Description is required'); return; }
    const amt = Number(data.amount);
    if (!amt || amt <= 0) { Alert.alert('Validation', 'Amount must be greater than 0'); return; }
    if ((data as any).taxAmount && Number((data as any).taxAmount) < 0) {
      Alert.alert('Validation', 'Tax amount cannot be negative'); return;
    }
    if (data.date && (data as any).dueDate && (data as any).dueDate < data.date) {
      Alert.alert('Validation', 'Due date cannot be before invoice date'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Expense' : 'New Expense'} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}>
          <Section title="Basic Info" colors={colors}>
            <FormInput name="description" control={control} label="Description *" />
            <FormSelect name="category" control={control} label="Category" options={CATEGORIES} />
            <FormInput name="date" control={control} label="Date" placeholder="YYYY-MM-DD" />
          </Section>

          <Section title="Amount" colors={colors}>
            <FormInput name="amount" control={control} label="Amount *" keyboardType="decimal-pad" />
            <FormInput name="taxAmount" control={control} label="Tax Amount" keyboardType="decimal-pad" />
          </Section>

          <Section title="Payment" colors={colors}>
            <FormSelect name="paymentStatus" control={control} label="Payment Status" options={PAYMENT_STATUS} />
            <FormSelect name="paymentMethod" control={control} label="Payment Method" options={PAYMENT_METHODS} />
            <FormInput name="paidAmount" control={control} label="Paid Amount" keyboardType="decimal-pad" />
            <FormInput name="dueDate" control={control} label="Due Date" placeholder="YYYY-MM-DD" />
          </Section>

          <Section title="Vendor" colors={colors}>
            <FormInput name="vendorName" control={control} label="Vendor Name" />
            <FormInput name="invoiceNumber" control={control} label="Invoice Number" />
            <FormInput name="reference" control={control} label="Reference" />
          </Section>

          <Section title="Notes" colors={colors}>
            <FormInput name="notes" control={control} label="Notes" multiline numberOfLines={3} />
          </Section>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
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

const styles = StyleSheet.create({
  scrollContent: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});

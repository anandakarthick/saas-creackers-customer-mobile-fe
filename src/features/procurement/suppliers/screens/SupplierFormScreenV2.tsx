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
import { suppliersApi } from '@/services/api';
import type { SuppliersStackParamList } from '@/types/navigation';

interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstNumber: string;
  paymentTerms: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isActive: boolean;
}

type NavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SupplierForm'>;
type RouteProps = RouteProp<SuppliersStackParamList, 'SupplierForm'>;

const PAYMENT_TERMS = [
  { label: 'Advance', value: 'Advance' },
  { label: 'Net 15', value: 'Net 15' },
  { label: 'Net 30', value: 'Net 30' },
  { label: 'Net 45', value: 'Net 45' },
  { label: 'Net 60', value: 'Net 60' },
];

export const SupplierFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getSupplier(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstNumber: '',
      paymentTerms: 'Net 30',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name || '',
        contactPerson: existing.contactPerson || '',
        email: existing.email || '',
        phone: existing.phone || '',
        gstNumber: existing.gstNumber || '',
        paymentTerms: existing.paymentTerms || 'Net 30',
        addressLine1: existing.addressLine1 || existing.address?.line1 || '',
        addressLine2: existing.addressLine2 || existing.address?.line2 || '',
        city: existing.city || existing.address?.city || '',
        state: existing.state || existing.address?.state || '',
        pincode: existing.pincode || existing.address?.pincode || '',
        country: existing.country || existing.address?.country || 'India',
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: SupplierFormData) => {
      const payload: any = {
        name: data.name.trim(),
        contactPerson: data.contactPerson || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        gstNumber: data.gstNumber || undefined,
        paymentTerms: data.paymentTerms || undefined,
        addressLine1: data.addressLine1 || undefined,
        addressLine2: data.addressLine2 || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        country: data.country || undefined,
        isActive: data.isActive,
      };
      return isEdit
        ? suppliersApi.updateSupplier(id as any, payload)
        : suppliersApi.createSupplier(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['supplier', id] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: SupplierFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Supplier name is required'); return; }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      Alert.alert('Validation', 'Please enter a valid email address'); return;
    }
    if (data.phone && !/^\+?[\d\s()-]{7,15}$/.test(data.phone)) {
      Alert.alert('Validation', 'Please enter a valid phone number'); return;
    }
    if (data.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z\d]$/.test(data.gstNumber.toUpperCase())) {
      Alert.alert('Validation', 'Please enter a valid GST number (e.g. 22AAAAA0000A1Z5)'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Supplier' : 'New Supplier'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Company" colors={colors}>
            <FormInput name="name" control={control} label="Supplier Name *" />
            <FormInput name="contactPerson" control={control} label="Contact Person *" />
            <FormInput
              name="phone"
              control={control}
              label="Phone *"
              keyboardType="phone-pad"
            />
            <FormInput
              name="email"
              control={control}
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormInput
              name="gstNumber"
              control={control}
              label="GST Number"
              autoCapitalize="characters"
            />
            <FormSelect
              name="paymentTerms"
              control={control}
              label="Payment Terms"
              options={PAYMENT_TERMS}
            />
          </Section>

          <Section title="Address" colors={colors}>
            <FormInput name="addressLine1" control={control} label="Address Line 1" />
            <FormInput name="addressLine2" control={control} label="Address Line 2" />
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput name="city" control={control} label="City" />
              </View>
              <View style={styles.half}>
                <FormInput name="state" control={control} label="State" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput
                  name="pincode"
                  control={control}
                  label="Pincode"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <FormInput name="country" control={control} label="Country" />
              </View>
            </View>
          </Section>

          <Section title="Status" colors={colors}>
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

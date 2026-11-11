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
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { customersApi } from '@/services/api';
import type { CustomersStackParamList } from '@/types/navigation';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  notes: string;
  isActive: boolean;
}

type NavigationProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomerForm'>;
type RouteProps = RouteProp<CustomersStackParamList, 'CustomerForm'>;

export const CustomerFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<CustomerFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      gstNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      notes: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      const name = existing.name
        || [existing.firstName, existing.lastName].filter(Boolean).join(' ').trim();
      reset({
        name,
        email: existing.email || '',
        phone: existing.phone || '',
        gstNumber: existing.gstNumber || '',
        addressLine1: existing.address?.line1 || existing.addressLine1 || '',
        addressLine2: existing.address?.line2 || existing.addressLine2 || '',
        city: existing.address?.city || existing.city || '',
        state: existing.address?.state || existing.state || '',
        pincode: existing.address?.pincode || existing.pincode || '',
        country: existing.address?.country || existing.country || 'India',
        notes: existing.notes || '',
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: CustomerFormData) => {
      const [firstName, ...rest] = data.name.trim().split(/\s+/);
      const lastName = rest.join(' ');
      const payload: any = {
        firstName: firstName || data.name,
        lastName: lastName || '',
        email: data.email || undefined,
        phone: data.phone || undefined,
        gstNumber: data.gstNumber || undefined,
        addressLine1: data.addressLine1 || undefined,
        addressLine2: data.addressLine2 || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        country: data.country || undefined,
        notes: data.notes || undefined,
        isActive: data.isActive,
      };
      return isEdit
        ? customersApi.updateCustomer(id as any, payload)
        : customersApi.createCustomer(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: CustomerFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (!data.phone.trim()) { Alert.alert('Validation', 'Phone is required'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Customer' : 'New Customer'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: spacing[8] + insets.bottom },
          ]}
        >
          <Section title="Basic Info" colors={colors}>
            <FormInput name="name" control={control} label="Full Name *" placeholder="John Doe" />
            <FormInput
              name="email"
              control={control}
              label="Email"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormInput
              name="phone"
              control={control}
              label="Phone *"
              placeholder="+91 9XXXXXXXXX"
              keyboardType="phone-pad"
            />
            <FormInput
              name="gstNumber"
              control={control}
              label="GST Number"
              placeholder="29ABCDE1234F1Z5"
              autoCapitalize="characters"
            />
          </Section>

          <Section title="Address" colors={colors}>
            <FormInput
              name="addressLine1"
              control={control}
              label="Address Line 1"
              placeholder="Street address"
            />
            <FormInput
              name="addressLine2"
              control={control}
              label="Address Line 2"
              placeholder="Apartment, suite, etc."
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput name="city" control={control} label="City" placeholder="City" />
              </View>
              <View style={styles.half}>
                <FormInput name="state" control={control} label="State" placeholder="State" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput
                  name="pincode"
                  control={control}
                  label="Pincode"
                  placeholder="600001"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <FormInput name="country" control={control} label="Country" placeholder="India" />
              </View>
            </View>
          </Section>

          <Section title="Other" colors={colors}>
            <FormInput
              name="notes"
              control={control}
              label="Notes"
              placeholder="Internal notes about this customer"
              multiline
              numberOfLines={3}
            />
            <FormSwitch
              name="isActive"
              control={control}
              label="Active"
              description="Customer can place orders"
            />
          </Section>

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update Customer' : 'Create Customer'}
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
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});

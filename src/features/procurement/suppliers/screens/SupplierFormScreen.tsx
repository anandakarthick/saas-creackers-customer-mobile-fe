import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button } from '@/components/common';
import { FormInput, FormSelect, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { suppliersApi } from '@/services/api';
import type { SuppliersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SupplierForm'>;
type RouteType = RouteProp<SuppliersStackParamList, 'SupplierForm'>;

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().min(1, 'Supplier code is required'),
  contactPerson: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  mobile: z.string().optional().default(''),
  gstNumber: z.string().optional().default(''),
  panNumber: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  pinCode: z.string().optional().default(''),
  creditLimit: z.string().optional().default('0'),
  creditDays: z.string().optional().default('0'),
  notes: z.string().optional().default(''),
  isActive: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const SupplierFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const isEditing = !!route.params?.id;

  const { data: existingSupplier } = useQuery({
    queryKey: ['supplier', route.params?.id],
    queryFn: () => suppliersApi.getSupplier(route.params.id!),
    enabled: isEditing,
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      contactPerson: '',
      companyName: '',
      email: '',
      phone: '',
      mobile: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      creditLimit: '0',
      creditDays: '0',
      notes: '',
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (existingSupplier) {
      reset({
        name: existingSupplier.name || '',
        code: existingSupplier.code || '',
        contactPerson: existingSupplier.contactPerson || '',
        companyName: existingSupplier.companyName || '',
        email: existingSupplier.email || '',
        phone: existingSupplier.phone || '',
        mobile: existingSupplier.mobile || '',
        gstNumber: existingSupplier.gstNumber || '',
        panNumber: existingSupplier.panNumber || '',
        address: existingSupplier.address || '',
        city: existingSupplier.city || '',
        state: existingSupplier.state || '',
        pinCode: existingSupplier.pinCode || '',
        creditLimit: String(existingSupplier.creditLimit || 0),
        creditDays: String(existingSupplier.creditDays || 0),
        notes: existingSupplier.notes || '',
        isActive: existingSupplier.isActive ?? true,
      });
    }
  }, [existingSupplier, reset]);

  const mutation = useMutation({
    mutationFn: (data: SupplierFormData) => {
      const payload: any = {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || undefined,
        companyName: data.companyName?.trim() || undefined,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        mobile: data.mobile?.trim() || undefined,
        gstNumber: data.gstNumber?.trim() || undefined,
        panNumber: data.panNumber?.trim() || undefined,
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        pinCode: data.pinCode?.trim() || undefined,
        creditLimit: Number(data.creditLimit) || 0,
        creditDays: Number(data.creditDays) || 0,
        notes: data.notes?.trim() || undefined,
        isActive: data.isActive,
      };
      if (!isEditing) {
        payload.code = data.code.trim();
      }
      return isEditing
        ? suppliersApi.updateSupplier(route.params.id!, payload)
        : suppliersApi.createSupplier(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save supplier'),
  });

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={isEditing ? 'Edit Supplier' : 'Add Supplier'}
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Basic Information</Text>
          <FormInput
            name="name"
            control={control}
            label="Supplier Name *"
            placeholder="Enter supplier name"
          />
          {!isEditing && (
            <FormInput
              name="code"
              control={control}
              label="Supplier Code *"
              placeholder="e.g. SUP001"
              autoCapitalize="characters"
            />
          )}
          <FormInput
            name="contactPerson"
            control={control}
            label="Contact Person"
            placeholder="Enter contact person name"
          />
          <FormInput
            name="companyName"
            control={control}
            label="Company Name"
            placeholder="Enter company name"
          />
          <FormInput
            name="phone"
            control={control}
            label="Phone"
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <FormInput
            name="mobile"
            control={control}
            label="Mobile"
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <FormInput
            name="email"
            control={control}
            label="Email"
            placeholder="supplier@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        {/* Business Details */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Business Details</Text>
          <FormInput
            name="gstNumber"
            control={control}
            label="GST Number"
            placeholder="33AAAAA1111A1Z1"
            autoCapitalize="characters"
          />
          <FormInput
            name="panNumber"
            control={control}
            label="PAN Number"
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormInput
                name="creditLimit"
                control={control}
                label="Credit Limit"
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <FormInput
                name="creditDays"
                control={control}
                label="Credit Days"
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
        </Card>

        {/* Address */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Address</Text>
          <FormInput
            name="address"
            control={control}
            label="Address"
            placeholder="Street address"
            multiline
          />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormInput
                name="city"
                control={control}
                label="City"
                placeholder="City"
              />
            </View>
            <View style={styles.halfField}>
              <FormInput
                name="state"
                control={control}
                label="State"
                placeholder="State"
              />
            </View>
          </View>
          <FormInput
            name="pinCode"
            control={control}
            label="Pin Code"
            placeholder="626001"
            keyboardType="numeric"
          />
        </Card>

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional</Text>
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Optional notes"
            multiline
          />
          <FormSwitch
            name="isActive"
            control={control}
            label="Active Supplier"
            description="Inactive suppliers won't appear in selection lists"
          />
        </Card>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          style={styles.submitButton}
        >
          {isEditing ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfField: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing[2],
  },
});

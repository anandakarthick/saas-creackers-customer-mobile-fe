import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, useFormContext } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button } from '@/components/common';
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { customersApi } from '@/services/api';
import type { CustomersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomerForm'>;
type RouteType = RouteProp<CustomersStackParamList, 'CustomerForm'>;

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
}

export const CustomerFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const isEditing = !!route.params?.id;

  const { data: existingCustomer } = useQuery({
    queryKey: ['customer', route.params?.id],
    queryFn: () => customersApi.getCustomer(route.params.id!),
    enabled: isEditing,
  });

  const { control, handleSubmit, reset } = useForm<CustomerFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: '',
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (existingCustomer) {
      reset({
        firstName: existingCustomer.firstName || '',
        lastName: existingCustomer.lastName || '',
        email: existingCustomer.email || '',
        phone: existingCustomer.phone || '',
        notes: existingCustomer.notes || '',
        isActive: existingCustomer.isActive ?? true,
      });
    }
  }, [existingCustomer, reset]);

  const mutation = useMutation({
    mutationFn: (data: CustomerFormData) => {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || undefined,
        notes: data.notes.trim() || undefined,
        isActive: data.isActive,
      };
      return isEditing
        ? customersApi.updateCustomer(route.params.id!, payload)
        : customersApi.createCustomer(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save customer'),
  });

  const onSubmit = async (data: CustomerFormData) => {
    if (!data.firstName.trim()) { Alert.alert('Validation', 'First name is required'); return; }
    if (!data.lastName.trim()) { Alert.alert('Validation', 'Last name is required'); return; }
    if (!data.email.trim()) { Alert.alert('Validation', 'Email is required'); return; }
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
        title={isEditing ? 'Edit Customer' : 'Add Customer'}
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
          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormInput
                name="firstName"
                control={control}
                label="First Name"
                placeholder="First name"
              />
            </View>
            <View style={styles.halfField}>
              <FormInput
                name="lastName"
                control={control}
                label="Last Name"
                placeholder="Last name"
              />
            </View>
          </View>
          <FormInput
            name="phone"
            control={control}
            label="Phone Number"
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <FormInput
            name="email"
            control={control}
            label="Email Address"
            placeholder="customer@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Optional notes about this customer"
            multiline
          />
        </Card>

        {/* Status */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Status</Text>
          <FormSwitch
            name="isActive"
            control={control}
            label="Active Customer"
            description="Inactive customers won't appear in search results"
          />
        </Card>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          style={styles.submitButton}
        >
          {isEditing ? 'Update Customer' : 'Add Customer'}
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
